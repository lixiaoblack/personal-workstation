/**
 * Home 页面配置文件
 * 包含导航菜单、模块入口、任务数据等配置
 */

// 导航菜单配置
export const NAV_MENU_CONFIG = [
  {
    key: 'dashboard',
    icon: 'grid_view',
    label: '仪表盘',
    path: '/',
  },
  {
    key: 'developer',
    icon: 'code',
    label: '开发者工具',
    path: '/developer',
  },
  {
    key: 'gis',
    icon: 'map',
    label: 'GIS 专业工具',
    path: '/gis',
  },
  {
    key: 'journal',
    icon: 'auto_stories',
    label: '工作日志',
    path: '/journal',
  },
  {
    key: 'notes',
    icon: 'sticky_note_2',
    label: '记事本',
    path: '/notes',
  },
  {
    key: 'todo',
    icon: 'checklist',
    label: '待办提醒',
    path: '/todo',
  },
] as const;

// 核心模块入口配置
export const MODULE_CARDS_CONFIG = [
  {
    key: 'developer',
    icon: 'code',
    title: '开发者工具',
    description: '集成终端、IDE、代码片段',
    color: 'blue',
    path: '/developer',
  },
  {
    key: 'gis',
    icon: 'map',
    title: 'GIS 专业工具',
    description: '空间分析、地图引擎、底图',
    color: 'emerald',
    path: '/gis',
  },
  {
    key: 'journal',
    icon: 'history_edu',
    title: '工作日志',
    description: '每日记录、项目里程碑',
    color: 'purple',
    path: '/journal',
  },
  {
    key: 'notes',
    icon: 'edit_note',
    title: '记事本',
    description: '灵感捕捉、快速备忘录',
    color: 'amber',
    path: '/notes',
  },
  {
    key: 'todo',
    icon: 'notifications_active',
    title: '待办提醒',
    description: '任务管理、截止日期',
    color: 'rose',
    path: '/todo',
  },
] as const;

// 今日焦点任务配置
export const FOCUS_TASKS_CONFIG = [
  {
    id: '1',
    title: '审查 GIS 空间数据集',
    deadline: '今天 14:00',
    priority: 'high' as const,
    status: 'in-progress' as const,
  },
  {
    id: '2',
    title: '更新开发者控制面板主题',
    completedTime: '09:15',
    status: 'completed' as const,
  },
  {
    id: '3',
    title: '编写本周工作总结日志',
    deadline: '今天 17:30',
    priority: 'medium' as const,
    status: 'pending' as const,
  },
] as const;

// 最近日志配置
export const RECENT_LOGS_CONFIG = [
  {
    id: '1',
    date: { month: 'Oct', day: '26' },
    title: '上海市三维地形数据处理进展',
    content: '今天完成了 Lidar 点云数据的初步分类，整体精度满足预期。但在植被覆盖密集区存在地表点密度不足的情况...',
  },
  {
    id: '2',
    date: { month: 'Oct', day: '25' },
    title: '工作站 UI 框架重构设计笔记',
    content: '计划将所有核心组件迁移到 Tailwind 体系，以提高响应式开发的效率和样式的统一性。初步完成了侧边栏组件的封装...',
  },
] as const;

// 系统状态配置
export const SYSTEM_STATUS_CONFIG = [
  {
    key: 'sync',
    label: '云端同步',
    value: '已就绪',
    percent: 100,
    status: 'success' as const,
  },
  {
    key: 'storage',
    label: '存储空间 (256GB)',
    value: '64%',
    percent: 64,
    status: 'normal' as const,
  },
] as const;

// 类型定义
export type NavMenuItem = (typeof NAV_MENU_CONFIG)[number];
export type ModuleCard = (typeof MODULE_CARDS_CONFIG)[number];
export type FocusTask = (typeof FOCUS_TASKS_CONFIG)[number];
export type RecentLog = (typeof RECENT_LOGS_CONFIG)[number];
export type SystemStatus = (typeof SYSTEM_STATUS_CONFIG)[number];
