/**
 * AIChatEmptyState - 空状态组件
 * 显示欢迎页面和快捷操作
 */
import React, { memo } from "react";
import { useNavigate } from "react-router-dom";
import type { ModelConfig } from "@/types/electron";

interface AIChatEmptyStateProps {
  llmModels: ModelConfig[];
  onSelectSuggestion: (suggestion: string) => void;
}

const AIChatEmptyState: React.FC<AIChatEmptyStateProps> = memo(
  ({ llmModels, onSelectSuggestion }) => {
    const navigate = useNavigate();

    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-4xl text-primary">
            smart_toy
          </span>
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          开始与 AI 对话
        </h3>
        <p className="text-sm text-text-tertiary max-w-md mb-6">
          {llmModels.length > 0
            ? "我是一个智能助手，可以帮助您解答问题、编写代码、分析数据等。"
            : "请先在设置中配置模型，才能开始对话。"}
        </p>
        {llmModels.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              "帮我写一段 Python 代码",
              "解释什么是闭包",
              "如何优化 SQL 查询",
            ].map((suggestion) => (
              <button
                key={suggestion}
                className="px-4 py-2 rounded-full border border-border hover:border-primary hover:text-primary text-text-tertiary text-sm transition-all"
                onClick={() => onSelectSuggestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {llmModels.length === 0 && (
          <button
            className="px-6 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-hover transition-colors"
            onClick={() => navigate("/settings/ai")}
          >
            前往配置模型
          </button>
        )}
      </div>
    );
  }
);

AIChatEmptyState.displayName = "AIChatEmptyState";

export default AIChatEmptyState;
