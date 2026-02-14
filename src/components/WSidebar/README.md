# WSidebar 侧边栏组件

## 功能描述

侧边栏导航组件，用于展示应用的主要导航菜单、品牌标识和用户操作区域。

## API

| 属性 | 说明 | 类型 | 默认值 | 必填 |
|------|------|------|--------|------|
| menuItems | 导航菜单配置 | INavMenuItem[] | - | 是 |
| activeKey | 当前选中菜单项 | string | 第一项 key | 否 |
| onMenuClick | 菜单点击回调 | (key: string, item: INavMenuItem) => void | - | 否 |
| brandName | 品牌名称 | string | '个人工作站' | 否 |
| version | 版本号 | string | '专业版 v2.4.0' | 否 |
| footerExtra | 底部额外内容 | ReactNode | - | 否 |

### INavMenuItem 类型

```typescript
interface INavMenuItem {
  key: string;       // 菜单项唯一标识
  icon: string;      // Material Symbols 图标名称
  label: string;     // 菜单项文本
  path?: string;     // 跳转路径
  children?: INavMenuItem[]; // 子菜单
}
```

## 使用示例

```tsx
import { WSidebar } from '@/components/WSidebar';

const menuItems = [
  { key: 'dashboard', icon: 'grid_view', label: '仪表盘', path: '/' },
  { key: 'developer', icon: 'code', label: '开发者工具', path: '/developer' },
  { key: 'gis', icon: 'map', label: 'GIS 专业工具', path: '/gis' },
];

<WSidebar
  menuItems={menuItems}
  brandName="个人工作站"
  version="专业版 v2.4.0"
  onMenuClick={(key, item) => console.log('Clicked:', key)}
/>
```

## 样式变量

组件使用以下 CSS 变量，可在全局样式中定义：

- `--primary-color`: 主色调
- `--primary-hover`: 主色悬停色
- `--bg-primary`: 主背景色
- `--bg-hover`: 悬停背景色
- `--border-color`: 边框颜色
- `--text-primary`: 主文本色
- `--text-secondary`: 次要文本色
- `--text-tertiary`: 辅助文本色
