/**
 * 工作日志页面配置
 */

export interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasEvent: boolean;
}

export interface CalendarData {
  month: string;
  days: CalendarDay[];
}

export interface NavMenuItem {
  id: string;
  icon: string;
  label: string;
  active: boolean;
}

export interface TaskTag {
  icon: string;
  label: string;
}

export interface TaskItem {
  id: string;
  time: string;
  title: string;
  status: "completed" | "in_progress" | "pending";
  content: string;
  tags: TaskTag[];
}

// 日历数据
export const CALENDAR_DATA: CalendarData = {
  month: "2023年10月",
  days: [
    { day: 27, isCurrentMonth: false, isToday: false, hasEvent: false },
    { day: 28, isCurrentMonth: false, isToday: false, hasEvent: false },
    { day: 29, isCurrentMonth: false, isToday: false, hasEvent: false },
    { day: 1, isCurrentMonth: true, isToday: false, hasEvent: false },
    { day: 2, isCurrentMonth: true, isToday: false, hasEvent: false },
    { day: 3, isCurrentMonth: true, isToday: false, hasEvent: false },
    { day: 4, isCurrentMonth: true, isToday: false, hasEvent: false },
    { day: 5, isCurrentMonth: true, isToday: true, hasEvent: false },
    { day: 6, isCurrentMonth: true, isToday: false, hasEvent: false },
    { day: 7, isCurrentMonth: true, isToday: false, hasEvent: false },
    { day: 8, isCurrentMonth: true, isToday: false, hasEvent: false },
    { day: 9, isCurrentMonth: true, isToday: false, hasEvent: true },
    { day: 10, isCurrentMonth: true, isToday: false, hasEvent: false },
    { day: 11, isCurrentMonth: true, isToday: false, hasEvent: false },
    { day: 12, isCurrentMonth: true, isToday: false, hasEvent: false },
    { day: 13, isCurrentMonth: true, isToday: false, hasEvent: false },
    { day: 14, isCurrentMonth: true, isToday: false, hasEvent: true },
    { day: 15, isCurrentMonth: true, isToday: false, hasEvent: false },
    { day: 16, isCurrentMonth: true, isToday: false, hasEvent: false },
    { day: 17, isCurrentMonth: true, isToday: false, hasEvent: false },
    { day: 18, isCurrentMonth: true, isToday: false, hasEvent: false },
  ],
};

// 导航菜单
export const NAV_MENU_ITEMS: NavMenuItem[] = [
  { id: "overview", icon: "dashboard", label: "今日概览", active: false },
  { id: "calendar", icon: "calendar_today", label: "日历日志", active: true },
  { id: "tasks", icon: "assignment", label: "任务详情", active: false },
  { id: "ai", icon: "psychology", label: "AI 助手", active: false },
];

// 任务列表
export const TASK_ITEMS: TaskItem[] = [
  {
    id: "1",
    time: "09:30",
    title: "产品设计周会",
    status: "completed",
    content: `讨论了V2.0版本的UI改版方向，确定了以深色模式为核心的设计风格。下一步需要完善组件库的配色方案。

1. 确立主色调为 #137fec
2. 简化导航栏结构
3. 增加AI总结模块`,
    tags: [
      { icon: "tag", label: "设计" },
      { icon: "group", label: "团队" },
    ],
  },
  {
    id: "2",
    time: "14:00",
    title: "前端组件开发",
    status: "in_progress",
    content: `正在迁移 Tailwind CSS 配置文件，并同步 Material Symbols 库。

当前进度：
- [x] 颜色主题配置
- [ ] 按钮组件重构
- [ ] 响应式侧边栏调整`,
    tags: [{ icon: "code", label: "前端开发" }],
  },
];
