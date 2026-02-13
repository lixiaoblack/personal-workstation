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
│   └── changelog.md            # 修改记录
├── electron/                   # Electron 主进程
│   ├── main.ts                 # 主进程入口
│   └── preload.ts              # 预加载脚本
├── src/                        # 渲染进程源码
│   ├── main.tsx                # React 入口
│   ├── App.tsx                 # 根组件
│   ├── components/             # 通用组件
│   ├── pages/                  # 页面组件
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
3. **样式**: 使用 Ant Design 主题系统，自定义样式使用 CSS Modules
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
