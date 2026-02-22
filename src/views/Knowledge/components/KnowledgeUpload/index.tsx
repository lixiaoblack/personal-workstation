/**
 * 知识库文件上传组件
 * 支持点击和拖拽上传文件
 *
 * - 点击：触发 Electron 原生文件选择对话框
 * - 拖拽：直接获取文件路径（Electron 特有能力）
 */
import React, { useCallback } from "react";
import { Progress, message } from "antd";
import { CloudUploadOutlined } from "@ant-design/icons";

interface KnowledgeUploadProps {
  uploading: boolean;
  uploadProgress: number;
  onUpload: () => Promise<boolean>;
  onDropFile?: (filePath: string) => Promise<boolean>;
}

const KnowledgeUpload: React.FC<KnowledgeUploadProps> = ({
  uploading,
  uploadProgress,
  onUpload,
  onDropFile,
}) => {
  // 处理拖拽进入
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // 处理文件拖放
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (uploading) return;

      const files = e.dataTransfer.files;
      if (files.length === 0) return;

      // Electron 中可以通过 file.path 获取本地文件路径
      const file = files[0] as File & { path?: string };
      const filePath = file.path;

      if (!filePath) {
        message.warning("无法获取文件路径，请使用点击选择文件");
        return;
      }

      // 如果提供了 onDropFile 回调，使用它；否则使用默认的 onUpload
      if (onDropFile) {
        await onDropFile(filePath);
      } else {
        await onUpload();
      }
    },
    [uploading, onDropFile, onUpload]
  );

  // 点击触发文件选择
  const handleClick = async () => {
    if (uploading) return;
    await onUpload();
  };

  return (
    <div className="mb-8">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          bg-bg-secondary border-2 border-dashed border-border rounded-lg p-8
          transition-colors cursor-pointer text-center
          ${uploading ? "pointer-events-none" : "hover:border-primary/50"}
        `}
      >
        {uploading ? (
          <div className="py-4">
            <Progress
              percent={uploadProgress}
              status="active"
              className="max-w-xs mx-auto"
            />
            <p className="mt-2 text-text-secondary">正在处理文档...</p>
          </div>
        ) : (
          <div className="py-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
              <CloudUploadOutlined className="text-2xl" />
            </div>
            <p className="font-medium">点击选择或拖拽文件到此处上传</p>
            <p className="text-sm text-text-tertiary mt-1">
              支持 PDF, Markdown, TXT, JSON, HTML, Word, 图片
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeUpload;
