/**
 * ExcelToJson Excel转JSON页面
 */
import React, { useState } from "react";
import { App, Upload } from "antd";
import type { UploadFile } from "antd";

const ExcelToJson: React.FC = () => {
  const { message } = App.useApp();
  const [jsonOutput, setJsonOutput] = useState("");
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 简单的CSV解析（实际项目中建议使用xlsx库）
  const parseCSV = (text: string) => {
    const lines = text.split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || "";
      });
      result.push(obj);
    }

    return result;
  };

  // 处理文件上传
  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      // 检测文件类型
      if (file.name.endsWith(".csv")) {
        const result = parseCSV(text);
        setJsonOutput(JSON.stringify(result, null, 2));
        message.success("转换成功");
      } else {
        message.warning("目前仅支持CSV格式，请上传.csv文件");
      }
    };
    reader.onerror = () => {
      message.error("文件读取失败");
    };
    reader.readAsText(file);
    return false;
  };

  // 复制JSON
  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonOutput);
    message.success("已复制到剪贴板");
  };

  // 下载JSON
  const handleDownload = () => {
    const blob = new Blob([jsonOutput], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "output.json";
    a.click();
    URL.revokeObjectURL(url);
    message.success("下载成功");
  };

  // 清空
  const handleClear = () => {
    setJsonOutput("");
    setFileList([]);
  };

  return (
    <div className="flex flex-col h-full min-h-full bg-bg-primary overflow-hidden">
      {/* 工具栏 */}
      <header className="h-16 flex-shrink-0 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              disabled={!jsonOutput}
              className="p-2 text-text-tertiary hover:bg-bg-tertiary rounded-lg transition-colors flex items-center gap-1 text-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">
                content_copy
              </span>
              复制
            </button>
            <button
              onClick={handleDownload}
              disabled={!jsonOutput}
              className="p-2 text-text-tertiary hover:bg-bg-tertiary rounded-lg transition-colors flex items-center gap-1 text-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">
                download
              </span>
              下载
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
      </header>

      {/* 内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：上传区域 */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary/50 border-b border-border">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">
              上传 Excel/CSV 文件
            </span>
          </div>
          <div className="flex-1 flex flex-col p-4 overflow-auto">
            <Upload.Dragger
              fileList={fileList}
              beforeUpload={(file) => {
                handleUpload(file);
                setFileList([file as unknown as UploadFile]);
                return false;
              }}
              onRemove={() => {
                setFileList([]);
                setJsonOutput("");
              }}
              accept=".csv"
              maxCount={1}
              className="bg-bg-secondary border-border"
            >
              <p className="text-text-tertiary">
                <span className="material-symbols-outlined text-4xl text-primary">
                  table
                </span>
              </p>
              <p className="text-text-secondary">点击或拖拽文件到此处</p>
              <p className="text-text-tertiary text-xs mt-1">
                目前支持 CSV 格式
              </p>
            </Upload.Dragger>

            <div className="mt-4 p-4 bg-bg-secondary rounded-lg border border-border">
              <h4 className="text-sm font-medium text-text-primary mb-2">
                使用说明
              </h4>
              <ul className="text-xs text-text-tertiary space-y-1 list-disc list-inside">
                <li>上传 CSV 格式的文件</li>
                <li>第一行将被识别为表头</li>
                <li>自动转换为 JSON 数组格式</li>
                <li>支持复制或下载转换结果</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 右侧：输出区域 */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary/50 border-b border-border">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">
              JSON 输出
            </span>
            <span className="text-[11px] text-text-tertiary">
              {jsonOutput ? `${jsonOutput.split("\n").length} Lines` : ""}
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            {jsonOutput ? (
              <pre className="p-4 text-sm font-mono text-text-primary whitespace-pre-wrap">
                {jsonOutput}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-text-tertiary">
                <div className="text-center">
                  <span className="material-symbols-outlined text-4xl opacity-50">
                    code
                  </span>
                  <p className="mt-2">转换结果将显示在这里</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { ExcelToJson };
export default ExcelToJson;
