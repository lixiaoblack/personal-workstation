/**
 * 知识库头部组件
 * 显示知识库详情和搜索栏
 */
import React from "react";
import { Input, Button, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { KnowledgeInfo } from "@/types/electron";

interface KnowledgeHeaderProps {
  knowledge: KnowledgeInfo;
  searchQuery: string;
  searching: boolean;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
}

const KnowledgeHeader: React.FC<KnowledgeHeaderProps> = ({
  knowledge,
  searchQuery,
  searching,
  onSearchChange,
  onSearch,
}) => {
  return (
    <header className="p-6 border-b border-border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{knowledge.name}</h1>
          {knowledge.description && (
            <p className="text-text-secondary text-sm mt-1">
              {knowledge.description}
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <Tag>{knowledge.embeddingModelName}</Tag>
            <Tag className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              {knowledge.documentCount} 个文档
            </Tag>
            {knowledge.storagePath && (
              <Tag className="bg-primary/10 text-primary border-primary/20">
                {knowledge.storagePath}
              </Tag>
            )}
          </div>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <Input
            className="pl-10"
            placeholder="搜索知识库内容..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onPressEnter={onSearch}
          />
        </div>
        <Button
          type="primary"
          icon={<SearchOutlined />}
          loading={searching}
          onClick={onSearch}
        >
          搜索
        </Button>
      </div>
    </header>
  );
};

export default KnowledgeHeader;
