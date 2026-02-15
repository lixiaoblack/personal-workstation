/**
 * OcrTool OCR功能页面
 */
import React, { useState } from "react";
import { App, Upload } from "antd";
import type { UploadFile } from "antd";

const OcrTool: React.FC = () => {
  const { message } = App.useApp();
  const [imagePreview, setImagePreview] = useState("");
  const [ocrResult, setOcrResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 模拟OCR识别（实际项目中需要接入OCR服务）
  const handleOcr = (file: File) => {
    setLoading(true);

    // 预览图片
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 模拟OCR处理
    setTimeout(() => {
      setOcrResult(
        "【OCR识别结果】\n\n" +
        "这是一个模拟的OCR识别结果。\n\n" +
        "实际使用时，需要接入以下OCR服务之一：\n" +
        "1. 百度OCR API\n" +
        "2. 腾讯云OCR\n" +
        "3. 阿里云OCR\n" +
        "4. Google Cloud Vision\n" +
        "5. Tesseract.js (本地识别)\n\n" +
        `文件名: ${file.name}\n` +
        `文件大小: ${(file.size / 1024).toFixed(2)} KB`
      );
      setLoading(false);
      message.info("OCR识别完成（模拟结果）");
    }, 1500);

    return false;
  };

  // 复制结果
  const handleCopy = async () => {
    await navigator.clipboard.writeText(ocrResult);
    message.success("已复制到剪贴板");
  };

  // 清空
  const handleClear = () => {
    setImagePreview("");
    setOcrResult("");
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
              disabled={!ocrResult}
              className="p-2 text-text-tertiary hover:bg-bg-tertiary rounded-lg transition-colors flex items-center gap-1 text-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">content_copy</span>
              复制结果
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">
            当前为模拟模式，需接入OCR服务
          </span>
        </div>
      </header>

      {/* 内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：图片上传 */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary/50 border-b border-border">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">
              上传图片
            </span>
          </div>
          <div className="flex-1 flex flex-col p-4 overflow-auto">
            {!imagePreview ? (
              <Upload.Dragger
                fileList={fileList}
                beforeUpload={(file) => {
                  handleOcr(file);
                  setFileList([file as unknown as UploadFile]);
                  return false;
                }}
                onRemove={() => {
                  setFileList([]);
                  setImagePreview("");
                  setOcrResult("");
                }}
                accept="image/*"
                maxCount={1}
                className="bg-bg-secondary border-border h-full flex items-center justify-center"
              >
                <p className="text-text-tertiary">
                  <span className="material-symbols-outlined text-4xl text-primary">
                    document_scanner
                  </span>
                </p>
                <p className="text-text-secondary">点击或拖拽图片到此处</p>
                <p className="text-text-tertiary text-xs mt-1">
                  支持 PNG、JPG、BMP 格式
                </p>
              </Upload.Dragger>
            ) : (
              <div className="flex-1 bg-bg-secondary border border-border rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="预览"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
          </div>
        </div>

        {/* 右侧：识别结果 */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary/50 border-b border-border">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">
              识别结果
            </span>
            {loading && (
              <span className="text-xs text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm animate-spin">
                  progress_activity
                </span>
                识别中...
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4">
            {ocrResult ? (
              <pre className="text-sm font-mono text-text-primary whitespace-pre-wrap">
                {ocrResult}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-text-tertiary">
                <div className="text-center">
                  <span className="material-symbols-outlined text-4xl opacity-50">
                    text_fields
                  </span>
                  <p className="mt-2">识别结果将显示在这里</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { OcrTool };
export default OcrTool;
