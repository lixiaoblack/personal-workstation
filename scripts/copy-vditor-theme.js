/**
 * 复制 Vditor 主题文件到 public 目录
 * 用于离线环境支持
 */

const fs = require("fs");
const path = require("path");

const sourceDir = path.resolve(
  __dirname,
  "../node_modules/vditor/dist/css/content-theme"
);
const targetDir = path.resolve(__dirname, "../public/vditor-content-theme");

// 确保目标目录存在
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 复制所有主题文件
const files = fs.readdirSync(sourceDir);
files.forEach((file) => {
  const sourceFile = path.join(sourceDir, file);
  const targetFile = path.join(targetDir, file);
  fs.copyFileSync(sourceFile, targetFile);
  console.log(`Copied: ${file}`);
});

console.log("Vditor theme files copied successfully!");
