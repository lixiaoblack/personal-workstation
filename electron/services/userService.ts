/**
 * 用户服务 - 主进程
 * 处理用户认证、注册、信息更新等操作
 */
import { getDatabase } from "../database/index";
import bcrypt from "bcrypt";
import crypto from "crypto";

// 密码哈希轮数
const SALT_ROUNDS = 12;

// Token 过期时间（7天）
const TOKEN_EXPIRE_DAYS = 7;

// 用户信息接口
export interface User {
  id: number;
  username: string;
  nickname: string | null;
  avatar: string | null;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  gender: number;
  bio: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  settings: string | null;
}

// 登录凭证
export interface LoginCredentials {
  username: string;
  password: string;
  remember?: boolean;
}

// 注册数据
export interface RegisterData {
  username: string;
  password: string;
  nickname?: string;
}

// 登录结果
export interface LoginResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

// 更新资料数据
export interface UpdateProfileData {
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  birthday?: string;
  gender?: number;
  bio?: string;
}

// 更新密码数据
export interface UpdatePasswordData {
  oldPassword: string;
  newPassword: string;
}

// 重置密码数据
export interface ResetPasswordData {
  username: string;
  newPassword: string;
}

/**
 * 生成随机 Token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * 计算 Token 过期时间
 */
function calculateExpiry(): string {
  const date = new Date();
  date.setDate(date.getDate() + TOKEN_EXPIRE_DAYS);
  return date.toISOString();
}

/**
 * 清理过期会话
 */
export function cleanExpiredSessions(): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
}

/**
 * 检查系统是否已初始化（是否有用户）
 */
export function isInitialized(): boolean {
  const db = getDatabase();
  const result = db.prepare("SELECT COUNT(*) as count FROM users").get() as {
    count: number;
  };
  return result.count > 0;
}

/**
 * 检查用户名是否已存在
 */
export function checkUsernameExists(username: string): boolean {
  const db = getDatabase();
  const result = db
    .prepare("SELECT COUNT(*) as count FROM users WHERE username = ?")
    .get(username) as { count: number };
  return result.count > 0;
}

/**
 * 用户注册
 */
export function register(data: RegisterData): LoginResult {
  const db = getDatabase();

  // 检查用户名是否已存在
  if (checkUsernameExists(data.username)) {
    return { success: false, error: "用户名已存在" };
  }

  // 密码哈希
  const passwordHash = bcrypt.hashSync(data.password, SALT_ROUNDS);

  // 生成 Token
  const token = generateToken();
  const expiresAt = calculateExpiry();

  try {
    // 插入用户
    const result = db
      .prepare(
        `
      INSERT INTO users (username, password_hash, nickname)
      VALUES (?, ?, ?)
    `
      )
      .run(data.username, passwordHash, data.nickname || data.username);

    const userId = result.lastInsertRowid;

    // 创建会话
    db.prepare(
      `
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `
    ).run(userId, token, expiresAt);

    // 获取用户信息
    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(userId) as User;

    return {
      success: true,
      user,
      token,
    };
  } catch {
    return { success: false, error: "注册失败，请稍后重试" };
  }
}

/**
 * 用户登录
 */
export function login(credentials: LoginCredentials): LoginResult {
  const db = getDatabase();

  // 清理过期会话
  cleanExpiredSessions();

  // 查找用户
  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(credentials.username) as
    | (User & { password_hash: string })
    | undefined;

  if (!user) {
    return { success: false, error: "用户不存在" };
  }

  // 验证密码
  const isValid = bcrypt.compareSync(credentials.password, user.password_hash);

  if (!isValid) {
    return { success: false, error: "密码错误" };
  }

  // 生成 Token
  const token = generateToken();
  const expiresAt = calculateExpiry();

  // 创建会话
  db.prepare(
    `
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `
  ).run(user.id, token, expiresAt);

  // 更新最后登录时间
  db.prepare(
    `UPDATE users SET last_login_at = datetime('now', 'localtime') WHERE id = ?`
  ).run(user.id);

  // 返回用户信息（不含密码哈希）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash: _, ...userWithoutPassword } = user;

  return {
    success: true,
    user: userWithoutPassword as User,
    token,
  };
}

/**
 * 用户登出
 */
export function logout(token: string): boolean {
  const db = getDatabase();

  try {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证 Token
 */
export function validateToken(token: string): User | null {
  const db = getDatabase();

  // 清理过期会话
  cleanExpiredSessions();

  // 查找有效会话
  const session = db
    .prepare(
      `
    SELECT s.user_id, s.expires_at
    FROM sessions s
    WHERE s.token = ?
  `
    )
    .get(token) as { user_id: number; expires_at: string } | undefined;

  if (!session) {
    return null;
  }

  // 检查是否过期
  if (new Date(session.expires_at) < new Date()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }

  // 获取用户信息
  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(session.user_id) as User | undefined;

  return user || null;
}

/**
 * 获取当前用户
 */
export function getCurrentUser(userId: number): User | null {
  const db = getDatabase();
  return db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId) as User | null;
}

/**
 * 更新用户资料
 */
export function updateProfile(
  userId: number,
  data: UpdateProfileData
): User | null {
  const db = getDatabase();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.nickname !== undefined) {
    updates.push("nickname = ?");
    values.push(data.nickname);
  }
  if (data.avatar !== undefined) {
    updates.push("avatar = ?");
    values.push(data.avatar);
  }
  if (data.email !== undefined) {
    updates.push("email = ?");
    values.push(data.email);
  }
  if (data.phone !== undefined) {
    updates.push("phone = ?");
    values.push(data.phone);
  }
  if (data.birthday !== undefined) {
    updates.push("birthday = ?");
    values.push(data.birthday);
  }
  if (data.gender !== undefined) {
    updates.push("gender = ?");
    values.push(data.gender);
  }
  if (data.bio !== undefined) {
    updates.push("bio = ?");
    values.push(data.bio);
  }

  if (updates.length === 0) {
    return getCurrentUser(userId);
  }

  updates.push("updated_at = datetime('now', 'localtime')");
  values.push(userId);

  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(
    ...values
  );

  return getCurrentUser(userId);
}

/**
 * 更新密码
 */
export function updatePassword(
  userId: number,
  data: UpdatePasswordData
): { success: boolean; error?: string } {
  const db = getDatabase();

  // 获取当前用户密码
  const user = db
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(userId) as { password_hash: string } | undefined;

  if (!user) {
    return { success: false, error: "用户不存在" };
  }

  // 验证旧密码
  if (!bcrypt.compareSync(data.oldPassword, user.password_hash)) {
    return { success: false, error: "原密码错误" };
  }

  // 更新密码
  const newPasswordHash = bcrypt.hashSync(data.newPassword, SALT_ROUNDS);

  try {
    db.prepare(
      `UPDATE users SET password_hash = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`
    ).run(newPasswordHash, userId);

    // 删除所有会话，强制重新登录
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);

    return { success: true };
  } catch {
    return { success: false, error: "密码更新失败" };
  }
}

/**
 * 重置密码（忘记密码场景）
 */
export function resetPassword(data: ResetPasswordData): {
  success: boolean;
  error?: string;
} {
  const db = getDatabase();

  // 检查用户是否存在
  const user = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(data.username) as { id: number } | undefined;

  if (!user) {
    return { success: false, error: "用户不存在" };
  }

  // 更新密码
  const newPasswordHash = bcrypt.hashSync(data.newPassword, SALT_ROUNDS);

  try {
    db.prepare(
      `UPDATE users SET password_hash = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`
    ).run(newPasswordHash, user.id);

    // 删除所有会话
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);

    return { success: true };
  } catch {
    return { success: false, error: "密码重置失败" };
  }
}

export default {
  login,
  register,
  logout,
  validateToken,
  getCurrentUser,
  updateProfile,
  updatePassword,
  resetPassword,
  isInitialized,
  checkUsernameExists,
  cleanExpiredSessions,
};
