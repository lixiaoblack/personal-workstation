/**
 * KnowledgeSelectCard - 知识库选择卡片组件
 * 在 AI 消息中内嵌显示，用于让用户选择要添加的知识库
 * 
 * 交互流程：
 * 1. 显示附件信息（文件/图片/URL）
 * 2. 显示"添加到知识库"和"暂不需要"按钮
 * 3. 点击"添加到知识库"后显示知识库列表
 * 4. 选择知识库后禁用（不可修改）
 */
import React, { memo, useState, useCallback } from "react";
import { Button, Tooltip, Spin, Empty } from "antd";
import { FolderOutlined, FileOutlined, LinkOutlined, PictureOutlined, PlusOutlined, CheckOutlined } from "@ant-design/icons";
import type { AttachmentInfo, KnowledgeOption } from "@/types/electron";

interface KnowledgeSelectCardProps {
  /** 附件信息 */
  attachment: AttachmentInfo;
  /** 知识库列表 */
  knowledgeList: KnowledgeOption[];
  /** 是否已选择（禁用状态） */
  selected?: boolean;
  /** 已选择的知识库信息 */
  selectedKnowledge?: {
    id: string;
    name: string;
    selectedAt: number;
  } | null;
  /** 知识库添加结果 */
  addResult?: {
    success: boolean;
    documentName?: string;
    chunkCount?: number;
    error?: string;
  } | null;
  /** 是否正在加载知识库列表 */
  loading?: boolean;
  /** 是否正在处理添加 */
  processing?: boolean;
  /** 点击添加到知识库按钮 */
  onAskAdd?: () => void;
  /** 点击暂不需要 */
  onSkip?: () => void;
  /** 选择知识库 */
  onSelectKnowledge?: (knowledgeId: string) => void;
  /** 点击新建知识库 */
  onCreateKnowledge?: () => void;
}

const KnowledgeSelectCard: React.FC<KnowledgeSelectCardProps> = memo(
  ({
    attachment,
    knowledgeList,
    selected = false,
    selectedKnowledge,
    addResult,
    loading = false,
    processing = false,
    onAskAdd,
    onSkip,
    onSelectKnowledge,
    onCreateKnowledge,
  }) => {
    // 是否显示知识库选择列表
    const [showSelector, setShowSelector] = useState(false);

    // 获取附件图标
    const getAttachmentIcon = useCallback(() => {
      switch (attachment.type) {
        case "file":
          return <FileOutlined className="text-lg" />;
        case "image":
          return <PictureOutlined className="text-lg" />;
        case "url":
          return <LinkOutlined className="text-lg" />;
        default:
          return <FileOutlined className="text-lg" />;
      }
    }, [attachment.type]);

    // 格式化文件大小
    const formatSize = useCallback((bytes?: number) => {
      if (!bytes) return "";
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }, []);

    // 处理添加按钮点击
    const handleAddClick = useCallback(() => {
      setShowSelector(true);
      onAskAdd?.();
    }, [onAskAdd]);

    // 处理知识库选择
    const handleSelectKnowledge = useCallback(
      (knowledge: KnowledgeOption) => {
        onSelectKnowledge?.(knowledge.id);
      },
      [onSelectKnowledge]
    );

    // 已选择状态
    if (selected && selectedKnowledge) {
      return (
        <div className="bg-bg-secondary border border-border rounded-lg p-4 max-w-md">
          {/* 附件信息 */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
              {getAttachmentIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">
                {attachment.name}
              </div>
              {attachment.size && (
                <div className="text-xs text-text-tertiary">
                  {formatSize(attachment.size)}
                </div>
              )}
            </div>
          </div>

          {/* 已选知识库 */}
          <div className="flex items-center gap-2 p-2 bg-success/10 rounded border border-success/20">
            <CheckOutlined className="text-success" />
            <span className="text-sm text-success">已添加到「{selectedKnowledge.name}」</span>
          </div>

          {/* 添加结果 */}
          {addResult && (
            <div className="mt-2 text-xs text-text-tertiary">
              {addResult.success ? (
                <span>文档分块: {addResult.chunkCount} 个</span>
              ) : (
                <span className="text-error">{addResult.error}</span>
              )}
            </div>
          )}
        </div>
      );
    }

    // 处理中状态
    if (processing) {
      return (
        <div className="bg-bg-secondary border border-border rounded-lg p-4 max-w-md">
          <div className="flex items-center justify-center gap-3 py-4">
            <Spin size="small" />
            <span className="text-sm text-text-secondary">正在添加到知识库...</span>
          </div>
        </div>
      );
    }

    // 显示知识库选择列表
    if (showSelector) {
      return (
        <div className="bg-bg-secondary border border-border rounded-lg p-4 max-w-md">
          {/* 标题 */}
          <div className="text-sm font-medium text-text-primary mb-3">
            选择要存储到的知识库：
          </div>

          {/* 加载中 */}
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Spin size="small" tip="加载知识库..." />
            </div>
          ) : knowledgeList.length === 0 ? (
            <Empty
              description="暂无知识库"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              className="py-4"
            >
              <Button type="primary" size="small" onClick={onCreateKnowledge}>
                创建知识库
              </Button>
            </Empty>
          ) : (
            <>
              {/* 知识库列表 */}
              <div className="space-y-2 max-h-60 overflow-auto mb-3">
                {knowledgeList.map((kb) => (
                  <div
                    key={kb.id}
                    onClick={() => handleSelectKnowledge(kb)}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-bg-tertiary border border-transparent hover:border-primary/30 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <FolderOutlined />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">
                        {kb.name}
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {kb.documentCount} 个文档
                        {kb.description && ` · ${kb.description}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 新建知识库按钮 */}
              {onCreateKnowledge && (
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={onCreateKnowledge}
                  className="border-dashed"
                >
                  新建知识库
                </Button>
              )}
            </>
          )}
        </div>
      );
    }

    // 初始状态：询问是否添加
    return (
      <div className="bg-bg-secondary border border-border rounded-lg p-4 max-w-md">
        {/* 附件信息 */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {getAttachmentIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <Tooltip title={attachment.name}>
              <div className="text-sm font-medium text-text-primary truncate">
                {attachment.name}
              </div>
            </Tooltip>
            {attachment.size && (
              <div className="text-xs text-text-tertiary">
                {formatSize(attachment.size)}
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <Button type="primary" size="small" onClick={handleAddClick}>
            添加到知识库
          </Button>
          {onSkip && (
            <Button size="small" onClick={onSkip}>
              暂不需要
            </Button>
          )}
        </div>
      </div>
    );
  }
);

KnowledgeSelectCard.displayName = "KnowledgeSelectCard";

export default KnowledgeSelectCard;
