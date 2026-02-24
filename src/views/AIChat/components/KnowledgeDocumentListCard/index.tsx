/**
 * KnowledgeDocumentListCard - 知识库文档列表卡片组件
 * 在 AI 消息中内嵌显示，展示知识库文档列表，支持预览
 *
 * 功能：
 * - 以表格形式展示文档列表
 * - 支持点击预览文件
 * - 集成 WFilePreview 组件
 */
import React, { memo, useState, useMemo } from "react";
import { Table, Button, Empty, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  CodeOutlined,
  EyeOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import WFilePreview from "@/components/WFilePreview";

// 文档数据类型
export interface DocumentItem {
  id: string;
  knowledgeId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  chunkCount: number;
  /** OCR 识别结果（仅图片类型有效） */
  ocrText?: string;
  /** OCR 边界框信息（JSON 字符串或数组） */
  ocrBlocks?:
    | string
    | Array<{ text: string; confidence: number; box: number[][] }>;
  createdAt: number;
}

interface KnowledgeDocumentListCardProps {
  /** 知识库 ID */
  knowledgeId?: string;
  /** 文档列表 */
  documents: DocumentItem[];
  /** 知识库名称 */
  knowledgeName?: string;
}

// 获取文件图标
const getFileIcon = (fileType: string) => {
  const ext = fileType.toLowerCase().replace(".", "");

  if (["pdf"].includes(ext)) {
    return <FilePdfOutlined className="text-red-400" />;
  }
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) {
    return <FileImageOutlined className="text-purple-400" />;
  }
  if (["md", "markdown"].includes(ext)) {
    return <FileTextOutlined className="text-blue-400" />;
  }
  if (
    [
      "js",
      "jsx",
      "ts",
      "tsx",
      "py",
      "java",
      "c",
      "cpp",
      "go",
      "rs",
      "css",
      "html",
      "json",
      "yaml",
      "yml",
    ].includes(ext)
  ) {
    return <CodeOutlined className="text-green-400" />;
  }

  return <FileTextOutlined className="text-slate-400" />;
};

// 格式化文件大小
const formatFileSize = (size: number): string => {
  if (size < 1024) {
    return `${size} B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  } else if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
};

// 格式化日期
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const KnowledgeDocumentListCard: React.FC<KnowledgeDocumentListCardProps> =
  memo(({ documents, knowledgeName }) => {
    // 预览状态
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewFile, setPreviewFile] = useState<{
      path: string;
      name: string;
      type: string;
      ocrText?: string;
      ocrBlocks?: string;
    } | null>(null);

    // 点击预览
    const handlePreview = (record: DocumentItem) => {
      setPreviewFile({
        path: record.filePath,
        name: record.fileName,
        type: record.fileType,
        ocrText: record.ocrText,
        ocrBlocks:
          typeof record.ocrBlocks === "string"
            ? record.ocrBlocks
            : record.ocrBlocks
            ? JSON.stringify(record.ocrBlocks)
            : undefined,
      });
      setPreviewVisible(true);
    };

    // 关闭预览
    const handleClosePreview = () => {
      setPreviewVisible(false);
      setPreviewFile(null);
    };

    // 表格列配置
    const columns: ColumnsType<DocumentItem> = useMemo(
      () => [
        {
          title: "文件名称",
          dataIndex: "fileName",
          key: "fileName",
          ellipsis: true,
          render: (name: string, record: DocumentItem) => (
            <div className="flex items-center gap-2">
              {getFileIcon(record.fileType)}
              <Tooltip title={name}>
                <span className="truncate max-w-[200px]">{name}</span>
              </Tooltip>
            </div>
          ),
        },
        {
          title: "类型",
          dataIndex: "fileType",
          key: "fileType",
          width: 80,
          render: (type: string) => (
            <span className="text-xs text-text-secondary italic">
              {type.toUpperCase().replace(".", "")}
            </span>
          ),
        },
        {
          title: "大小",
          dataIndex: "fileSize",
          key: "fileSize",
          width: 100,
          render: (size: number) => (
            <span className="text-sm text-text-secondary">
              {formatFileSize(size)}
            </span>
          ),
        },
        {
          title: "分块数",
          dataIndex: "chunkCount",
          key: "chunkCount",
          width: 80,
          render: (count: number) => (
            <span className="text-sm text-text-secondary">{count}</span>
          ),
        },
        {
          title: "上传日期",
          dataIndex: "createdAt",
          key: "createdAt",
          width: 100,
          render: (timestamp: number) => (
            <span className="text-sm text-text-secondary">
              {formatDate(timestamp)}
            </span>
          ),
        },
        {
          title: "操作",
          key: "action",
          width: 80,
          render: (_: unknown, record: DocumentItem) => (
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
              className="text-primary hover:text-primary-hover"
            >
              预览
            </Button>
          ),
        },
      ],
      []
    );

    if (!documents || documents.length === 0) {
      return (
        <div className="bg-bg-secondary border border-border rounded-lg p-4 max-w-2xl">
          <Empty description="暂无文档" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      );
    }

    return (
      <div className="bg-bg-secondary border border-border rounded-lg p-4 max-w-2xl">
        {/* 头部 */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
          <DatabaseOutlined className="text-primary" />
          <span className="text-sm font-medium text-text-primary">
            知识库文档列表
          </span>
          {knowledgeName && (
            <span className="text-xs text-text-tertiary">
              ({knowledgeName})
            </span>
          )}
          <span className="text-xs text-text-tertiary ml-auto">
            共 {documents.length} 个文档
          </span>
        </div>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={documents}
          rowKey="id"
          size="small"
          pagination={documents.length > 10 ? { pageSize: 10 } : false}
          className="document-list-table"
          scroll={{ x: 600 }}
        />

        {/* 提示 */}
        <div className="mt-3 pt-3 border-t border-border text-xs text-text-tertiary">
          💡 点击"预览"按钮可查看文档内容
        </div>

        {/* 文件预览弹窗 */}
        {previewFile && (
          <WFilePreview
            visible={previewVisible}
            filePath={previewFile.path}
            fileName={previewFile.name}
            fileType={previewFile.type}
            onClose={handleClosePreview}
            ocrText={previewFile.ocrText}
            ocrBlocks={previewFile.ocrBlocks}
          />
        )}
      </div>
    );
  });

KnowledgeDocumentListCard.displayName = "KnowledgeDocumentListCard";

export default KnowledgeDocumentListCard;
