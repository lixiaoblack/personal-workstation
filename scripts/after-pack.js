/**
 * electron-builder afterPack 钩子
 *
 * 处理 pnpm 符号链接问题：将原生模块从符号链接解析为实际文件
 * 解决 bcrypt、better-sqlite3 等原生模块打包后找不到的问题
 *
 * pnpm 结构：
 * node_modules/bcrypt -> .pnpm/bcrypt@6.0.0/node_modules/bcrypt (符号链接)
 * node_modules/.pnpm/bcrypt@6.0.0/node_modules/bcrypt/ (实际文件)
 */

const path = require("path");
const fs = require("fs");

// 原生模块配置
const NATIVE_MODULES = [
  { name: "bcrypt", pnpmName: "bcrypt@6.0.0" },
  { name: "better-sqlite3", pnpmName: "better-sqlite3@12.6.2" },
];

/**
 * 复制目录（递归）
 */
function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`    [跳过] 源目录不存在: ${src}`);
    return false;
  }

  // 确保目标目录存在
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  let success = true;

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    try {
      if (entry.isDirectory()) {
        // 检查是否是符号链接目录（pnpm 中嵌套的 node_modules）
        if (entry.isSymbolicLink()) {
          const realPath = fs.realpathSync(srcPath);
          console.log(`    [解析符号链接] ${entry.name} -> ${realPath}`);
          copyDirectory(realPath, destPath);
        } else {
          copyDirectory(srcPath, destPath);
        }
      } else if (entry.isSymbolicLink()) {
        // 符号链接文件：解析并复制实际文件
        const realPath = fs.realpathSync(srcPath);
        if (fs.statSync(realPath).isDirectory()) {
          copyDirectory(realPath, destPath);
        } else {
          fs.copyFileSync(realPath, destPath);
        }
      } else {
        // 普通文件
        fs.copyFileSync(srcPath, destPath);
      }
    } catch (err) {
      console.log(`    [警告] 复制失败: ${entry.name} - ${err.message}`);
      success = false;
    }
  }

  return success;
}

/**
 * 处理原生模块
 */
function processNativeModules(context) {
  const { appOutDir, packager } = context;
  const platform = packager.platform.name;

  console.log("\n========================================");
  console.log("[afterPack] 处理原生模块");
  console.log("========================================");
  console.log(`平台: ${platform}`);
  console.log(`输出目录: ${appOutDir}`);

  // 确定应用资源目录
  let resourcesPath;
  if (platform === "mac") {
    const appName = packager.appInfo.productFilename;
    resourcesPath = path.join(
      appOutDir,
      `${appName}.app`,
      "Contents",
      "Resources"
    );
  } else {
    resourcesPath = path.join(appOutDir, "resources");
  }

  console.log(`资源目录: ${resourcesPath}`);

  // 检查 app.asar.unpacked 目录
  const unpackedPath = path.join(resourcesPath, "app.asar.unpacked");
  if (!fs.existsSync(unpackedPath)) {
    console.log("[警告] app.asar.unpacked 目录不存在");
    console.log("  尝试创建目录...");

    // 创建目录结构
    fs.mkdirSync(path.join(unpackedPath, "node_modules"), { recursive: true });
    fs.mkdirSync(path.join(unpackedPath, ".pnpm"), { recursive: true });
  }

  const unpackedNodeModules = path.join(unpackedPath, "node_modules");
  const unpackedPnpm = path.join(unpackedPath, ".pnpm");

  // 项目根目录的 node_modules
  const projectRoot = path.resolve(__dirname, "..");
  const projectNodeModules = path.join(projectRoot, "node_modules");
  const projectPnpm = path.join(projectNodeModules, ".pnpm");

  console.log(`\n项目 node_modules: ${projectNodeModules}`);
  console.log(`项目 .pnpm: ${projectPnpm}`);

  // 处理每个原生模块
  for (const module of NATIVE_MODULES) {
    console.log(`\n处理模块: ${module.name}`);

    // 源路径：pnpm 的实际模块目录
    const srcPnpmPath = path.join(projectPnpm, module.pnpmName);

    // 目标路径：app.asar.unpacked/.pnpm/
    const destPnpmPath = path.join(unpackedPnpm, module.pnpmName);

    console.log(`  源路径: ${srcPnpmPath}`);
    console.log(`  目标路径: ${destPnpmPath}`);

    // 复制 pnpm 目录
    if (fs.existsSync(srcPnpmPath)) {
      console.log(`  复制 pnpm 模块...`);
      copyDirectory(srcPnpmPath, destPnpmPath);
    } else {
      console.log(`  [错误] pnpm 目录不存在: ${srcPnpmPath}`);
    }

    // 创建符号链接：node_modules/模块名 -> .pnpm/模块名/node_modules/模块名
    const destNodeModulesPath = path.join(unpackedNodeModules, module.name);
    const targetInsidePnpm = path.join(
      unpackedPath,
      ".pnpm",
      module.pnpmName,
      "node_modules",
      module.name
    );

    console.log(`  创建链接: ${destNodeModulesPath} -> ${targetInsidePnpm}`);

    // 删除可能存在的旧链接/目录
    if (fs.existsSync(destNodeModulesPath)) {
      fs.rmSync(destNodeModulesPath, { recursive: true, force: true });
    }

    // 确保目标目录存在
    if (fs.existsSync(targetInsidePnpm)) {
      // 创建相对路径的符号链接
      const relativeTarget = path.relative(
        path.dirname(destNodeModulesPath),
        targetInsidePnpm
      );
      try {
        fs.symlinkSync(relativeTarget, destNodeModulesPath, "junction");
        console.log(`  符号链接创建成功`);
      } catch (err) {
        console.log(`  [警告] 符号链接创建失败: ${err.message}`);
        // 回退：直接复制目录
        console.log(`  回退：直接复制目录`);
        copyDirectory(targetInsidePnpm, destNodeModulesPath);
      }
    } else {
      console.log(`  [警告] 目标目录不存在: ${targetInsidePnpm}`);
    }
  }

  console.log("\n========================================");
  console.log("[afterPack] 处理完成");
  console.log("========================================\n");
}

/**
 * afterPack 钩子入口
 */
module.exports = async function (context) {
  try {
    processNativeModules(context);
  } catch (err) {
    console.error("[afterPack] 处理失败:", err);
    // 不抛出错误，允许打包继续
  }
};
