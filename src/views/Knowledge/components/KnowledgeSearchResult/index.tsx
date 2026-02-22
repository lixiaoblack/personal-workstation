/**
 * 知识库搜索结果组件
 * 显示搜索匹配的内容片段
 */
import React from "react";
import { Card, Typography } from "antd";
import { FileTextOutlined } from "@ant-design/icons";

const { Text, Paragraph } = Typography;

interface SearchResultItem {
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

interface KnowledgeSearchResultProps {
  results: SearchResultItem[];
}

const KnowledgeSearchResult: React.FC<KnowledgeSearchResultProps> = ({
  results,
}) => {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <p className="text-sm font-semibold text-text-secondary mb-4">
        搜索结果 ({results.length})
      </p>
      <div className="space-y-3">
        {results.map((result, index) => (
          <Card
            key={index}
            size="small"
            className="bg-primary/5 border-primary/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <FileTextOutlined className="text-primary text-sm" />
              <span className="text-xs font-medium text-primary">
                相关度: {(result.score * 100).toFixed(1)}%
              </span>
            </div>
            <Paragraph
              ellipsis={{ rows: 3, expandable: true }}
              className="m-0 text-sm text-text-secondary leading-relaxed"
            >
              {result.content}
            </Paragraph>
            {(() => {
              const fileName = result.metadata.file_name;
              return fileName && typeof fileName === "string" ? (
                <Text type="secondary" className="text-xs mt-2 block">
                  来源: {fileName}
                </Text>
              ) : null;
            })()}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default KnowledgeSearchResult;
