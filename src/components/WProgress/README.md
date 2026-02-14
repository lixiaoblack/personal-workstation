# WProgress 进度条组件

## 功能描述

进度条组件，用于展示系统状态、任务进度等场景。支持多种状态颜色。

## API

| 属性 | 说明 | 类型 | 默认值 | 必填 |
|------|------|------|--------|------|
| label | 标签文本 | string | - | 是 |
| value | 右侧显示值 | string | - | 否 |
| percent | 进度百分比 (0-100) | number | - | 是 |
| status | 进度条状态 | 'normal' \| 'success' \| 'warning' \| 'error' | 'normal' | 否 |
| showInfo | 是否显示进度文字 | boolean | true | 否 |
| className | 额外类名 | string | - | 否 |

## 使用示例

```tsx
import { WProgress } from '@/components/WProgress';

// 正常状态
<WProgress
  label="存储空间 (256GB)"
  percent={64}
/>

// 成功状态
<WProgress
  label="云端同步"
  value="已就绪"
  percent={100}
  status="success"
/>

// 警告状态
<WProgress
  label="内存使用"
  value="80%"
  percent={80}
  status="warning"
/>

// 错误状态
<WProgress
  label="磁盘空间"
  value="95%"
  percent={95}
  status="error"
/>
```

## 状态说明

| 状态 | 颜色 | 用途 |
|------|------|------|
| normal | 主色调 | 正常进度展示 |
| success | 绿色 | 完成、就绪状态 |
| warning | 黄色 | 警告、接近上限 |
| error | 红色 | 错误、已超限 |

## 样式变量

组件使用以下 CSS 变量：

- `--primary-color`: 主色调
- `--bg-tertiary`: 第三背景色（进度条轨道）
- `--text-primary`: 主文本色
