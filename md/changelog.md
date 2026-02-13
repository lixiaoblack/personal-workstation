# 修改记录 (Changelog)

本文档记录项目的所有重要修改和变更。

---

## [0.1.1] - 2026-02-13

### 修复 (Fixed)

- 修复 Electron 启动配置问题
  - 添加 vite-plugin-electron 插件
  - 添加 vite-plugin-electron-renderer 插件
  - 更新 vite.config.ts 配置 Electron 主进程和预加载脚本构建
  - 简化 package.json 脚本命令
  - 更新 .gitignore 排除 dist-electron 目录

---

## [0.1.0] - 2026-02-13

### 新增 (Added)

- 创建项目基础结构
  - 使用 Vite + React + TypeScript 初始化项目
  - 集成 Ant Design 5.x UI 组件库
  - 配置 Electron 桌面应用框架
  - 使用 pnpm 作为包管理器

- 创建项目配置文件
  - `package.json` - 项目配置和依赖管理
  - `vite.config.ts` - Vite 构建配置
  - `tsconfig.json` - TypeScript 配置
  - `eslint.config.js` - ESLint 代码检查配置
  - `.gitignore` - Git 忽略规则

- 创建 Electron 主进程
  - `electron/main.ts` - 主进程入口文件
  - `electron/preload.ts` - 预加载脚本

- 创建 React 应用入口
  - `src/main.tsx` - React 入口文件
  - `src/App.tsx` - 根组件
  - `src/App.css` - 组件样式
  - `src/index.css` - 全局样式

- 创建项目规范文档
  - `.qoder/rules/rules.md` - 项目开发规范

- 创建项目文档
  - `md/tasks.md` - 任务情况记录
  - `md/changelog.md` - 修改记录 (本文件)

- 初始化 Git 仓库
  - 配置远程仓库: git@github.com:lixiaoblack/personal-workstation.git

---

## 版本说明

版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范：

- **主版本号**: 不兼容的 API 修改
- **次版本号**: 向下兼容的功能性新增
- **修订号**: 向下兼容的问题修正

---

## 修改类型说明

| 类型 | 说明 |
|------|------|
| Added | 新增功能 |
| Changed | 功能变更 |
| Fixed | 问题修复 |
| Removed | 功能移除 |
| Security | 安全相关 |
