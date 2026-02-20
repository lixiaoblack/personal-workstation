/**
 * 构建前清理脚本
 *
 * 只清理 dist 目录中的前端文件，保留 python-service
 */

const fs = require("fs");
const path = require("path");

const DIST_DIR = path.join(__dirname, "..", "dist");

// 需要保留的目录/文件
const KEEP_PATTERNS = ["python-service"];

/**
 * 清理 dist 目录（保留 python-service）
 */
function cleanDist() {
  console.log("清理 dist 目录（保留 python-service）...");

  if (!fs.existsSync(DIST_DIR)) {
    console.log("  dist 目录不存在，跳过清理");
    return;
  }

  const entries = fs.readdirSync(DIST_DIR);

  for (const entry of entries) {
    if (KEEP_PATTERNS.includes(entry)) {
      console.log(`  [保留] ${entry}`);
      continue;
    }

    const entryPath = path.join(DIST_DIR, entry);
    try {
      const stat = fs.statSync(entryPath);
      if (stat.isDirectory()) {
        fs.rmSync(entryPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(entryPath);
      }
      console.log(`  [删除] ${entry}`);
    } catch (err) {
      console.log(`  [错误] 无法删除 ${entry}: ${err.message}`);
    }
  }

  console.log("清理完成");
}

cleanDist();
