/**
 * ToolSelector 工具选择器组件
 *
 * 功能：
 * 1. 显示可用工具列表
 * 2. 多选开关
 * 3. 已选工具标签展示
 * 4. 工具说明
 */
import React from "react";
import { AVAILABLE_TOOLS } from "../../../config";

export interface ToolSelectorValue {
  tools: string[];
}

interface ToolSelectorProps {
  value: ToolSelectorValue;
  onChange: (value: ToolSelectorValue) => void;
}

const ToolSelector: React.FC<ToolSelectorProps> = ({ value, onChange }) => {
  // 切换工具选择
  const toggleTool = (toolId: string) => {
    const currentTools = value.tools || [];
    const newTools = currentTools.includes(toolId)
      ? currentTools.filter((t) => t !== toolId)
      : [...currentTools, toolId];
    onChange({ tools: newTools });
  };

  // 全选/取消全选
  const toggleAll = () => {
    const allIds = AVAILABLE_TOOLS.map((t) => t.id);
    const allSelected = allIds.every((id) => value.tools?.includes(id));
    onChange({ tools: allSelected ? [] : allIds });
  };

  const allIds = AVAILABLE_TOOLS.map((t) => t.id);
  const allSelected = allIds.every((id) => value.tools?.includes(id));
  const someSelected = allIds.some((id) => value.tools?.includes(id));

  return (
    <div className="bg-bg-secondary rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-text-primary">可用工具</h3>
        <button
          type="button"
          onClick={toggleAll}
          className="text-sm text-primary hover:text-primary-hover"
        >
          {allSelected ? "取消全选" : someSelected ? "全选" : "全选"}
        </button>
      </div>

      <div className="space-y-2">
        {AVAILABLE_TOOLS.map((tool) => {
          const isSelected = value.tools?.includes(tool.id);
          return (
            <div
              key={tool.id}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? "bg-primary/10 border border-primary/50"
                  : "bg-bg-tertiary border border-transparent hover:border-border"
              }`}
              onClick={() => toggleTool(tool.id)}
            >
              <div>
                <div className="text-sm font-medium text-text-primary">
                  {tool.name}
                </div>
                <div className="text-xs text-text-tertiary">
                  {tool.description}
                </div>
              </div>
              <span className="material-symbols-outlined text-primary">
                {isSelected ? "check_box" : "check_box_outline_blank"}
              </span>
            </div>
          );
        })}
      </div>

      {value.tools && value.tools.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs text-text-tertiary mb-2">
            已选择 {value.tools.length} 个工具
          </div>
          <div className="flex flex-wrap gap-1">
            {value.tools.map((toolId) => {
              const tool = AVAILABLE_TOOLS.find((t) => t.id === toolId);
              return tool ? (
                <span
                  key={toolId}
                  className="text-xs px-2 py-1 rounded bg-primary/10 text-primary"
                >
                  {tool.name}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export { ToolSelector };
