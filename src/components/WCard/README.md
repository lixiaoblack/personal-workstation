# WCard 卡片组件

## 功能描述

通用卡片组件，用于展示模块入口、内容卡片等场景。支持多种预设颜色和悬停效果。

## API

| 属性 | 说明 | 类型 | 默认值 | 必填 |
|------|------|------|--------|------|
| icon | 图标名称 (Material Symbols) | string | - | 是 |
| title | 标题 | string | - | 是 |
| description | 描述文本 | string | - | 否 |
| color | 预设颜色 | 'blue' \| 'emerald' \| 'purple' \| 'amber' \| 'rose' | 'blue' | 否 |
| hoverable | 是否可悬停 | boolean | false | 否 |
| onClick | 点击回调 | () => void | - | 否 |
| className | 额外类名 | string | - | 否 |
| children | 子元素 | ReactNode | - | 否 |

## 使用示例

```tsx
import { WCard } from '@/components/WCard';

// 基础用法
<WCard
  icon="code"
  title="开发者工具"
  description="集成终端、IDE、代码片段"
  color="blue"
/>

// 可悬停卡片
<WCard
  icon="map"
  title="GIS 专业工具"
  description="空间分析、地图引擎、底图"
  color="emerald"
  hoverable
  onClick={() => console.log('Card clicked')}
/>
```

## 颜色预设

| 颜色 | 用途示例 |
|------|----------|
| blue | 开发者工具、技术相关 |
| emerald | GIS 工具、地图相关 |
| purple | 工作日志、文档相关 |
| amber | 记事本、备忘相关 |
| rose | 待办提醒、紧急事项 |

## 样式变量

组件使用以下 CSS 变量：

- `--bg-primary`: 主背景色
- `--border-color`: 边框颜色
- `--text-secondary`: 次要文本色
- `--text-tertiary`: 辅助文本色
