/**
 * 知识库页面配置
 */

// 知识库页面配置
export const KNOWLEDGE_CONFIG = {
  // 支持的文件类型
  supportedFileTypes: [
    { ext: ".md", name: "Markdown", icon: "FileTextOutlined" },
    { ext: ".txt", name: "文本文件", icon: "FileTextOutlined" },
    { ext: ".pdf", name: "PDF", icon: "FilePdfOutlined" },
    { ext: ".json", name: "JSON", icon: "CodeOutlined" },
    { ext: ".html", name: "HTML", icon: "CodeOutlined" },
  ],

  // 嵌入模型选项
  embeddingModels: {
    ollama: [
      {
        name: "nomic-embed-text",
        displayName: "Nomic Embed Text",
        dimension: 768,
      },
      {
        name: "mxbai-embed-large",
        displayName: "MXBAI Embed Large",
        dimension: 1024,
      },
    ],
    openai: [
      {
        name: "text-embedding-3-small",
        displayName: "Text Embedding 3 Small",
        dimension: 1536,
      },
      {
        name: "text-embedding-3-large",
        displayName: "Text Embedding 3 Large",
        dimension: 3072,
      },
    ],
  },

  // 搜索方法
  searchMethods: [
    { value: "hybrid", label: "混合检索", description: "结合向量和关键词检索" },
    { value: "vector", label: "向量检索", description: "基于语义相似度" },
    { value: "keyword", label: "关键词检索", description: "基于关键词匹配" },
  ],

  // 默认搜索结果数量
  defaultTopK: 5,
};

// 文件大小格式化
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
