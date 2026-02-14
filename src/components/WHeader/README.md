# WHeader 头部组件

## 功能描述

页面头部组件，包含搜索栏、通知按钮和用户信息展示。

## API

| 属性 | 说明 | 类型 | 默认值 | 必填 |
|------|------|------|--------|------|
| searchPlaceholder | 搜索框占位文本 | string | '搜索功能、任务或日志...' | 否 |
| userName | 用户名 | string | '管理员' | 否 |
| userAvatar | 用户头像 URL | string | - | 否 |
| lastLogin | 最后登录时间 | string | '10:24 AM' | 否 |
| onSearch | 搜索回调 (回车触发) | (value: string) => void | - | 否 |
| onNotificationClick | 通知点击回调 | () => void | - | 否 |

## 使用示例

```tsx
import { WHeader } from '@/components/WHeader';

<WHeader
  searchPlaceholder="搜索功能、任务或日志..."
  userName="管理员"
  lastLogin="10:24 AM"
  onSearch={(value) => console.log('Search:', value)}
  onNotificationClick={() => console.log('Notification clicked')}
/>
```

## 样式变量

组件使用以下 CSS 变量：

- `--primary-color`: 主色调
- `--bg-secondary`: 次要背景色
- `--bg-secondary-rgb`: 次要背景色 RGB 值
- `--bg-tertiary`: 第三背景色
- `--bg-hover`: 悬停背景色
- `--border-color`: 边框颜色
- `--text-primary`: 主文本色
- `--text-tertiary`: 辅助文本色
