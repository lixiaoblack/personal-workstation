/**
 * electron-builder afterPack 钩子
 *
 * 处理 pnpm 符号链接问题：将原生模块从符号链接解析为实际文件
 * 解决 bcrypt、better-sqlite3 等原生模块打包后找不到的问题
 */

const path = require("path");
const fs = require("fs");

/**
 * 递归解析符号链接，将实际文件复制到目标位置
 */
function resolveSymlink(srcPath, destPath) {
  if (!fs.existsSync(srcPath)) {
    console.log(`  [跳过] 源路径不存在: ${srcPath}`);
    return;
  }

  const stat = fs.lstatSync(srcPath);

  if (stat.isSymbolicLink()) {
    // 解析符号链接
    const realPath = fs.realpathSync(srcPath);
    console.log(`  [解析] ${srcPath} -> ${realPath}`);

    // 确保目标目录存在
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // 删除目标位置的符号链接（如果存在）
    if (fs.existsSync(destPath)) {
      fs.rmSync(destPath, { recursive: true, force: true });
    }

    // 复制实际文件/目录
    if (fs.statSync(realPath).isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirectory(realPath, destPath);
    } else {
      fs.copyFileSync(realPath, destPath);
    }
  } else if (stat.isDirectory()) {
    // 处理目录
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }

    const entries = fs.readdirSync(srcPath);
    for (const entry of entries) {
      resolveSymlink(
        path.join(srcPath, entry),
        path.join(destPath, entry)
      );
    }
  } else {
    // 普通文件，直接复制
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(srcPath, destPath);
  }
}

/**
 * 复制目录
 */
function copyDirectory(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirectory(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      // 解析符号链接
      const realPath = fs.realpathSync(srcPath);
      if (fs.statSync(realPath).isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        copyDirectory(realPath, destPath);
      } else {
        fs.copyFileSync(realPath, destPath);
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 处理 node_modules 中的原生模块
 */
function processNativeModules(appPath) {
  console.log("\n[afterPack] 处理原生模块...");

  const nodeModulesPath = path.join(appPath, "node_modules");

  if (!fs.existsSync(nodeModulesPath)) {
    // 检查 app.asar.unpacked
    const unpackedPath = path.join(appPath, "app.asar.unpacked", "node_modules");
    if (fs.existsSync(unpackedPath)) {
      console.log("  找到 app.asar.unpacked/node_modules");
      processNativeModulesInDir(unpackedPath);
    } else {
      console.log("  [警告] node_modules 目录不存在");
    }
    return;
  }

  processNativeModulesInDir(nodeModulesPath);
}

/**
 * 在 node_modules 目录中处理原生模块
 */
function processNativeModulesInDir(nodeModulesPath) {
  const nativeModules = ["bcrypt", "better-sqlite3"];

  for (const moduleName of nativeModules) {
    const modulePath = path.join(nodeModulesPath, moduleName);

    if (!fs.existsSync(modulePath)) {
      console.log(`  [跳过] ${moduleName} 不存在`);
      continue;
    }

    const stat = fs.lstatSync(modulePath);

    if (stat.isSymbolicLink()) {
      // 模块是符号链接，需要解析
      const realPath = fs.realpathSync(modulePath);
      console.log(`  [处理] ${moduleName}: 符号链接 -> ${realPath}`);

      // 删除符号链接，复制实际文件
      fs.rmSync(modulePath, { recursive: true, force: true });
      fs.mkdirSync(modulePath, { recursive: true });
      copyDirectory(realPath, modulePath);
    } else {
      // 检查模块内部是否有符号链接
      console.log(`  [检查] ${moduleName}`);
      resolveSymlink(modulePath, modulePath);
    }
  }
}

/**
 * afterPack 钩子主函数
 */
module.exports = async function (context) {
  console.log("\n========================================");
  console.log("[afterPack] 开始处理打包文件");
  console.log("========================================");

  const { appOutDir, packager } = context;
  const platform = packager.platform.name;

  console.log(`平台: ${platform}`);
  console.log(`输出目录: ${appOutDir}`);

  // macOS: app 在 .app/Contents/Resources/app.asar
  // Windows: app 在 resources/app.asar
  let appPath;
  if (platform === "mac") {
    const appName = packager.appInfo.productFilename;
    appPath = path.join(
      appOutDir,
      `${appName}.app`,
      "Contents",
      "Resources"
    );
  } else if (platform === "windows") {
    appPath = path.join(appOutDir, "resources");
  } else {
    appPath = path.join(appOutDir, "resources");
  }

  console.log(`应用资源目录: ${appPath}`);

  // 处理 app.asar.unpacked 中的原生模块
  const unpackedPath = path.join(appPath, "app.asar.unpacked");
  if (fs.existsSync(unpackedPath)) {
    console.log("\n处理 app.asar.unpacked...");
    processNativeModulesInDir(path.join(unpackedPath, "node_modules"));
  }

  console.log("\n========================================");
  console.log("[afterPack] 处理完成");
  console.log("========================================\n");
};
