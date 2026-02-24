/**
 * TagSelector - 通用标签选择器
 * 支持通过触发符号（如 '/', '#', '@'）打开选择面板
 * 选中后变成 Tag 显示，可删除
 *
 * 使用示例：
 * <TagSelector
 *   triggers={{
 *     '/': { getItems: getKnowledgeItems, placeholder: '选择知识库' },
 *     '#': { getItems: getTopicItems, placeholder: '选择话题' },
 *   }}
 *   value={tags}
 *   onChange={setTags}
 * />
 */
import React, { memo, useState, useCallback } from "react";
import { Tag, Input } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { Suggestion } from "@ant-design/x";
import type { SuggestionItem } from "@ant-design/x/es/suggestion";

export interface TagItem {
  /** 唯一标识 */
  id: string;
  /** 显示标签 */
  label: string;
  /** 类型（用于区分不同触发符号的项目） */
  type: string;
  /** 触发符号 */
  trigger: string;
  /** 额外数据 */
  data?: Record<string, unknown>;
}

export interface TriggerConfig {
  /** 获取建议项列表 */
  getItems: (keyword: string) => SuggestionItem[];
  /** 占位提示 */
  placeholder?: string;
}

export interface TagSelectorProps {
  /** 触发配置 */
  triggers: Record<string, TriggerConfig>;
  /** 当前选中的标签 */
  value: TagItem[];
  /** 标签变化回调 */
  onChange: (tags: TagItem[]) => void;
  /** 输入框占位符 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 输入框值 */
  inputValue?: string;
  /** 输入框变化回调 */
  onInputChange?: (value: string) => void;
  /** 自定义样式 */
  className?: string;
}

const TagSelector: React.FC<TagSelectorProps> = memo(
  ({
    triggers,
    value = [],
    onChange,
    placeholder = "输入 / 选择知识库，# 选择话题",
    disabled = false,
    inputValue = "",
    onInputChange,
    className = "",
  }) => {
    // 当前激活的触发符号
    const [activeTrigger, setActiveTrigger] = useState<string | null>(null);

    // 根据 activeTrigger 获取当前的 trigger 配置
    const currentTrigger = activeTrigger ? triggers[activeTrigger] : null;

    // 构建 Suggestion items
    const getSuggestionItems = useCallback(
      (info?: string) => {
        if (!currentTrigger || !info) return [];

        // info 格式："/" 或 "/关键词"
        const keyword = info.startsWith(activeTrigger!)
          ? info.slice(1).toLowerCase()
          : info?.toLowerCase() || "";

        return currentTrigger.getItems(keyword);
      },
      [currentTrigger, activeTrigger]
    );

    // 处理选择
    const handleSelect = useCallback(
      (selectedValue: string) => {
        if (!activeTrigger) return;

        // 解析选择值
        // 格式：label|id （由 getItems 生成）
        const [label, id] = selectedValue.split("|::|");

        const newTag: TagItem = {
          id: id || label,
          label,
          type: activeTrigger === "/" ? "knowledge" : "topic",
          trigger: activeTrigger,
        };

        // 检查是否已存在
        if (
          !value.find((t) => t.id === newTag.id && t.trigger === newTag.trigger)
        ) {
          onChange([...value, newTag]);
        }

        // 清空输入
        onInputChange?.("");
        setActiveTrigger(null);
      },
      [activeTrigger, value, onChange, onInputChange]
    );

    // 删除标签
    const handleRemoveTag = useCallback(
      (tagId: string, trigger: string) => {
        onChange(
          value.filter((t) => !(t.id === tagId && t.trigger === trigger))
        );
      },
      [value, onChange]
    );

    // 处理输入变化
    const handleInputChange = useCallback(
      (val: string) => {
        onInputChange?.(val);

        // 检测触发符号
        const triggerKeys = Object.keys(triggers);
        let foundTrigger: string | null = null;

        for (const key of triggerKeys) {
          if (val.includes(key)) {
            foundTrigger = key;
            break;
          }
        }

        if (foundTrigger && !activeTrigger) {
          setActiveTrigger(foundTrigger);
        } else if (!foundTrigger && activeTrigger) {
          setActiveTrigger(null);
        }
      },
      [triggers, activeTrigger, onInputChange]
    );

    // 渲染标签
    const renderTags = () => (
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((tag) => (
          <Tag
            key={`${tag.trigger}-${tag.id}`}
            closable={!disabled}
            onClose={(e) => {
              e.preventDefault();
              handleRemoveTag(tag.id, tag.trigger);
            }}
            closeIcon={<CloseOutlined className="text-xs" />}
            className="flex items-center gap-1 px-2 py-0.5 m-0 bg-primary/20 text-primary border border-primary/30 rounded-md"
          >
            <span className="text-xs opacity-70">{tag.trigger}</span>
            <span>{tag.label}</span>
          </Tag>
        ))}
      </div>
    );

    return (
      <div className={`tag-selector ${className}`}>
        {/* 已选标签 */}
        {value.length > 0 && renderTags()}

        {/* 输入框 + Suggestion */}
        <Suggestion
          items={getSuggestionItems}
          onSelect={handleSelect}
          styles={{
            popup: {
              maxHeight: 280,
              overflow: "auto",
            },
          }}
          classNames={{
            popup: "bg-bg-secondary border border-border rounded-lg shadow-xl",
          }}
        >
          {({ onTrigger, onKeyDown, open }) => {
            // 处理键盘事件
            const handleKeyDown = (e: React.KeyboardEvent) => {
              // 检测触发符号
              if (Object.keys(triggers).includes(e.key)) {
                onTrigger(e.key);
              }
              onKeyDown(e);
            };

            // 处理输入变化，同步触发 Suggestion
            const handleChange = (val: string) => {
              handleInputChange(val);

              // 触发 Suggestion
              const triggerKeys = Object.keys(triggers);
              for (const key of triggerKeys) {
                if (val.includes(key)) {
                  const idx = val.lastIndexOf(key);
                  onTrigger(val.slice(idx));
                  return;
                }
              }

              // 没有触发符号时关闭
              if (open) {
                onTrigger(false);
              }
            };

            return (
              <Input
                value={inputValue}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentTrigger?.placeholder || placeholder}
                disabled={disabled}
                className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-tertiary focus:border-primary/50"
              />
            );
          }}
        </Suggestion>
      </div>
    );
  }
);

TagSelector.displayName = "TagSelector";

export default TagSelector;
