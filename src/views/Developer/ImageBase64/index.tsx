/**
 * ImageBase64 图片与Base64相互转换页面
 */
import React, { useState } from "react";
import { App, Upload } from "antd";
import type { UploadFile } from "antd";

const ImageBase64: React.FC = () => {
  const { message } = App.useApp();
  const [base64Output, setBase64Output] = useState("");
  const [base64Input, setBase64Input] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 图片转Base64
  const handleImageToBase64 = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setBase64Output(result);
      message.success("转换成功");
    };
    reader.onerror = () => {
      message.error("转换失败");
    };
    reader.readAsDataURL(file);
    return false;
  };

  // Base64转图片
  const handleBase64ToImage = () => {
    if (!base64Input) {
      message.warning("请输入Base64字符串");
      return;
    }
    try {
      // 如果是纯base64，添加前缀
      let base64Str = base64Input.trim();
      if (!base64Str.startsWith("data:image")) {
        base64Str = `data:image/png;base64,${base64Str}`;
      }
      setPreviewImage(base64Str);
      message.success("预览成功");
    } catch {
      message.error("Base64格式错误");
    }
  };

  // 复制Base64
  const handleCopy = async () => {
    if (base64Output) {
      await navigator.clipboard.writeText(base64Output);
      message.success("已复制到剪贴板");
    }
  };

  // 清空
  const handleClear = () => {
    setBase64Output("");
    setBase64Input("");
    setPreviewImage("");
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
              disabled={!base64Output}
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
      </header>

      {/* 双面板容器 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：图片转Base64 */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary/50 border-b border-border">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">
              图片转 Base64
            </span>
          </div>
          <div className="flex-1 flex flex-col p-4 gap-4 overflow-auto">
            <Upload.Dragger
              fileList={fileList}
              beforeUpload={(file) => {
                handleImageToBase64(file);
                setFileList([file as unknown as UploadFile]);
                return false;
              }}
              onRemove={() => {
                setFileList([]);
                setBase64Output("");
              }}
              accept="image/*"
              maxCount={1}
              className="bg-bg-secondary border-border"
            >
              <p className="text-text-tertiary">
                <span className="material-symbols-outlined text-4xl text-primary">cloud_upload</span>
              </p>
              <p className="text-text-secondary">点击或拖拽图片到此处</p>
              <p className="text-text-tertiary text-xs mt-1">支持 PNG、JPG、GIF、WebP 格式</p>
            </Upload.Dragger>
            
            {base64Output && (
              <div className="flex-1 relative">
                <textarea
                  value={base64Output}
                  readOnly
                  className="w-full h-full bg-bg-secondary border border-border rounded-lg p-3 text-xs font-mono text-text-primary resize-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* 右侧：Base64转图片 */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary/50 border-b border-border">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">
              Base64 转图片
            </span>
          </div>
          <div className="flex-1 flex flex-col p-4 gap-4 overflow-auto">
            <textarea
              value={base64Input}
              onChange={(e) => setBase64Input(e.target.value)}
              placeholder="在此粘贴Base64字符串..."
              className="w-full h-40 bg-bg-secondary border border-border rounded-lg p-3 text-xs font-mono text-text-primary resize-none"
            />
            <button
              onClick={handleBase64ToImage}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-all"
            >
              <span className="material-symbols-outlined text-lg">image</span>
              预览图片
            </button>
            
            {previewImage && (
              <div className="flex-1 bg-bg-secondary border border-border rounded-lg p-4 flex items-center justify-center overflow-auto">
                <img
                  src={previewImage}
                  alt="预览"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { ImageBase64 };
export default ImageBase64;
