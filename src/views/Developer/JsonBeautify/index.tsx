/**
 * JsonBeautify JSON美化页面
 * 支持JSON对比、美化、差异检测
 */
import React, { useState, useEffect } from "react";
import { App } from "antd";

const JsonBeautify: React.FC = () => {
  const { message } = App.useApp();
  const [leftJson, setLeftJson] = useState("");
  const [rightJson, setRightJson] = useState("");
  const [leftLines, setLeftLines] = useState(0);
  const [rightLines, setRightLines] = useState(0);
  const [diffCount, setDiffCount] = useState(0);
  const [syncScroll, setSyncScroll] = useState(true);

  // 更新行数
  useEffect(() => {
    setLeftLines(leftJson.split("\n").length);
  }, [leftJson]);

  useEffect(() => {
    setRightLines(rightJson.split("\n").length);
  }, [rightJson]);

  // 美化JSON
  const handleBeautify = () => {
    try {
      if (leftJson) {
        const parsed = JSON.parse(leftJson);
        setLeftJson(JSON.stringify(parsed, null, 2));
      }
      if (rightJson) {
        const parsed = JSON.parse(rightJson);
        setRightJson(JSON.stringify(parsed, null, 2));
      }
      message.success("美化完成");
    } catch {
      message.error("JSON 格式错误");
    }
  };

  // 左右互换
  const handleSwap = () => {
    const temp = leftJson;
    setLeftJson(rightJson);
    setRightJson(temp);
    message.success("已互换");
  };

  // 清空
  const handleClear = () => {
    setLeftJson("");
    setRightJson("");
    setDiffCount(0);
    message.success("已清空");
  };

  // 对比
  const handleCompare = () => {
    try {
      const left = JSON.parse(leftJson);
      const right = JSON.parse(rightJson);
      const diffs = countDifferences(left, right);
      setDiffCount(diffs);
      message.info(`检测到 ${diffs} 处差异`);
    } catch {
      message.error("JSON 格式错误，无法对比");
    }
  };

  // 计算差异
  const countDifferences = (obj1: unknown, obj2: unknown): number => {
    let count = 0;
    if (typeof obj1 !== typeof obj2) return 1;
    if (typeof obj1 !== "object" || obj1 === null) {
      return obj1 === obj2 ? 0 : 1;
    }
    const keys1 = Object.keys(obj1 as object);
    const keys2 = Object.keys(obj2 as object);
    const allKeys = new Set([...keys1, ...keys2]);
    allKeys.forEach((key) => {
      const k = key as keyof typeof obj1;
      if (!(k in (obj1 as object)) || !(k in (obj2 as object))) {
        count += 1;
      } else {
        count += countDifferences(
          (obj1 as Record<string, unknown>)[k],
          (obj2 as Record<string, unknown>)[k]
        );
      }
    });
    return count;
  };

  // 生成行号
  const renderLineNumbers = (count: number) => {
    return Array.from({ length: Math.max(count, 12) }, (_, i) => i + 1).join(
      "\n"
    );
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary overflow-hidden">
      {/* 工具栏 */}
      <header className="h-16 flex-shrink-0 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                diffCount > 0 ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            <span className="text-sm font-medium text-text-secondary">
              {diffCount > 0 ? `已检测到 ${diffCount} 处差异` : "等待对比"}
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1">
            <button
              onClick={handleBeautify}
              className="p-2 text-text-tertiary hover:bg-bg-tertiary rounded-lg transition-colors flex items-center gap-1 text-sm"
            >
              <span className="material-symbols-outlined text-lg">
                format_align_left
              </span>
              美化内容
            </button>
            <button
              onClick={handleSwap}
              className="p-2 text-text-tertiary hover:bg-bg-tertiary rounded-lg transition-colors flex items-center gap-1 text-sm"
            >
              <span className="material-symbols-outlined text-lg">
                swap_horiz
              </span>
              左右互换
            </button>
            <button
              onClick={handleClear}
              className="p-2 text-text-tertiary hover:bg-bg-tertiary rounded-lg transition-colors flex items-center gap-1 text-sm text-error"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              清空
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCompare}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-lg">
              play_arrow
            </span>
            立即对比
          </button>
        </div>
      </header>

      {/* 双编辑器容器 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧编辑器 */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary/50 border-b border-border">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">
              原始 JSON
            </span>
            <span className="text-[11px] text-text-tertiary">{leftLines} Lines</span>
          </div>
          <div className="flex-1 flex overflow-hidden">
            {/* 行号 */}
            <div className="w-12 text-text-tertiary text-right pr-4 pt-4 select-none opacity-50 text-sm leading-relaxed bg-bg-primary border-r border-border overflow-hidden">
              <pre className="text-right">{renderLineNumbers(leftLines)}</pre>
            </div>
            {/* 编辑区 */}
            <textarea
              value={leftJson}
              onChange={(e) => setLeftJson(e.target.value)}
              placeholder="在此输入 JSON..."
              className="flex-1 bg-bg-primary text-text-primary text-sm leading-relaxed p-4 resize-none outline-none font-mono"
              spellCheck={false}
            />
          </div>
        </div>

        {/* 右侧编辑器 */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary/50 border-b border-border">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">
              对比 JSON
            </span>
            <span className="text-[11px] text-text-tertiary">
              {rightLines} Lines
            </span>
          </div>
          <div className="flex-1 flex overflow-hidden">
            {/* 行号 */}
            <div className="w-12 text-text-tertiary text-right pr-4 pt-4 select-none opacity-50 text-sm leading-relaxed bg-bg-primary border-r border-border overflow-hidden">
              <pre className="text-right">{renderLineNumbers(rightLines)}</pre>
            </div>
            {/* 编辑区 */}
            <textarea
              value={rightJson}
              onChange={(e) => setRightJson(e.target.value)}
              placeholder="在此输入 JSON 进行对比..."
              className="flex-1 bg-bg-primary text-text-primary text-sm leading-relaxed p-4 resize-none outline-none font-mono"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* 底部状态栏 */}
      <footer className="h-8 flex-shrink-0 border-t border-border bg-bg-tertiary/50 flex items-center justify-between px-4 text-[11px] text-text-tertiary">
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>JSON</span>
          <span>Spaces: 2</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Ln 1, Col 1</span>
          <button
            onClick={() => setSyncScroll(!syncScroll)}
            className={`flex items-center gap-1 ${
              syncScroll ? "text-primary" : "text-text-tertiary"
            }`}
          >
            <span className="material-symbols-outlined text-xs">sync</span>
            同步滚动{syncScroll ? "开启" : "关闭"}
          </button>
        </div>
      </footer>
    </div>
  );
};

export { JsonBeautify };
export default JsonBeautify;
