/**
 * 知识库文档列表组件
 * 显示知识库中的文档，支持预览和删除
 */
import React from "react";
import { Table, Button, Popconfirm, Empty, Spin, Tag } from "antd";
import {
  DeleteOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  CodeOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import type { KnowledgeDocumentInfo } from "@/types/electron";
import { formatFileSize } from "../../config";

// OCR 文字块类型
interface OcrBlock {
  text: string;
  confidence: number;
  box: number[][];
}

// 文档状态类型
type DocStatus = "ready" | "processing" | "error";

// 文档展示信息（扩展状态）
export interface DocumentDisplayInfo extends KnowledgeDocumentInfo {
  status?: DocStatus;
  ocrBlocks?: string | OcrBlock[];
}

// 状态标签组件
const StatusTag: React.FC<{ status: DocStatus }> = ({ status }) => {
  switch (status) {
    case "ready":
      return (
        <Tag className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
          已就绪
        </Tag>
      );
    case "processing":
      return (
        <Tag className="bg-primary/10 text-primary border-primary/20">
          处理中
        </Tag>
      );
    case "error":
      return (
        <Tag className="bg-red-500/10 text-red-500 border-red-500/20">
          处理失败
        </Tag>
      );
    default:
      return null;
  }
};

// 获取文件图标
const getFileIcon = (fileType: string) => {
  switch (fileType.toLowerCase()) {
    case ".pdf":
      return <FilePdfOutlined className="text-red-400 text-lg" />;
    case ".md":
      return <FileTextOutlined className="text-blue-400 text-lg" />;
    case ".txt":
      return <FileTextOutlined className="text-slate-400 text-lg" />;
    case ".json":
    case ".html":
      return <CodeOutlined className="text-green-400 text-lg" />;
    case ".jpg":
    case ".jpeg":
    case ".png":
    case ".gif":
    case ".webp":
      return <FileTextOutlined className="text-purple-400 text-lg" />;
    default:
      return <FileTextOutlined className="text-slate-400 text-lg" />;
  }
};

interface KnowledgeDocumentListProps {
  documents: DocumentDisplayInfo[];
  loading: boolean;
  onDelete: (documentId: string) => void;
  onPreview: (document: DocumentDisplayInfo) => void;
}

const KnowledgeDocumentList: React.FC<KnowledgeDocumentListProps> = ({
  documents,
  loading,
  onDelete,
  onPreview,
}) => {
  const columns = [
    {
      title: "文件名称",
      dataIndex: "fileName",
      key: "fileName",
      render: (name: string, record: DocumentDisplayInfo) => (
        <div className="flex items-center gap-3">
          {getFileIcon(record.fileType)}
          <div>
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-text-tertiary">
              {formatFileSize(record.fileSize)}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "类型",
      dataIndex: "fileType",
      key: "fileType",
      width: 120,
      render: (type: string) => (
        <span className="text-sm text-text-secondary italic">
          {type.toUpperCase().replace(".", "")} 文档
        </span>
      ),
    },
    {
      title: "分块数",
      dataIndex: "chunkCount",
      key: "chunkCount",
      width: 100,
      render: (count: number) => (
        <span className="text-sm text-text-secondary">{count} 个</span>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: DocStatus) => <StatusTag status={status} />,
    },
    {
      title: "上传日期",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (time: number) => (
        <span className="text-sm text-text-tertiary">
          {new Date(time).toLocaleDateString()}
        </span>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 120,
      render: (_: unknown, record: DocumentDisplayInfo) => (
        <div className="flex gap-2">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => onPreview(record)}
            title="预览文件"
          />
          <Popconfirm
            title="确定删除此文档？"
            onConfirm={() => onDelete(record.id)}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              className="opacity-0 group-hover:opacity-100"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <p className="text-sm font-semibold text-text-secondary mb-4">文档列表</p>
      <Spin spinning={loading}>
        {documents.length === 0 ? (
          <Empty description="暂无文档，拖拽文件上传" />
        ) : (
          <Table
            dataSource={documents}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="middle"
            className="document-table"
            rowClassName={() => "group hover:bg-bg-tertiary"}
          />
        )}
      </Spin>
    </div>
  );
};

export default KnowledgeDocumentList;
