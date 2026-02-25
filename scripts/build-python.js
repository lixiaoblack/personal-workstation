/**
 * Python 服务打包脚本
 *
 * 在 Electron 打包前调用，将 Python 服务打包成可执行文件。
 *
 * 使用方法：
 *     node scripts/build-python.js
 *
 * 环境变量：
 *     SKIP_PYTHON_BUILD - 设置为 "true" 跳过打包
 */

const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

// 配置
const PYTHON_SERVICE_DIR = path.join(__dirname, "..", "python-service");
const OUTPUT_DIR = path.join(__dirname, "..", "dist", "python-service");

/**
 * 获取当前平台
 */
function getPlatform() {
  switch (os.platform()) {
    case "darwin":
      return "mac";
    case "win32":
      return "windows";
    default:
      return "linux";
  }
}

/**
 * 检查 Python 环境
 * 优先使用 conda base 环境，避免打包系统 Python 中不必要的大型库
 */
function checkPython() {
  console.log("检查 Python 环境...");

  // 优先使用 conda base 环境
  const condaPython = "/opt/anaconda3/bin/python";
  try {
    const version = execSync(`"${condaPython}" --version`, { encoding: "utf-8" });
    console.log(`  找到 Conda Python: ${version.trim()}`);
    console.log(`  路径: ${condaPython}`);
    return condaPython;
  } catch {
    console.log("  Conda Python 未找到，尝试其他选项...");
  }

  try {
    // 尝试 python3
    const version = execSync("python3 --version", { encoding: "utf-8" });
    console.log(`  找到 Python: ${version.trim()}`);
    return "python3";
  } catch {
    try {
      // 尝试 python
      const version = execSync("python --version", { encoding: "utf-8" });
      console.log(`  找到 Python: ${version.trim()}`);
      return "python";
    } catch {
      console.error("  错误: 未找到 Python，请先安装 Python 3.9+");
      return null;
    }
  }
}

/**
 * 检查 PyInstaller
 */
function checkPyInstaller(pythonCmd) {
  console.log("检查 PyInstaller...");

  try {
    const version = execSync(`${pythonCmd} -m PyInstaller --version`, {
      encoding: "utf-8",
    });
    console.log(`  PyInstaller 版本: ${version.trim()}`);
    return true;
  } catch {
    console.log("  PyInstaller 未安装");
    return false;
  }
}

/**
 * 安装 PyInstaller
 */
function installPyInstaller(pythonCmd) {
  console.log("正在安装 PyInstaller...");
  execSync(`${pythonCmd} -m pip install pyinstaller`, {
    stdio: "inherit",
    cwd: PYTHON_SERVICE_DIR,
  });
  console.log("PyInstaller 安装完成");
}

/**
 * 执行打包
 */
function buildPythonService(pythonCmd) {
  console.log("\n开始打包 Python 服务...");
  console.log(`  工作目录: ${PYTHON_SERVICE_DIR}`);
  console.log(`  输出目录: ${OUTPUT_DIR}`);

  // 检查 build.py 是否存在
  const buildScript = path.join(PYTHON_SERVICE_DIR, "build.py");
  if (!fs.existsSync(buildScript)) {
    console.error("  错误: 找不到 build.py");
    return false;
  }

  try {
    // 执行打包脚本
    execSync(`${pythonCmd} build.py --clean --output "${OUTPUT_DIR}"`, {
      stdio: "inherit",
      cwd: PYTHON_SERVICE_DIR,
    });

    console.log("\nPython 服务打包完成!");
    return true;
  } catch (error) {
    console.error("\nPython 服务打包失败:", error.message);
    return false;
  }
}

/**
 * 验证输出
 */
function verifyOutput() {
  console.log("\n验证打包输出...");

  if (!fs.existsSync(OUTPUT_DIR)) {
    console.error(`  错误: 输出目录不存在: ${OUTPUT_DIR}`);
    return false;
  }

  const platform = getPlatform();
  const exeName =
    platform === "windows" ? "python-service.exe" : "python-service";
  const exePath = path.join(OUTPUT_DIR, exeName);

  if (!fs.existsSync(exePath)) {
    console.error(`  错误: 可执行文件不存在: ${exePath}`);
    return false;
  }

  console.log(`  可执行文件: ${exePath}`);

  // 获取输出大小
  const stats = fs.statSync(exePath);
  console.log(`  文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  return true;
}

/**
 * 主函数
 */
function main() {
  console.log("========================================");
  console.log("Python 服务打包脚本");
  console.log(`平台: ${getPlatform()}`);
  console.log("========================================\n");

  // 检查是否跳过
  if (process.env.SKIP_PYTHON_BUILD === "true") {
    console.log("SKIP_PYTHON_BUILD=true，跳过打包");
    return;
  }

  // 检查 Python
  const pythonCmd = checkPython();
  if (!pythonCmd) {
    process.exit(1);
  }

  // 检查 PyInstaller
  if (!checkPyInstaller(pythonCmd)) {
    console.log("\n需要安装 PyInstaller");
    installPyInstaller(pythonCmd);
  }

  // 执行打包
  if (!buildPythonService(pythonCmd)) {
    process.exit(1);
  }

  // 验证输出
  if (!verifyOutput()) {
    process.exit(1);
  }

  console.log("\n========================================");
  console.log("打包成功!");
  console.log("========================================");
}

// 执行
main();
