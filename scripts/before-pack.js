/**
 * 打包前脚本：处理 pnpm 符号链接
 *
 * 将原生模块的符号链接替换为实际文件
 * 解决 electron-builder 打包时符号链接解析失败的问题
 */

const fs = require("fs");
const path = require("path");

const NODE_MODULES = path.join(__dirname, "..", "node_modules");
const PNPM_DIR = path.join(NODE_MODULES, ".pnpm");

// 需要处理的模块及其依赖
const NATIVE_MODULES = [
  { name: "bcrypt", deps: ["node-addon-api", "node-gyp-build"] },
  { name: "better-sqlite3", deps: [] },
];

/**
 * 递归复制目录（跳过指向自身的符号链接）
 */
function copyDir(src, dest, visited = new Set()) {
  if (!fs.existsSync(src)) return;

  // 防止循环
  const realSrc = fs.realpathSync(src);
  if (visited.has(realSrc)) return;
  visited.add(realSrc);

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    try {
      if (entry.isSymbolicLink()) {
        const realPath = fs.realpathSync(srcPath);

        // 检查是否指向自身或祖先目录（循环链接）
        const relativeToDest = path.relative(dest, realPath);
        if (relativeToDest.startsWith("..") && realPath.includes(dest.split("/").pop())) {
          // 可能是循环链接，跳过复制，直接跳过
          console.log(`    [跳过循环链接] ${entry.name}`);
          continue;
        }

        const realStat = fs.statSync(realPath);

        if (realStat.isDirectory()) {
          if (!visited.has(realPath)) {
            copyDir(realPath, destPath, visited);
          }
        } else {
          fs.copyFileSync(realPath, destPath);
        }
      } else if (entry.isDirectory()) {
        copyDir(srcPath, destPath, visited);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    } catch (err) {
      console.log(`    [警告] 跳过 ${entry.name}: ${err.message}`);
    }
  }
}

/**
 * 处理单个依赖模块（复制到指定目录）
 */
function processDependency(depName, destNodeModules) {
  console.log(`    处理依赖: ${depName}`);

  // 查找 pnpm 中的依赖
  const pnpmEntries = fs.readdirSync(PNPM_DIR);
  const depDir = pnpmEntries.find((e) => e.startsWith(`${depName}@`));

  if (!depDir) {
    // 可能在项目根 node_modules 中
    const rootDep = path.join(NODE_MODULES, depName);
    if (fs.existsSync(rootDep)) {
      const destDep = path.join(destNodeModules, depName);
      if (!fs.existsSync(destDep)) {
        console.log(`      从根目录复制: ${rootDep}`);
        copyDir(rootDep, destDep);
      }
    } else {
      console.log(`      [跳过] 未找到依赖: ${depName}`);
    }
    return;
  }

  const pnpmDepPath = path.join(PNPM_DIR, depDir, "node_modules", depName);

  // 解析实际路径
  let realDepPath = pnpmDepPath;
  try {
    while (fs.existsSync(realDepPath) && fs.lstatSync(realDepPath).isSymbolicLink()) {
      realDepPath = fs.realpathSync(realDepPath);
    }
  } catch (err) {
    console.log(`      [跳过] 解析路径失败: ${err.message}`);
    return;
  }

  if (!fs.existsSync(realDepPath)) {
    console.log(`      [跳过] 实际路径不存在: ${realDepPath}`);
    return;
  }

  const destDep = path.join(destNodeModules, depName);

  // 如果目标已存在且是符号链接，先删除
  if (fs.existsSync(destDep) && fs.lstatSync(destDep).isSymbolicLink()) {
    fs.unlinkSync(destDep);
  }

  // 复制依赖
  if (!fs.existsSync(destDep)) {
    console.log(`      复制到: ${destDep}`);
    copyDir(realDepPath, destDep);
  }
}

/**
 * 处理单个模块
 */
function processModule(moduleConfig) {
  const moduleName = moduleConfig.name;
  const deps = moduleConfig.deps || [];

  console.log(`\n处理模块: ${moduleName}`);

  const moduleLink = path.join(NODE_MODULES, moduleName);

  // 查找 pnpm 目录中的实际模块
  const pnpmEntries = fs.readdirSync(PNPM_DIR);
  const moduleDir = pnpmEntries.find((e) => e.startsWith(`${moduleName}@`));

  if (!moduleDir) {
    console.log(`  [跳过] 在 .pnpm 中未找到 ${moduleName}`);
    return;
  }

  const pnpmModulePath = path.join(PNPM_DIR, moduleDir, "node_modules", moduleName);

  // 获取实际路径，处理多层符号链接
  let realModulePath = pnpmModulePath;
  try {
    while (fs.lstatSync(realModulePath).isSymbolicLink()) {
      realModulePath = fs.realpathSync(realModulePath);
    }
  } catch (err) {
    console.log(`  [跳过] 解析路径失败: ${err.message}`);
    return;
  }

  if (!fs.existsSync(realModulePath)) {
    console.log(`  [跳过] 实际路径不存在: ${realModulePath}`);
    return;
  }

  console.log(`  符号链接: ${moduleLink}`);
  console.log(`  实际路径: ${realModulePath}`);

  // 删除符号链接
  if (fs.existsSync(moduleLink) && fs.lstatSync(moduleLink).isSymbolicLink()) {
    fs.unlinkSync(moduleLink);
    console.log(`  已删除符号链接`);
  }

  // 复制实际文件
  if (!fs.existsSync(moduleLink)) {
    console.log(`  复制实际文件...`);
    copyDir(realModulePath, moduleLink);
    console.log(`  复制完成`);
  }

  // 处理依赖
  if (deps.length > 0) {
    console.log(`  处理依赖...`);
    const moduleNodeModules = path.join(moduleLink, "node_modules");

    // 确保 node_modules 目录存在
    if (!fs.existsSync(moduleNodeModules)) {
      fs.mkdirSync(moduleNodeModules, { recursive: true });
    }

    for (const dep of deps) {
      processDependency(dep, moduleNodeModules);
    }
  }

  // 处理 .pnpm 内部的符号链接
  if (fs.existsSync(pnpmModulePath) && fs.lstatSync(pnpmModulePath).isSymbolicLink()) {
    console.log(`  处理 .pnpm 内部符号链接...`);
    const realInternal = fs.realpathSync(pnpmModulePath);
    fs.unlinkSync(pnpmModulePath);
    copyDir(realInternal, pnpmModulePath);
    console.log(`  内部符号链接已解析`);
  }
}

/**
 * 主函数
 */
function main() {
  console.log("========================================");
  console.log("打包前：处理 pnpm 符号链接");
  console.log("========================================");

  if (!fs.existsSync(PNPM_DIR)) {
    console.log("非 pnpm 项目，跳过处理");
    return;
  }

  for (const moduleConfig of NATIVE_MODULES) {
    try {
      processModule(moduleConfig);
    } catch (err) {
      console.error(`处理 ${moduleConfig.name} 失败:`, err.message);
    }
  }

  console.log("\n========================================");
  console.log("处理完成");
  console.log("========================================");
}

main();
