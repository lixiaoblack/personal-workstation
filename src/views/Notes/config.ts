/**
 * 记事本页面配置
 */

export interface FileNode {
  id: string;
  name: string;
  type: "folder" | "file";
  icon: string;
  expanded?: boolean;
  active?: boolean;
  children?: FileNode[];
}

export interface DocumentInfo {
  title: string;
  date: string;
  author: string;
  content: string;
}

// 文件树数据
export const FILE_TREE: FileNode[] = [
  {
    id: "my-docs",
    name: "我的文档",
    type: "folder",
    icon: "folder_open",
    active: true,
    children: [
      {
        id: "drafts",
        name: "项目草案",
        type: "folder",
        icon: "folder",
        expanded: false,
        children: [],
      },
      {
        id: "2024-plan",
        name: "2024年计划",
        type: "folder",
        icon: "folder",
        expanded: true,
        children: [
          {
            id: "prd",
            name: "产品需求文档.md",
            type: "file",
            icon: "description",
            active: true,
          },
          {
            id: "market-research",
            name: "市场调研报告.md",
            type: "file",
            icon: "description",
          },
        ],
      },
    ],
  },
  {
    id: "quick-access",
    name: "快速访问",
    type: "folder",
    icon: "star",
  },
  {
    id: "tags",
    name: "标签列表",
    type: "folder",
    icon: "tag",
  },
  {
    id: "trash",
    name: "回收站",
    type: "folder",
    icon: "delete",
  },
];

// 文档信息
export const DOCUMENT_INFO: DocumentInfo = {
  title: "产品需求文档：智能笔记系统 2.0",
  date: "2024-05-20",
  author: "张三",
  content: `## 1. 项目背景

随着个人知识管理（PKM）需求的增长，用户需要一个不仅能记录文字，还能通过人工智能辅助创作、整理和检索的智能系统。本项目旨在通过 AI 技术的整合，提升用户的写作效率。

## 2. 核心功能描述

- **AI 辅助写作：** 实时提供续写建议和润色服务。
- **多级目录管理：** 树状结构无限层级，方便组织大型项目。
- **Markdown 实时预览：** 支持所见即所得的编辑体验。
- **云端同步：** 跨设备无缝衔接。

## 3. 界面设计规范

采用深色模式（#0f172a）作为主要背景色，文字使用淡灰色以减少视觉疲劳。强调色使用品牌蓝（#137fec）。
`,
};
