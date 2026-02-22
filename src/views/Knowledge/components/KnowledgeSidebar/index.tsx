/**
 * 知识库侧边栏组件
 * 显示知识库列表，支持选择和删除
 */
import React from "react";
import { Button, Empty, Spin, Popconfirm } from "antd";
import { PlusOutlined, DeleteOutlined, DatabaseOutlined } from "@ant-design/icons";
import type { KnowledgeInfo } from "@/types/electron";

interface KnowledgeSidebarProps {
  knowledgeList: KnowledgeInfo[];
  selectedKnowledge: KnowledgeInfo | null;
  loading: boolean;
  onSelect: (knowledge: KnowledgeInfo) => void;
  onDelete: (knowledgeId: string) => void;
  onCreate: () => void;
}

const KnowledgeSidebar: React.FC<KnowledgeSidebarProps> = ({
  knowledgeList,
  selectedKnowledge,
  loading,
  onSelect,
  onDelete,
  onCreate,
}) => {
  return (
    <aside className="w-64 border-r border-border flex flex-col bg-bg-secondary">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <DatabaseOutlined className="text-primary" />
          知识库
        </h2>
      </div>

      <Spin spinning={loading}>
        <div className="flex-1 p-4 overflow-y-auto">
          {knowledgeList.length === 0 ? (
            <Empty description="暂无知识库" className="mt-8" />
          ) : (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3 px-2">
                全部知识库
              </p>
              {knowledgeList.map((item) => (
                <div
                  key={item.id}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    selectedKnowledge?.id === item.id
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:bg-bg-tertiary"
                  }`}
                  onClick={() => onSelect(item)}
                >
                  <DatabaseOutlined className="text-sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-text-tertiary">
                      {item.documentCount} 个文档
                    </p>
                  </div>
                  <Popconfirm
                    title="确定删除此知识库？"
                    description="删除后数据无法恢复"
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      onDelete(item.id);
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                      className="opacity-0 hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popconfirm>
                </div>
              ))}
            </div>
          )}
        </div>
      </Spin>

      <div className="p-4 border-t border-border">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="w-full"
          onClick={onCreate}
        >
          新建知识库
        </Button>
      </div>
    </aside>
  );
};

export default KnowledgeSidebar;
