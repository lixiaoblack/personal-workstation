/**
 * KnowledgeSuggestion - 知识库快捷选择器
 * 使用 Ant Design X Suggestion 组件实现 '/' 触发的知识库选择
 * 
 * 功能：
 * - 输入 '/' 触发下拉菜单
 * - 显示知识库列表和文件列表
 * - 支持搜索过滤
 * - 选择后插入 @知识库名称 或 @知识库/文件名
 */
import React, { memo, useMemo, useCallback, useState } from "react";
import { Suggestion } from "@ant-design/x";
import type { SuggestionItem, RenderChildrenProps } from "@ant-design/x/es/suggestion";
import { FolderOutlined, FileOutlined } from "@ant-design/icons";
import type { KnowledgeInfo, KnowledgeDocumentInfo } from "@/types/electron";

interface KnowledgeSuggestionProps {
  /** 知识库列表 */
  knowledgeList: KnowledgeInfo[];
  /** 知识库文档映射（可选，用于显示文件列表） */
  knowledgeDocuments?: Record<string, KnowledgeDocumentInfo[]>;
  /** 选择知识库回调 */
  onSelectKnowledge?: (knowledgeId: string, knowledgeName: string) => void;
  /** 选择文件回调 */
  onSelectDocument?: (knowledgeId: string, documentId: string, documentName: string) => void;
  /** 子元素渲染函数 */
  children: (props: RenderChildrenProps<string>) => React.ReactElement;
}

const KnowledgeSuggestion: React.FC<KnowledgeSuggestionProps> = memo(
  ({
    knowledgeList,
    knowledgeDocuments = {},
    onSelectKnowledge,
    onSelectDocument,
    children,
  }) => {
    // 搜索关键词
    const [searchKeyword, setSearchKeyword] = useState("");

    // 构建建议项列表（根据搜索关键词过滤）
    const items = useMemo((): SuggestionItem[] => {
      const result: SuggestionItem[] = [];
      const keyword = searchKeyword.toLowerCase();

      knowledgeList.forEach((kb) => {
        // 知识库匹配搜索关键词
        const kbMatch = !keyword || 
          kb.name.toLowerCase().includes(keyword) ||
          (kb.description?.toLowerCase().includes(keyword));

        if (kbMatch) {
          // 构建知识库下的文档列表
          const docs = knowledgeDocuments[kb.id] || [];
          const docItems: SuggestionItem[] = docs
            .filter((doc) => !keyword || doc.fileName.toLowerCase().includes(keyword))
            .map((doc) => ({
              label: doc.fileName,
              value: `@${kb.name}/${doc.fileName}`,
              icon: <FileOutlined className="text-text-tertiary" />,
              extra: `${(doc.fileSize / 1024).toFixed(1)} KB · ${doc.chunkCount} 分块`,
            }));

          // 添加知识库选项
          result.push({
            label: kb.name,
            value: `@${kb.name}`,
            icon: <FolderOutlined className="text-primary" />,
            extra: `${kb.documentCount} 个文档${kb.description ? ` · ${kb.description}` : ''}`,
            children: docItems.length > 0 ? docItems : undefined,
          });
        }
      });

      return result;
    }, [knowledgeList, knowledgeDocuments, searchKeyword]);

    // 处理选择
    const handleSelect = useCallback(
      (value: string) => {
        // 解析选择值：@知识库名称 或 @知识库名称/文件名
        const cleanValue = value.replace('@', '');
        const parts = cleanValue.split('/');
        
        if (parts.length === 1) {
          // 选择的是知识库
          const kbName = parts[0];
          const kb = knowledgeList.find((k) => k.name === kbName);
          if (kb) {
            onSelectKnowledge?.(kb.id, kb.name);
          }
        } else if (parts.length === 2) {
          // 选择的是文件
          const [kbName, docName] = parts;
          const kb = knowledgeList.find((k) => k.name === kbName);
          if (kb) {
            const doc = knowledgeDocuments[kb.id]?.find((d) => d.fileName === docName);
            if (doc) {
              onSelectDocument?.(kb.id, doc.id, doc.fileName);
            }
          }
        }
      },
      [knowledgeList, knowledgeDocuments, onSelectKnowledge, onSelectDocument]
    );

    // 包装 children 渲染函数，在触发时更新搜索关键词
    const renderChildren = useCallback(
      (props: RenderChildrenProps<string>) => {
        // 保存原始 onTrigger
        const originalOnTrigger = props.onTrigger;
        
        // 创建包装的 onTrigger
        const wrappedOnTrigger = (info?: string | false) => {
          if (typeof info === 'string') {
            // 提取 '/' 后面的搜索关键词
            const keyword = info.startsWith('/') ? info.slice(1) : info;
            setSearchKeyword(keyword);
          } else {
            setSearchKeyword('');
          }
          // 调用原始 onTrigger
          originalOnTrigger(info);
        };

        return children({
          ...props,
          onTrigger: wrappedOnTrigger,
        });
      },
      [children]
    );

    return (
      <Suggestion
        items={items}
        onSelect={handleSelect}
        styles={{
          popup: {
            maxHeight: 320,
            overflow: 'auto',
          },
        }}
        classNames={{
          popup: 'bg-bg-secondary border border-border rounded-lg shadow-xl',
        }}
      >
        {renderChildren}
      </Suggestion>
    );
  }
);

KnowledgeSuggestion.displayName = "KnowledgeSuggestion";

export default KnowledgeSuggestion;
