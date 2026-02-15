/**
 * 开发者工具配置
 */

export interface ToolMenuItem {
  /** 菜单标识 */
  key: string;
  /** 显示标签 */
  label: string;
  /** 路由路径 */
  path: string;
  /** 图标 */
  icon?: string;
}

// 工具菜单配置
export const TOOL_MENU_CONFIG: ToolMenuItem[] = [
  {
    key: "json-beautify",
    label: "JSON美化",
    path: "/developer/json-beautify",
    icon: "code",
  },
  {
    key: "image-base64",
    label: "图片与 Base64 转换",
    path: "/developer/image-base64",
    icon: "image",
  },
  {
    key: "color-convert",
    label: "颜色转换",
    path: "/developer/color-convert",
    icon: "palette",
  },
  {
    key: "excel-json",
    label: "Excel 转 JSON",
    path: "/developer/excel-json",
    icon: "table",
  },
  {
    key: "postman",
    label: "简易 Postman",
    path: "/developer/postman",
    icon: "api",
  },
  {
    key: "ocr",
    label: "OCR 功能",
    path: "/developer/ocr",
    icon: "document_scanner",
  },
];

export default TOOL_MENU_CONFIG;
