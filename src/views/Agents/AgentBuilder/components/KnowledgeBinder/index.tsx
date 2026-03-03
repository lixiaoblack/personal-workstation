/**
 * KnowledgeBinder 知识库绑定组件
 *
 * 功能：
 * 1. 显示知识库列表
 * 2. 多选绑定
 * 3. 显示绑定状态
 */
import React, { useEffect, useState } from "react";
import { Spin, Empty } from "antd";
import type { KnowledgeInfo } from "@/types/electron";

export interface KnowledgeBinderValue {
  knowledge_ids: string[];
}

interface KnowledgeBinderProps {
  value: KnowledgeBinderValue;
  onChange: (value: KnowledgeBinderValue) => void;
}

const KnowledgeBinder: React.FC<KnowledgeBinderProps> = ({
  value,
  onChange,
}) => {
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载知识库列表
  useEffect(() => {
    const loadKnowledge = async () => {
      setLoading(true);
      try {
        const result = await window.electronAPI.listKnowledge();
        if (result.success) {
          setKnowledgeList(result.knowledge);
        }
      } catch (error) {
        console.error("加载知识库列表失败:", error);
      } finally {
        setLoading(false);
      }
    };
    loadKnowledge();
  }, []);

  // 切换知识库选择
  const toggleKnowledge = (knowledgeId: string) => {
    const currentIds = value.knowledge_ids || [];
    const newIds = currentIds.includes(knowledgeId)
      ? currentIds.filter((id) => id !== knowledgeId)
      : [...currentIds, knowledgeId];
    onChange({ knowledge_ids: newIds });
  };

  return (
    <div className="bg-bg-secondary rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-text-primary">知识库绑定</h3>
        {value.knowledge_ids && value.knowledge_ids.length > 0 && (
          <span className="text-sm text-text-tertiary">
            已绑定 {value.knowledge_ids.length} 个
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spin />
        </div>
      ) : knowledgeList.length === 0 ? (
        <Empty description="暂无知识库" image={Empty.PRESENTED_IMAGE_SIMPLE}>
          <a href="#/knowledge" className="text-primary text-sm">
            去创建知识库
          </a>
        </Empty>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {knowledgeList.map((kb) => {
            const isSelected = value.knowledge_ids?.includes(kb.id);
            return (
              <div
                key={kb.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? "bg-primary/10 border border-primary/50"
                    : "bg-bg-tertiary border border-transparent hover:border-border"
                }`}
                onClick={() => toggleKnowledge(kb.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">
                    database
                  </span>
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {kb.name}
                    </div>
                    {kb.description && (
                      <div className="text-xs text-text-tertiary truncate max-w-48">
                        {kb.description}
                      </div>
                    )}
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary">
                  {isSelected ? "check_box" : "check_box_outline_blank"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {!loading && knowledgeList.length > 0 && (
        <div className="mt-3 text-xs text-text-tertiary">
          选择知识库后，智能体可以从知识库中检索相关信息
        </div>
      )}
    </div>
  );
};

export { KnowledgeBinder };
