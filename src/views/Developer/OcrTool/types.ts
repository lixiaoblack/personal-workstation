/**
 * OcrTool 页面相关类型定义
 */

// 知识库信息（简化版，用于 Select）
export interface KnowledgeInfo {
  id: string;
  name: string;
}

// OCR 文字块
export interface OcrBlock {
  text: string;
  confidence: number;
  box: number[][];
}

// OCR 历史记录项
export interface OcrHistoryItem {
  id: string;
  imageBase64: string;
  text: string;
  timestamp: number;
}

// 保存到知识库 Modal 的 props
export interface SaveToKnowledgeModalProps {
  visible: boolean;
  content: string;
  onClose: () => void;
  onSuccess: () => void;
}
