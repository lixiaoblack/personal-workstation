/**
 * Home 页面配置文件
 * 包含导航菜单、模块入口配置
 */
import type { INavMenuItem } from "@/components/WSidebar";
import type { TCardColor } from "@/components/WCard";

// 导航菜单配置
export const NAV_MENU_CONFIG: INavMenuItem[] = [
  {
    key: "dashboard",
    icon: "grid_view",
    label: "仪表盘",
    path: "/",
  },
  {
    key: "ai-chat",
    icon: "smart_toy",
    label: "AI 助手",
    path: "/ai-chat",
  },
  {
    key: "knowledge",
    icon: "database",
    label: "知识库",
    path: "/knowledge",
  },
  {
    key: "developer",
    icon: "code",
    label: "开发者工具",
    path: "/developer",
  },
  {
    key: "notes",
    icon: "sticky_note_2",
    label: "记事本",
    path: "/notes",
  },
  {
    key: "todo",
    icon: "checklist",
    label: "待办提醒",
    path: "/todo",
  },
];

// 核心模块入口配置
export const MODULE_CARDS_CONFIG: Array<{
  key: string;
  icon: string;
  title: string;
  description: string;
  color: TCardColor;
  path: string;
}> = [
  {
    key: "ai-chat",
    icon: "smart_toy",
    title: "AI 助手",
    description: "智能对话、知识检索、代码生成",
    color: "blue",
    path: "/ai-chat",
  },
  {
    key: "knowledge",
    icon: "database",
    title: "知识库",
    description: "文档管理、向量检索、知识沉淀",
    color: "emerald",
    path: "/knowledge",
  },
  {
    key: "developer",
    icon: "code",
    title: "开发者工具",
    description: "API 测试、JSON 处理、OCR 识别",
    color: "purple",
    path: "/developer",
  },
  {
    key: "notes",
    icon: "edit_note",
    title: "记事本",
    description: "灵感捕捉、快速备忘录",
    color: "amber",
    path: "/notes",
  },
  {
    key: "todo",
    icon: "notifications_active",
    title: "待办提醒",
    description: "任务管理、截止日期提醒",
    color: "rose",
    path: "/todo",
  },
];
