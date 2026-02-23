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
│   ├── main.ts                 # 主进程入口（应用生命周期）
│   ├── preload.ts              # 预加载脚本
│   ├── ipc/                    # IPC 处理器模块
│   │   ├── index.ts            # 统一导出
│   │   ├── registerUserIpc.ts  # 用户认证、存储、媒体权限
│   │   ├── registerModelIpc.ts # 模型配置、对话管理
│   │   ├── registerKnowledgeIpc.ts # 知识库管理
│   │   ├── registerMemoryIpc.ts    # 记忆管理
│   │   ├── registerOcrIpc.ts       # OCR 识别
│   │   └── registerPythonIpc.ts    # Python 服务、Ollama、Skills
│   ├── database/               # 数据库模块
│   ├── services/               # 服务层
│   └── types/                  # 类型定义
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

---

## Python 数据服务架构

### 概述

Python 服务采用双通道架构，同时运行 WebSocket 服务和 HTTP API 服务：

1. **WebSocket 服务** - 用于 Agent 流式响应和实时通信
2. **HTTP API 服务** - 用于数据操作（知识库、对话、记忆等）

### 架构设计

```
┌──────────────────────────────────────────────────────────────┐
│ Electron 主进程                                              │
│   ↓ WebSocket Server (ws://localhost:8765)                   │
├──────────────────────────────────────────────────────────────┤
│ Python 服务 (main.py)                                        │
│   ├── WebSocket Client - 连接 Electron，处理 Agent 消息      │
│   └── HTTP Server (http://127.0.0.1:8766) - 数据 API        │
├──────────────────────────────────────────────────────────────┤
│ FastAPI 数据服务 (db_service.py)                             │
│   /api/knowledge/*     知识库管理                            │
│   /api/conversations/* 对话管理                              │
│   /api/messages/*      消息管理                              │
│   /api/memories/*      记忆管理                              │
│   /api/users/*         用户管理                              │
└──────────────────────────────────────────────────────────────┘
```

### 核心文件

| 文件 | 位置 | 职责 |
|------|------|------|
| 主入口 | `python-service/main.py` | 启动 WebSocket 客户端和 HTTP 服务 |
| 数据服务入口 | `python-service/db_service.py` | FastAPI 应用配置和路由注册 |
| API 模块 | `python-service/api/` | 模块化 API 层 |
| ├── database.py | 数据库连接管理 |
| ├── models.py | Pydantic 数据模型 |
| ├── direct_api.py | 直接调用接口（供 Agent 使用） |
| └── routers/ | 各功能路由模块 |
| 消息处理 | `python-service/message_handler.py` | WebSocket 消息处理和 Agent 调度 |
| 模型路由 | `python-service/model_router.py` | 多模型支持（OpenAI/Ollama） |
| 向量检索 | `python-service/rag/` | RAG 知识库检索 |

### HTTP API 端点

#### 知识库 API (`/api/knowledge/*`)

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/knowledge` | GET | 获取知识库列表 |
| `/api/knowledge` | POST | 创建知识库 |
| `/api/knowledge/{id}` | GET | 获取知识库详情 |
| `/api/knowledge/{id}` | PUT | 更新知识库信息 |
| `/api/knowledge/{id}` | DELETE | 删除知识库 |
| `/api/knowledge/{id}/documents` | GET | 获取知识库文档列表 |

#### 对话 API (`/api/conversations/*`)

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/conversations` | GET | 获取对话列表（分组） |
| `/api/conversations` | POST | 创建对话 |
| `/api/conversations/{id}` | GET | 获取对话详情（含消息） |
| `/api/conversations/{id}` | PUT | 更新对话 |
| `/api/conversations/{id}` | DELETE | 删除对话 |
| `/api/conversations/{id}/messages` | GET | 获取对话消息 |
| `/api/conversations/{id}/messages` | POST | 添加消息 |

#### 记忆 API (`/api/memories/*`)

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/memories` | GET | 获取所有记忆 |
| `/api/memories` | POST | 保存记忆 |
| `/api/memories/type/{type}` | GET | 按类型获取记忆 |
| `/api/memories/{id}` | DELETE | 删除记忆 |
| `/api/memories/context` | GET | 构建记忆上下文 |

#### 用户 API (`/api/users/*`)

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/users/{id}` | GET | 获取用户信息 |
| `/api/users/{id}` | PUT | 更新用户资料 |

#### OCR API (`/api/ocr/*`)

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/ocr/status` | GET | 获取 OCR 服务状态 |
| `/api/ocr/recognize` | POST | Base64 图片 OCR 识别 |
| `/api/ocr/recognize-file` | POST | 文件路径 OCR 识别 |
| `/api/ocr/save-to-knowledge` | POST | 保存 OCR 结果到知识库 |

### Skills 系统

Skills 是可热加载的技能模块，让 Agent 具备特定能力。

#### 技能目录结构

```
python-service/skills/           # 内置技能目录
~/.personal-workstation/skills/  # 用户自定义技能目录
$SKILLS_DIR/                     # 环境变量指定的目录
```

#### 技能文件格式 (YAML)

```yaml
name: code_explainer
description: 代码解释技能
version: "1.0.0"
author: system
system_prompt: |
  你是一个专业的代码解释助手...
tools:
  - name: explain_code
    description: 解释代码功能
    parameters:
      type: object
      properties:
        code:
          type: string
          description: 要解释的代码
      required: [code]
```

### 消息协议

#### WebSocket 消息类型

| 类型 | 方向 | 描述 |
|------|------|------|
| `chat` | Electron → Python | 普通 LLM 聊天请求 |
| `agent_chat` | Electron → Python | Agent 模式聊天请求 |
| `chat_stream_start` | Python → Electron | 流式开始 |
| `chat_stream_chunk` | Python → Electron | 流式内容块 |
| `chat_stream_end` | Python → Electron | 流式结束 |
| `agent_step` | Python → Electron | Agent 步骤更新 |
| `chat_error` | Python → Electron | 错误消息 |

### 优势

1. **双通道设计**：WebSocket 处理实时流式响应，HTTP API 处理数据操作
2. **离线优先**：支持 Ollama 本地模型，无需联网即可运行
3. **热加载技能**：Skills 支持运行时加载，无需重启服务
4. **统一数据层**：所有数据库操作通过 HTTP API，便于维护和调试

---

## Python 开发规范

### 目录结构

```
python-service/
├── main.py                 # 主入口（服务启动、配置初始化）
├── db_service.py           # FastAPI HTTP API 入口
├── requirements.txt        # Python 依赖
├── api/                    # 模块化 API 层
│   ├── __init__.py         # 统一导出
│   ├── database.py         # 数据库连接管理
│   ├── models.py           # Pydantic 数据模型
│   ├── direct_api.py       # 直接调用接口（供 Agent 使用）
│   └── routers/            # 路由模块
│       ├── knowledge.py    # 知识库 API
│       ├── conversation.py # 对话和消息 API
│       ├── memory.py       # 记忆和摘要 API
│       ├── user.py         # 用户 API
│       └── ocr.py          # OCR API
├── agent/                  # Agent 智能体
│   ├── graph.py            # LangGraph Agent 图定义
│   ├── state.py            # Agent 状态管理
│   ├── tools.py            # Agent 工具注册
│   ├── knowledge_tool.py   # 知识库检索工具
│   ├── web_search_tool.py  # 网页搜索工具
│   ├── web_crawler.py      # 网页采集工具
│   └── skills/             # 技能系统
│       ├── registry.py     # 技能注册中心
│       ├── loader.py       # 技能加载器
│       └── builtin.py      # 内置技能
├── rag/                    # RAG 知识库
│   ├── embeddings.py       # 嵌入向量
│   ├── vectorstore.py      # 向量存储
│   ├── retriever.py        # 检索器
│   ├── text_splitter.py    # 文本分块
│   └── document_processor.py # 文档处理
├── skills/                 # 内置技能 YAML 文件
├── message_handler.py      # WebSocket 消息处理
├── model_router.py         # 多模型路由
├── ollama_client.py        # Ollama 客户端
├── ocr_service.py          # OCR 服务
├── memory_service.py       # 记忆服务
└── ws_client.py            # WebSocket 客户端
```

### 代码规范

#### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 模块文件 | snake_case | `knowledge_tool.py` |
| 类名 | PascalCase | `KnowledgeRetrieverTool` |
| 函数/方法 | snake_case | `get_knowledge_list()` |
| 常量 | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT` |
| 变量 | snake_case | `knowledge_id` |

#### 导入顺序

```python
# 1. 标准库
import os
import json
import asyncio
from typing import Optional, List, Dict

# 2. 第三方库
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from langchain.schema import HumanMessage

# 3. 项目内部模块
from api.database import get_db
from api.models import KnowledgeCreate
```

#### 注释规范

```python
async def create_knowledge(data: KnowledgeCreate) -> Dict[str, Any]:
    """
    创建知识库
    
    Args:
        data: 知识库创建参数，包含名称、描述、嵌入模型配置
        
    Returns:
        创建的知识库信息字典
        
    Raises:
        HTTPException: 数据库操作失败时抛出
    """
    # 生成唯一 ID
    knowledge_id = f"kb_{uuid.uuid4().hex}"
    # ...
```

### API 开发规范

#### 路由定义

```python
# api/routers/knowledge.py
from fastapi import APIRouter, HTTPException
from api.database import get_db
from api.models import KnowledgeCreate

router = APIRouter(prefix="/api/knowledge", tags=["知识库"])

@router.get("/list")
async def list_knowledge():
    """获取知识库列表"""
    # ...
```

#### 直接调用接口

供 Agent 直接调用，无需 HTTP 开销：

```python
# api/direct_api.py
def direct_list_knowledge() -> List[Dict[str, Any]]:
    """直接调用：获取知识库列表"""
    with get_db() as conn:
        cursor = conn.execute("SELECT * FROM knowledge")
        return [dict(row) for row in cursor.fetchall()]
```

### Agent 工具开发

#### 工具定义

```python
from langchain.tools import BaseTool
from pydantic import Field

class KnowledgeSearchTool(BaseTool):
    """
    知识库检索工具
    
    使用场景：
    - 用户询问需要查询知识库的问题
    - 需要从已有文档中检索相关信息
    """
    
    name = "knowledge_search"
    description = "在知识库中检索相关内容"
    
    def _run(self, query: str, knowledge_id: str) -> str:
        """执行检索"""
        # ...
```

### Skills 技能开发

#### 技能文件格式 (YAML)

```yaml
# skills/example_skill.yaml
name: example_skill
display_name: 示例技能
description: 这是一个示例技能
version: "1.0.0"
author: system
enabled: true

type: prompt  # prompt | tool | workflow
trigger: "示例"  # 触发关键词

tags:
  - 示例
  - 测试

system_prompt: |
  你是一个专业的助手...

tools:
  - name: example_action
    description: 执行示例操作
    parameters:
      type: object
      properties:
        param1:
          type: string
          description: 参数说明
      required: [param1]
```

---

## Electron-Python 通信规范

### 通信架构

项目采用双通道通信架构：

```
┌─────────────────────────────────────────────────────────────┐
│                      Electron 主进程                        │
│                                                             │
│  ┌─────────────────┐          ┌─────────────────┐          │
│  │ WebSocket Server│          │   HTTP Client   │          │
│  │   (8765 端口)   │          │                 │          │
│  └────────┬────────┘          └────────┬────────┘          │
│           │                            │                    │
│           │ WebSocket                  │ HTTP               │
│           │ (流式响应)                  │ (数据操作)          │
│           ▼                            ▼                    │
└───────────┼────────────────────────────┼────────────────────┘
            │                            │
            │                            │
┌───────────┼────────────────────────────┼────────────────────┐
│           │                            │                    │
│           ▼                            ▼                    │
│  ┌─────────────────┐          ┌─────────────────┐          │
│  │ WebSocket Client│          │  FastAPI Server │          │
│  │  (ws_client.py) │          │ (db_service.py) │          │
│  └─────────────────┘          │    (8766 端口)  │          │
│                               └─────────────────┘          │
│                      Python 服务                            │
└─────────────────────────────────────────────────────────────┘
```

### 双通道职责

| 通道 | 端口 | 用途 | 特点 |
|------|------|------|------|
| WebSocket | 8765 | Agent 流式响应、实时通信 | 双向、流式 |
| HTTP API | 8766 | 数据 CRUD 操作 | 请求-响应 |

### WebSocket 通信

#### 连接流程

1. **Electron 启动 WebSocket 服务器** (端口自动分配)
2. **Python 服务启动**，连接 Electron WebSocket
3. **Python 发送标识消息** `client_identify`
4. **Electron 记录 Python 客户端引用**
5. **同步模型配置**到 Python

#### 消息类型

| 类型 | 方向 | 描述 |
|------|------|------|
| `client_identify` | Python → Electron | 客户端标识 |
| `chat` | Electron → Python | 普通 LLM 聊天 |
| `agent_chat` | Electron → Python | Agent 模式聊天 |
| `chat_stream_start` | Python → Electron | 流式开始 |
| `chat_stream_chunk` | Python → Electron | 流式内容块 |
| `chat_stream_end` | Python → Electron | 流式结束 |
| `chat_error` | Python → Electron | 错误消息 |
| `agent_step` | Python → Electron | Agent 步骤更新 |
| `agent_thought` | Python → Electron | Agent 思考过程 |
| `agent_tool_call` | Python → Electron | Agent 工具调用 |
| `agent_tool_result` | Python → Electron | Agent 工具结果 |
| `ollama_status` | Electron → Python | Ollama 状态查询 |
| `skill_execute` | Electron → Python | 执行技能 |
| `knowledge_create` | Electron → Python | 创建知识库 |

#### 消息格式

```typescript
// Electron → Python (聊天请求)
{
  "type": "agent_chat",
  "id": "msg_xxx",
  "timestamp": 1708123456789,
  "conversationId": 123,
  "content": "用户消息内容",
  "modelId": 1,
  "useTools": true
}

// Python → Electron (流式响应)
{
  "type": "chat_stream_chunk",
  "id": "msg_xxx",
  "timestamp": 1708123456790,
  "content": "响应内容块"
}
```

### HTTP API 通信

#### 客户端使用

```typescript
// electron/services/pythonApiClient.ts
import { get, post } from './pythonApiClient';

// GET 请求
const response = await get('/api/knowledge/list');

// POST 请求
const result = await post('/api/knowledge/create', {
  name: '新知识库',
  description: '描述'
});
```

#### 健康检查

```typescript
// 检查 Python HTTP 服务是否可用
const isHealthy = await checkPythonApiHealth();

// 等待服务就绪
const isReady = await waitForPythonApi(30000); // 最多等待 30 秒
```

### IPC 与 Python 通信

当 Electron IPC 需要调用 Python 服务时：

```typescript
// electron/ipc/registerOcrIpc.ts
ipcMain.handle("ocr:recognize", async (_event, imageBase64: string) => {
  // 通过 HTTP API 调用 Python
  const response = await post("/api/ocr/recognize", { 
    image_base64: imageBase64 
  });
  return response;
});
```

### 错误处理

#### WebSocket 断线

- Python 自动重连（5 秒间隔）
- Electron 广播 `python_status` 通知渲染进程

#### HTTP 请求失败

- 自动重试（最多 3 次）
- 指数退避延迟

### 开发注意事项

1. **数据操作优先用 HTTP API**：CRUD 操作使用 HTTP API，便于调试
2. **流式响应用 WebSocket**：聊天、Agent 等需要流式输出的场景
3. **消息 ID 追踪**：所有消息携带唯一 ID，便于请求-响应匹配
4. **超时设置**：WebSocket 请求设置合理超时（默认 30 秒）
5. **日志记录**：关键通信节点记录日志，便于问题排查

---

## Git 发布与打包规范

### 版本号规范

项目遵循语义化版本号 (Semantic Versioning)：`MAJOR.MINOR.PATCH`

| 类型 | 说明 | 示例 |
|------|------|------|
| MAJOR | 不兼容的 API 变更 | 1.0.0 → 2.0.0 |
| MINOR | 向后兼容的功能新增 | 1.0.0 → 1.1.0 |
| PATCH | 向后兼容的问题修复 | 1.0.0 → 1.0.1 |

### 发布流程

#### 1. 准备发布

```bash
# 1. 确保在主分支
git checkout main

# 2. 拉取最新代码
git pull origin main

# 3. 检查代码质量
pnpm lint

# 4. 本地测试构建
pnpm build
```

#### 2. 更新版本号

```bash
# 更新 package.json 版本号
# PATCH 版本（修复问题）
npm version patch -m "chore: 发布 v%s"

# MINOR 版本（新增功能）
npm version minor -m "chore: 发布 v%s"

# MAJOR 版本（重大更新）
npm version major -m "chore: 发布 v%s"
```

#### 3. 更新 Changelog

在 `md/changelog.md` 中添加版本记录：

```markdown
## [x.x.x] - YYYY-MM-DD

### 新增 (Added)
- 新功能描述

### 修改 (Changed)
- 修改内容描述

### 修复 (Fixed)
- 修复问题描述
```

#### 4. 提交并推送标签

```bash
# 提交更改
git add .
git commit -m "chore: 发布 vX.X.X"

# 推送代码和标签
git push origin main --tags
```

### CI/CD 自动构建

项目使用 GitHub Actions 自动构建和发布。

#### 构建配置文件

- 配置文件：`.github/workflows/build.yml`
- 触发条件：推送 `v*` 标签 或 手动触发

#### 构建流程

```
┌─────────────────────────────────────────────────────────────┐
│                    推送 v* 标签                              │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                              ▼
┌─────────────────────┐      ┌─────────────────────┐
│   build-mac Job     │      │   build-win Job     │
│   (macOS-latest)    │      │   (Windows-latest)  │
├─────────────────────┤      ├─────────────────────┤
│ 1. Setup Node.js 20 │      │ 1. Setup Node.js 20 │
│ 2. Setup Python 3.11│      │ 2. Setup Python 3.11│
│ 3. Install pnpm     │      │ 3. Install npm      │
│ 4. Install deps     │      │ 4. Install deps     │
│ 5. Build app        │      │ 5. Build app        │
│ 6. Upload .dmg      │      │ 6. Upload .exe      │
└──────────┬──────────┘      └──────────┬──────────┘
           │                            │
           └──────────────┬─────────────┘
                          ▼
              ┌─────────────────────┐
              │    release Job      │
              │   (Ubuntu-latest)   │
              ├─────────────────────┤
              │ 1. Download 产物    │
              │ 2. Create Release   │
              │ 3. Upload 文件      │
              └─────────────────────┘
```

#### 构建产物

| 平台 | 文件格式 | 构建环境 |
|------|----------|----------|
| macOS (Apple Silicon) | `.dmg` | macos-latest |
| Windows | `.exe` | windows-latest |

### 手动触发构建

在 GitHub 仓库页面：

1. 进入 **Actions** 标签页
2. 选择 **Build and Release** 工作流
3. 点击 **Run workflow**
4. 选择分支后运行

### 本地打包测试

```bash
# macOS
pnpm build:mac

# Windows
pnpm build:win

# 同时构建两个平台
pnpm build:all
```

### 打包配置

#### Electron Builder 配置

项目使用 `electron-builder` 进行打包，配置位于 `package.json`：

```json
{
  "build": {
    "appId": "com.personal.workstation",
    "productName": "Personal Workstation",
    "directories": {
      "output": "release"
    },
    "mac": {
      "target": ["dmg"],
      "category": "public.app-category.productivity"
    },
    "win": {
      "target": ["nsis", "portable"]
    }
  }
}
```

#### Python 服务打包

Python 服务使用 PyInstaller 打包为独立可执行文件：

- 配置文件：`python-service/build.spec`
- 构建脚本：`python-service/build.py`
- 打包后的可执行文件随应用一起分发

### 发布检查清单

发布前必须确认：

- [ ] 代码已通过 `pnpm lint` 检查
- [ ] 版本号已更新（package.json）
- [ ] Changelog 已更新（md/changelog.md）
- [ ] 本地构建测试通过
- [ ] 关键功能测试通过
- [ ] 标签已推送至 GitHub

### 常见问题

#### 构建失败

1. **依赖安装失败**：检查 `requirements.txt` 和 `package.json` 是否有冲突
2. **Python 打包失败**：确保 PyInstaller 版本为 6.19.0
3. **签名失败**：检查 `GH_TOKEN` 是否正确配置

#### 版本回退

```bash
# 删除远程标签
git push --delete origin vX.X.X

# 删除本地标签
git tag -d vX.X.X

# 回退提交后重新打标签
git reset --hard HEAD~1
```
