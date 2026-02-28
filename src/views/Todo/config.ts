/**
 * Todo 待办提醒页面配置
 */

// 优先级配置
export const PRIORITY_CONFIG = {
  low: {
    label: "低",
    color: "text-text-tertiary",
    bgColor: "bg-bg-tertiary",
    borderColor: "border-border",
  },
  medium: {
    label: "中",
    color: "text-blue-500",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/20",
  },
  high: {
    label: "高",
    color: "text-orange-500",
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-500/20",
  },
  urgent: {
    label: "紧急",
    color: "text-red-500",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/20",
  },
} as const;

// 状态配置
export const STATUS_CONFIG = {
  pending: {
    label: "待处理",
    color: "text-text-secondary",
    bgColor: "bg-bg-tertiary",
    icon: "pending",
  },
  in_progress: {
    label: "进行中",
    color: "text-blue-500",
    bgColor: "bg-blue-500/20",
    icon: "progress_activity",
  },
  completed: {
    label: "已完成",
    color: "text-green-500",
    bgColor: "bg-green-500/20",
    icon: "check_circle",
  },
  cancelled: {
    label: "已取消",
    color: "text-text-tertiary",
    bgColor: "bg-bg-tertiary",
    icon: "cancel",
  },
} as const;

// 重复类型配置
export const REPEAT_CONFIG = {
  none: { label: "不重复", icon: "block" },
  daily: { label: "每天", icon: "today" },
  weekly: { label: "每周", icon: "date_range" },
  monthly: { label: "每月", icon: "calendar_month" },
  yearly: { label: "每年", icon: "event" },
} as const;

// 图标配置
export const ICON_OPTIONS = [
  { value: "folder", label: "文件夹" },
  { value: "work", label: "工作" },
  { value: "favorite", label: "生活" },
  { value: "school", label: "学习" },
  { value: "fitness_center", label: "健身" },
  { value: "shopping_cart", label: "购物" },
  { value: "flight", label: "旅行" },
  { value: "celebration", label: "娱乐" },
  { value: "restaurant", label: "饮食" },
  { value: "medical_services", label: "医疗" },
  { value: "payments", label: "财务" },
  { value: "code", label: "开发" },
] as const;

// 默认分类颜色
export const DEFAULT_CATEGORY_COLORS = [
  "#3B82F6", // blue
  "#F97316", // orange
  "#A855F7", // purple
  "#EF4444", // red
  "#10B981", // green
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#84CC16", // lime
];

// 类型导出
export type PriorityKey = keyof typeof PRIORITY_CONFIG;
export type StatusKey = keyof typeof STATUS_CONFIG;
export type RepeatKey = keyof typeof REPEAT_CONFIG;
export type IconOption = (typeof ICON_OPTIONS)[number];
