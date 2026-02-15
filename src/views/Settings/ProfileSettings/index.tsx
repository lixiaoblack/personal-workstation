/**
 * ProfileSettings 个人信息设置组件
 * 包含头像上传、个人信息编辑
 */
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts";
import type { AvatarSelectResult } from "@/types/electron";
import { App } from "antd";

const ProfileSettings: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { message } = App.useApp();

  // 个人信息编辑状态
  const [editForm, setEditForm] = useState({
    nickname: "",
    email: "",
    phone: "",
    bio: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // 头像预览状态
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);

  // 初始化用户信息到表单
  useEffect(() => {
    if (user) {
      setEditForm({
        nickname: user.nickname || "",
        email: user.email || "",
        phone: user.phone || "",
        bio: user.bio || "",
      });
      setAvatarPreview(user.avatar || null);
    }
  }, [user]);

  // 选择头像
  const handleSelectAvatar = async () => {
    setIsSelectingAvatar(true);
    try {
      const result: AvatarSelectResult =
        await window.electronAPI.selectAvatar();
      if (result.success && result.data) {
        setAvatarPreview(result.data);
        message.success("头像已选择，请点击保存修改以应用");
      } else if (result.error) {
        message.error(result.error);
      }
    } catch (error) {
      console.error("选择头像失败:", error);
      message.error("选择头像失败");
    } finally {
      setIsSelectingAvatar(false);
    }
  };

  // 保存个人信息
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updateData = {
        ...editForm,
        avatar: avatarPreview || undefined,
      };
      const result = await updateProfile(updateData);
      if (result.success) {
        message.success("保存成功");
      } else {
        message.error(result.error || "保存失败");
      }
    } catch (error) {
      console.error("保存个人信息失败:", error);
      message.error("保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">个人信息</h2>
        <p className="text-text-tertiary text-sm">管理您的个人资料和账户连接</p>
      </div>
      <div className="bg-bg-secondary border border-border rounded-xl p-6 space-y-8">
        {/* 头像区域 */}
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="size-20 rounded-full border-2 border-border bg-primary/20 flex items-center justify-center overflow-hidden">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="avatar"
                  className="size-full rounded-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-3xl text-primary">
                  person
                </span>
              )}
            </div>
            <button
              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleSelectAvatar}
              disabled={isSelectingAvatar}
            >
              {isSelectingAvatar ? (
                <span className="material-symbols-outlined text-white text-xl animate-spin">
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-outlined text-white text-xl">
                  edit
                </span>
              )}
            </button>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-text-primary">
              个人头像
            </h3>
            <p className="text-sm text-text-tertiary mb-2">
              建议使用 400x400px 以上的 PNG 或 JPG 图片，最大 5MB
            </p>
            <button
              className="text-xs font-bold text-primary hover:underline disabled:opacity-50"
              onClick={handleSelectAvatar}
              disabled={isSelectingAvatar}
            >
              {isSelectingAvatar ? "选择中..." : "更换图片"}
            </button>
          </div>
        </div>

        {/* 表单区域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
              用户名
            </label>
            <input
              className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all text-text-primary cursor-not-allowed opacity-60"
              type="text"
              value={user?.username || ""}
              disabled
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
              昵称
            </label>
            <input
              className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all text-text-primary"
              type="text"
              value={editForm.nickname}
              onChange={(e) =>
                setEditForm({ ...editForm, nickname: e.target.value })
              }
              placeholder="请输入昵称"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
              邮箱
            </label>
            <input
              className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all text-text-primary"
              type="email"
              value={editForm.email}
              onChange={(e) =>
                setEditForm({ ...editForm, email: e.target.value })
              }
              placeholder="请输入邮箱"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
              手机号
            </label>
            <input
              className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all text-text-primary"
              type="tel"
              value={editForm.phone}
              onChange={(e) =>
                setEditForm({ ...editForm, phone: e.target.value })
              }
              placeholder="请输入手机号"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
              个人简介
            </label>
            <textarea
              className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all text-text-primary resize-none"
              rows={3}
              value={editForm.bio}
              onChange={(e) =>
                setEditForm({ ...editForm, bio: e.target.value })
              }
              placeholder="介绍一下自己吧"
            />
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <button
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            onClick={handleSaveProfile}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">
                  progress_activity
                </span>
                保存中...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">save</span>
                保存修改
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};

export { ProfileSettings };
