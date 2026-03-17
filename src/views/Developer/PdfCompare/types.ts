/**
 * PDF 对比功能类型定义
 */

/** PDF 文本块类型 */
export type PdfBlockType =
  | "title"
  | "heading1"
  | "heading2"
  | "paragraph"
  | "list";

/** PDF 文本块 */
export interface PdfBlock {
  /** 块唯一标识 */
  id: string;
  /** 块类型 */
  type: PdfBlockType;
  /** 文本内容 */
  text: string;
  /** 边界框坐标 [x0, y0, x1, y1] */
  bbox: [number, number, number, number];
  /** 页码 */
  pageNumber: number;
  /** 字体大小 */
  fontSize?: number;
  /** OCR 置信度（扫描版 PDF） */
  confidence?: number;
}

/** PDF 页面数据 */
export interface PdfPage {
  /** 页码 */
  pageNumber: number;
  /** 页面宽度 */
  width: number;
  /** 页面高度 */
  height: number;
  /** 文本块列表 */
  blocks: PdfBlock[];
}

/** PDF 解析结果 */
export interface PdfParseResult {
  /** 是否解析成功 */
  success: boolean;
  /** 文件名 */
  fileName: string;
  /** 总页数 */
  totalPages: number;
  /** 页面数据列表 */
  pages: PdfPage[];
  /** 是否为扫描版 PDF */
  isScanned: boolean;
  /** 错误信息 */
  error?: string;
}

/** PDF 服务状态 */
export interface PdfServiceStatus {
  /** 是否可用 */
  available: boolean;
  /** 状态消息 */
  message: string;
}

/** 高亮状态 */
export interface HighlightState {
  /** 当前高亮的块 */
  block: PdfBlock | null;
  /** 是否显示高亮 */
  visible: boolean;
}
