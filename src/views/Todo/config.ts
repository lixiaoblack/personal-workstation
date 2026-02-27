/**
 * 待办提醒页面配置
 */

export interface NavItem {
  id: string;
  icon: string;
  label: string;
  active: boolean;
}

export interface Task {
  id: string;
  title: string;
  time: string;
  status: "normal" | "overdue";
  completed: boolean;
}

export interface TaskCategory {
  id: string;
  icon: string;
  label: string;
  color: string;
  tasks: Task[];
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dev-tools", icon: "terminal", label: "开发工具", active: false },
  { id: "gis", icon: "map", label: "GIS 系统", active: false },
  { id: "journal", icon: "auto_stories", label: "日志", active: false },
  { id: "notes", icon: "description", label: "笔记本", active: false },
  { id: "todo", icon: "notifications_active", label: "提醒事项", active: true },
];

export const TASK_CATEGORIES: TaskCategory[] = [
  {
    id: "work",
    icon: "work",
    label: "工作任务",
    color: "blue",
    tasks: [
      {
        id: "w1",
        title: "项目进度汇报 PPT 制作",
        time: "明天 09:00",
        status: "normal",
        completed: false,
      },
      {
        id: "w2",
        title: "核心 API 文档审查",
        time: "今天 14:30",
        status: "normal",
        completed: false,
      },
      {
        id: "w3",
        title: "跨部门协作会议",
        time: "已逾期",
        status: "overdue",
        completed: false,
      },
    ],
  },
  {
    id: "life",
    icon: "favorite",
    label: "个人生活",
    color: "orange",
    tasks: [
      {
        id: "l1",
        title: "健身房锻炼 - 腿部训练",
        time: "今天 18:00",
        status: "normal",
        completed: false,
      },
      {
        id: "l2",
        title: "购买周末聚会食材",
        time: "周五 17:00",
        status: "normal",
        completed: false,
      },
    ],
  },
  {
    id: "study",
    icon: "school",
    label: "学习计划",
    color: "purple",
    tasks: [
      {
        id: "s1",
        title: "阅读《Clean Code》第三章",
        time: "每天 21:00",
        status: "normal",
        completed: false,
      },
      {
        id: "s2",
        title: "练习 Rust 所有权概念",
        time: "周六 10:00",
        status: "normal",
        completed: false,
      },
      {
        id: "s3",
        title: "托福听力模拟测试",
        time: "10月24日",
        status: "normal",
        completed: false,
      },
    ],
  },
];

export const COLOR_MAP: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  blue: {
    bg: "bg-blue-500/20",
    text: "text-blue-500",
    border: "border-blue-500/20",
  },
  orange: {
    bg: "bg-orange-500/20",
    text: "text-orange-500",
    border: "border-orange-500/20",
  },
  purple: {
    bg: "bg-purple-500/20",
    text: "text-purple-500",
    border: "border-purple-500/20",
  },
};
