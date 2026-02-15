---
trigger: always_on
---

# Personal Workstation 项目规范

## 项目概况

- **项目名称**: Personal Workstation
- **项目类型**: Electron 桌面应用
- **技术栈**: Electron + React Hooks + TypeScript + Ant Design + Vite
- **包管理器**: pnpm
- **Git 仓库**: git@github.com:lixiaoblack/personal-workstation.git

## 技术栈详情

| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | latest | 桌面应用框架 |
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Ant Design | 5.x | UI 组件库 |
| Vite | 5.x | 构建工具 |
| pnpm | 9.x | 包管理器 |

## 目录结构

```
personal-workstation/
├── .qoder/                     # Qoder AI 配置目录
│   ├── rules/
│   │   └── rules.md            # 项目规范文件 (本文件)
│   ├── agents/
│   └── skills/
├── md/                         # 项目文档目录
│   ├── tasks.md                # 任务情况记录
│   ├── changelog.md            # 修改记录
│   ├── ai-agent-tech-plan.md   # AI 技术方案
│   ├── ai-tasks.md             # AI 任务清单
│   └── ai-changelog.md         # AI 修改记录
├── electron/                   # Electron 主进程
│   ├── main.ts                 # 主进程入口
│   └── preload.ts              # 预加载脚本
├── src/                        # 渲染进程源码
│   ├── main.tsx                # React 入口
│   ├── App.tsx                 # 根组件
│   ├── components/             # 全局通用组件 (W前缀命名)
│   │   └── WButton/            # 示例：WButton 组件
│   │       ├── index.tsx       # 组件逻辑
│   │       ├── index.sass      # 组件样式
│   │       └── README.md       # 组件文档
│   ├── views/                  # 页面视图目录
│   │   └── Home/               # 首页 (PascalCase 命名)
│   │       ├── index.tsx       # 页面 DOM 结构
│   │       ├── index.sass      # 页面样式
│   │       ├── config.ts       # 数据枚举配置
│   │       └── components/     # 页面私有组件
│   │           └── HomeHeader/ # 页面组件 (模块名+功能)
│   │               ├── index.tsx
│   │               ├── index.sass
│   │               └── README.md
│   ├── hooks/                  # 自定义 Hooks
│   ├── utils/                  # 工具函数
│   ├── types/                  # TypeScript 类型定义
│   ├── services/               # API 服务
│   ├── stores/                 # 状态管理
│   └── assets/                 # 静态资源
├── public/                     # 公共静态资源
├── resources/                  # Electron 资源文件
├── index.html                  # HTML 入口
├── vite.config.ts              # Vite 配置
├── tsconfig.json               # TypeScript 配置
├── tsconfig.node.json          # Node.js TypeScript 配置
├── package.json                # 项目配置
├── pnpm-lock.yaml              # 依赖锁定文件
└── .gitignore                  # Git 忽略配置
```

## Git 提交规范

### 提交类型

| 类型 | 说明 | 示例 |
|------|------|------|
| feat | 新功能 | feat: 添加用户登录功能 |
| fix | 修复问题 | fix: 修复登录验证失败问题 |
| docs | 文档修改 | docs: 更新 README 文档 |
| style | 代码格式修改 | style: 格式化代码缩进 |
| refactor | 代码重构 | refactor: 重构用户服务 |
| test | 测试用例修改 | test: 添加登录单元测试 |
| chore | 其他修改 | chore: 更新依赖版本 |

### 提交要求

1. **功能点提交**: 每完成一个功能点立即提交 Git
2. **提交信息格式**: `<type>: <description>`
3. **语言要求**: 提交信息使用中文描述
4. **原子性**: 每次提交应该是一个独立的功能点或修复

## 文档管理规范

### md 文件夹结构

```
md/
├── tasks.md          # 任务情况记录
└── changelog.md      # 修改记录
```

### tasks.md 任务记录格式

```markdown
## 任务列表

### 进行中
- [ ] 任务ID: 任务描述 | 开始时间: YYYY-MM-DD HH:mm

### 已完成
- [x] 任务ID: 任务描述 | 完成时间: YYYY-MM-DD HH:mm

### 待处理
- [ ] 任务ID: 任务描述 | 创建时间: YYYY-MM-DD HH:mm
```

### changelog.md 修改记录格式

```markdown
# 修改记录

## [版本号] - YYYY-MM-DD

### 新增 (Added)
- 新增功能描述

### 修改 (Changed)
- 修改内容描述

### 修复 (Fixed)
- 修复问题描述

### 移除 (Removed)
- 移除功能描述
```

## 开发规范

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `UserProfile.tsx` |
| 工具函数 | camelCase | `formatDate.ts` |
| 常量 | UPPER_SNAKE_CASE | `API_BASE_URL` |
| CSS 类名 | kebab-case | `user-profile-container` |
| 类型/接口 | PascalCase | `IUserInfo` / `UserType` |

### 代码规范

1. **TypeScript**: 所有代码必须使用 TypeScript，禁用 `any` 类型
2. **组件**: 使用函数组件和 React Hooks
3. **样式规范**:
   - **简单样式**: 优先使用 Tailwind CSS 原子类
   - **复杂样式**: 使用 SCSS/SASS 编写
   - **UI 组件**: 使用 Ant Design 主题系统
4. **注释**: 复杂逻辑必须添加注释说明
5. **导入顺序**:
   - React 相关
   - 第三方库
   - 项目内部模块
   - 类型定义

### 组件开发规范

```typescript
// 导入顺序示例
import React, { useState, useEffect } from 'react';
import { Button, Input } from 'antd';
import { UserService } from '@/services';
import type { IUserProps } from './types';

// 组件定义
const MyComponent: React.FC<IUserProps> = (props) => {
  // Hooks 声明
  const [state, setState] = useState<string>('');

  // 副作用
  useEffect(() => {
    // ...
  }, []);

  // 事件处理
  const handleClick = () => {
    // ...
  };

  // 渲染
  return (
    <div className="my-component">
      {/* ... */}
    </div>
  );
};

export default MyComponent;
```

## Electron 开发规范

### 主进程 (Main Process)

- 文件位置: `electron/main.ts`
- 职责: 窗口管理、系统交互、IPC 通信
- 安全: 禁用 `nodeIntegration`，启用 `contextIsolation`

### 预加载脚本 (Preload)

- 文件位置: `electron/preload.ts`
- 职责: 暴露安全的 API 给渲染进程
- 使用 `contextBridge` 暴露接口

### 渲染进程 (Renderer)

- 文件位置: `src/` 目录
- 职责: UI 渲染、用户交互
- 通过 IPC 与主进程通信

## 依赖管理

### 安装依赖

```bash
# 安装生产依赖
pnpm add <package-name>

# 安装开发依赖
pnpm add -D <package-name>

# 安装所有依赖
pnpm install
```

### 常用脚本

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 打包 Electron 应用
pnpm package

# 代码检查
pnpm lint
```

## 注意事项

1. **Git 提交**: 每完成一个功能点立即提交，提交信息遵循规范
2. **文档同步**: 任务状态变更需同步更新 `md/tasks.md`
3. **修改记录**: 功能修改需同步更新 `md/changelog.md`
4. **代码质量**: 保持代码整洁，遵循 ESLint 规则
5. **类型安全**: 确保类型定义完整，避免使用 `any`
6. **提交前检查**: 每次提交前必须运行 `pnpm lint` 检查 TypeScript 错误，有错误必须修复后再提交

## 页面开发规范

### 页面目录结构

所有页面文件统一放置在 `src/views` 目录下，每个页面是一个独立的文件夹。

```
src/views/
├── Home/                    # 首页
│   ├── index.tsx            # 页面 DOM 结构
│   ├── index.sass           # 页面样式
│   ├── config.ts            # 数据枚举配置
│   └── components/          # 页面私有组件
└── Settings/                # 设置页
    ├── index.tsx
    ├── index.sass
    ├── config.ts
    └── components/
```

### 页面命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 页面文件夹 | PascalCase | `Home`, `Settings`, `UserProfile` |
| 页面入口 | index.tsx | 统一命名为 index.tsx |
| 样式文件 | index.sass | 统一命名为 index.sass |
| 配置文件 | config.ts | 统一命名为 config.ts |

### 页面文件职责

| 文件 | 职责 |
|------|------|
| index.tsx | 页面 DOM 结构、组件逻辑、事件处理 |
| index.sass | 页面样式，使用 SASS/SCSS 语法 |
| config.ts | 数据枚举、常量定义、配置项 |

### 全局组件规范

全局组件放置在 `src/components` 目录下，统一使用 `W` 前缀命名。

```
src/components/
├── WButton/
│   ├── index.tsx        # 组件逻辑
│   ├── index.sass       # 组件样式
│   └── README.md        # 组件文档
├── WTable/
│   ├── index.tsx
│   ├── index.sass
│   └── README.md
└── WCard/
    ├── index.tsx
    ├── index.sass
    └── README.md
```

#### 全局组件命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件文件夹 | W + 功能名 (PascalCase) | `WButton`, `WTable`, `WCard` |
| 入口文件 | index.tsx | 统一命名 |
| 样式文件 | index.sass | 统一命名 |
| 文档文件 | README.md | 必须包含组件说明、API、示例 |

#### README.md 文档格式

```markdown
# W[组件名]

## 功能描述
组件的功能说明。

## API

| 属性 | 说明 | 类型 | 默认值 | 必填 |
|------|------|------|--------|------|
| prop1 | 属性说明 | string | - | 是 |

## 使用示例

\`\`\`tsx
import { WButton } from '@/components/WButton';

<WButton type="primary">按钮</WButton>
\`\`\`
```

### 页面私有组件规范

页面私有组件放置在对应页面的 `components` 目录下，命名为 `页面名 + 功能名`。

```
src/views/Home/
└── components/
    ├── HomeHeader/           # 首页头部
    │   ├── index.tsx
    │   ├── index.sass
    │   └── README.md
    └── HomeSidebar/          # 首页侧边栏
        ├── index.tsx
        ├── index.sass
        └── README.md
```

### 页面开发流程

1. **创建页面前**：先生成页面文件夹名称，询问用户确认后继续
2. **创建组件时**：优先描述组件内容并询问用户，确认后创建
3. **组件优先**：所有页面的书写优先使用 `src/components` 下的全局组件
4. **样式隔离**：每个页面/组件的样式使用唯一的类名前缀避免冲突

### 组件导入规范

```typescript
// 正确示例：优先使用全局组件
import { WButton } from '@/components/WButton';
import { WCard } from '@/components/WCard';

// 页面私有组件
import { HomeHeader } from './components/HomeHeader';
import { HomeSidebar } from './components/HomeSidebar';
```

## Tailwind CSS 规范

### 样式优先级

1. **简单样式**: 优先使用 Tailwind CSS 原子类
   - 布局: `flex`, `grid`, `gap`, `p-*`, `m-*`
   - 颜色: `text-*`, `bg-*`, `border-*`
   - 尺寸: `w-*`, `h-*`, `min-*`, `max-*`
   - 排版: `text-*`, `font-*`, `leading-*`

2. **复杂样式**: 使用 SCSS/SASS 编写
   - 需要嵌套的样式
   - 需要变量和计算的样式
   - 需要动画和过渡效果
   - 复杂的选择器

### Tailwind 使用示例

```tsx
// 简单布局 - 使用 Tailwind
<div className="flex items-center gap-4 p-4 bg-bg-primary rounded-lg">
  <span className="text-sm font-medium text-text-secondary">标题</span>
</div>

// 复杂组件 - Tailwind + SCSS
// index.tsx
<div className="home-card">
  <div className="home-card__header flex items-center gap-2">
    <span className="text-lg font-bold">标题</span>
  </div>
</div>

// index.sass
.home-card
  @apply bg-bg-primary rounded-xl border border-border-color
  
  &__header
    @apply p-4 border-b border-border-color
```

### 自定义颜色

项目已定义以下自定义颜色：

| Tailwind 类名 | CSS 变量 | 用途 |
|---------------|----------|------|
| `bg-primary` | #101722 | 主背景色 |
| `bg-secondary` | #101722 | 次背景色 |
| `bg-tertiary` | #282e39 | 第三背景色 |
| `primary` | #3c83f6 | 主色调 |
| `primary-hover` | #2d6ed4 | 主色悬停 |
| `border-border` | #1e2939 | 边框色 |

## 路由规范

### 路由文件结构

```
src/router/
└── index.tsx           # 路由配置文件
```

### 路由配置

使用 React Router v6+ 的 `createBrowserRouter` 方式配置路由：

```tsx
// src/router/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import Home from '@/views/Home';

export const routes = [
  {
    path: '/',
    element: <Home />,
  },
];

const router = createBrowserRouter(routes);
export default router;
```

### 添加新路由

1. 在 `src/views` 下创建页面组件
2. 在 `src/router/index.tsx` 中导入并配置路由
3. 在侧边栏导航配置中添加菜单项

### 路由跳转

```tsx
import { useNavigate } from 'react-router-dom';

const MyComponent = () => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate('/path');
  };
  
  return <button onClick={handleClick}>跳转</button>;
};
```

## 主题规范

### 主题模式

项目支持三种主题模式：
- `light`: 浅色模式
- `dark`: 深色模式（默认）
- `system`: 跟随系统主题

### 使用主题

```tsx
import { useTheme } from '@/contexts';

const MyComponent = () => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  
  // theme: 用户选择的主题模式 ('light' | 'dark' | 'system')
  // resolvedTheme: 实际生效的主题 ('light' | 'dark')
  // setTheme: 设置主题
  // toggleTheme: 切换主题
  
  return (
    <button onClick={toggleTheme}>
      当前主题: {resolvedTheme}
    </button>
  );
};
```

### 颜色使用规范

#### 必须使用主题变量

所有颜色必须使用 CSS 变量或 Tailwind 主题色，**禁止硬编码颜色值**。

```tsx
// ✅ 正确 - 使用 Tailwind 主题色
<div className="bg-bg-primary text-text-primary border-border">
  内容
</div>

// ✅ 正确 - 使用 CSS 变量
<div style={{ color: 'var(--color-primary)' }}>
  内容
</div>

// ❌ 错误 - 硬编码颜色
<div className="bg-[#101722] text-[#ffffff]">
  内容
</div>
```

### 主题变量对照表

| Tailwind 类名 | CSS 变量 | 深色值 | 浅色值 |
|---------------|----------|--------|--------|
| `bg-primary` | --color-bg-primary | #0F172A | #F8FAFC |
| `bg-secondary` | --color-bg-secondary | #1E293B | #FFFFFF |
| `bg-tertiary` | --color-bg-tertiary | #334155 | #F1F5F9 |
| `text-primary` | --color-text-primary | #FFFFFF | #0F172A |
| `text-secondary` | --color-text-secondary | #CBD5E1 | #475569 |
| `text-tertiary` | --color-text-tertiary | #64748B | #94A3B8 |
| `border-border` | --color-border | #334155 | #E2E8F0 |
| `primary` | --color-primary | #3C83F6 | #3C83F6 |
| `success` | --color-success | #10B981 | #10B981 |
| `warning` | --color-warning | #F59E0B | #F59E0B |
| `error` | --color-error | #EF4444 | #EF4444 |

### 组件开发规范

1. 新组件必须同时适配深色和浅色模式
2. 使用主题变量而非硬编码颜色
3. 测试两种主题模式下的显示效果

### 主题文件结构

```
src/
├── contexts/
│   ├── ThemeContext.tsx    # 主题上下文
│   └── theme.types.ts       # 主题类型定义
├── hooks/
│   └── useTheme.ts          # 主题 Hook
└── styles/
    └── themes/
        ├── variables.css    # CSS 变量定义
        └── antd-theme.ts    # Ant Design 主题配置
```

---

## AI 功能开发规范

### 文档结构

AI 功能开发使用独立的文档系统，与主项目文档互不关联：

```
md/
├── tasks.md              # 主项目任务记录
├── changelog.md          # 主项目修改记录
├── ai-agent-tech-plan.md # AI 技术方案文档
├── ai-tasks.md           # AI 功能任务清单 (独立)
└── ai-changelog.md       # AI 功能修改记录 (独立)
```

### AI 任务编号规则

- 格式：`AI-XXX`（三位数字）
- 示例：AI-001, AI-015, AI-037
- 与主项目任务编号 `TASK-XXX` 区分

### AI 开发提交流程

完成 AI 相关任务后，必须执行以下步骤：

1. **运行 Lint 检查**
   ```bash
   pnpm run lint
   ```

2. **更新 AI 任务清单** (`md/ai-tasks.md`)
   - 将任务从「待处理」移至「进行中」或「已完成」
   - 更新任务统计
   - 记录完成时间

3. **更新 AI 修改记录** (`md/ai-changelog.md`)
   - 在对应版本下记录变更内容
   - 按类型分类：Added / Changed / Fixed / Removed

4. **提交 Git**
   ```bash
   git add .
   git commit -m "feat(ai): 任务描述"
   ```

### AI 任务状态流转

```
待处理 → 进行中 → 已完成
   ↓         ↓
取消/阻塞
```

### AI 任务清单格式示例

```markdown
### 进行中

- [ ] AI-001: WebSocket 通信层 - 主进程服务器 | 开始时间: 2026-02-13 10:00

### 已完成

- [x] AI-001: WebSocket 通信层 - 主进程服务器 | 完成时间: 2026-02-13 12:00
  - 实现 WebSocket 服务器基础框架
  - 添加消息处理逻辑
```

### AI 修改记录格式示例

```markdown
## [0.1.0] - 2026-02-13

### 新增 (Added)

- WebSocket 服务器基础框架
- 消息协议解析功能

### 修改 (Changed)

- 优化消息处理性能
```

### 技术栈约束

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| 智能体框架 | LangGraph >= 1.0.0 | 智能体编排 |
| 向量数据库 | LanceDB | 嵌入式、离线支持 |
| 模型接入 | OpenAI API / Ollama | 在线优先、离线降级 |
| 通信协议 | WebSocket | 本地通信、流式响应 |
| MCP | mcp-python | 工具协议集成 |

### 离线运行约束

- **核心原则**：智能体必须在本地运行，禁止通过联网请求外部服务器实现核心功能
- **模型降级**：在线 API 不可用时自动切换到 Ollama
- **知识库**：向量数据存储在本地 LanceDB

