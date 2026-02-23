# 修改记录 (Changelog)

本文档记录项目的所有重要修改和变更。

---

## [0.5.22] - 2026-02-22

### 新增 (Added)

+- 项目开发规范完善
  - Python 开发规范（目录结构、代码规范、API 开发）
  - Electron-Python 通信规范（双通道架构、消息协议）
  - Agent 工具开发规范
  - Skills 技能开发规范

+- OCR API 端点
  - `/api/ocr/status` - 获取 OCR 服务状态
  - `/api/ocr/recognize` - Base64 图片 OCR 识别
  - `/api/ocr/recognize-file` - 文件路径 OCR 识别
  - `/api/ocr/save-to-knowledge` - 保存 OCR 结果到知识库

### 修改 (Changed)

- **Electron main.ts 模块化重构** (从 1280 行 → 145 行)
  - 创建 `electron/ipc/` 目录，按功能拆分 IPC 处理器
  - `registerUserIpc.ts` - 用户认证、存储、媒体权限
  - `registerModelIpc.ts` - 模型配置、对话管理
  - `registerKnowledgeIpc.ts` - 知识库管理
  - `registerMemoryIpc.ts` - 记忆管理
  - `registerOcrIpc.ts` - OCR 识别
  - `registerPythonIpc.ts` - Python 服务、Ollama、Skills
  - `main.ts` 简化为应用生命周期入口

- **Python db_service.py 模块化重构** (从 1261 行 → 95 行)
  - 创建 `python-service/api/` 模块化 API 层
  - `database.py` - 数据库连接管理
  - `models.py` - Pydantic 数据模型
  - `direct_api.py` - 直接调用接口（供 Agent 使用）
  - `routers/` - 各功能路由模块
    - `knowledge.py` - 知识库 API
    - `conversation.py` - 对话和消息 API
    - `memory.py` - 记忆和摘要 API
    - `user.py` - 用户 API
    - `ocr.py` - OCR API
  - `db_service.py` 简化为 FastAPI 应用入口

### 更新规范

- 更新 `.qoder/rules/rules.md` 目录结构
  - 添加 `electron/ipc/` 目录说明
  - 添加 `python-service/api/` 目录说明
  - 添加 OCR API 端点文档

---

## [0.5.14] - 2026-02-19

### 新增 (Added)

- Agent 模式快速通道功能
  - 后端自动检测 LLM 是否真正调用工具
  - 简单问题（问候、常识、创意写作等）直接流式输出
  - 复杂问题才显示思考过程和工具调用

### 修改 (Changed)

- 优化前端思考过程显示逻辑
  - 只有真正有工具调用（`toolCall.name` 存在）才显示思考过程下拉框
  - 简单问候不再显示冗余的"思考中"状态

---

## [0.5.13] - 2026-02-19

### 修复 (Fixed)

- 修复普通 LLM 模式下的双重打字机效果问题
  - 移除 `AIChatStreamingMessage` 组件中的 `useTypewriter` hook
  - 普通 LLM 模式通过 WebSocket 流式传输，内容本身已经是逐字到达的
  - 避免流式传输与打字机效果的二次叠加延迟

### 修改 (Changed)

- 更新 `.qoder/rules/rules.md` 项目规范
  - 删除已废弃的 FrontendBridge 前端桥接规范
  - 添加 Python 数据服务架构说明（HTTP API + WebSocket 双通道）
  - 添加 HTTP API 端点文档（知识库、对话、记忆、用户）
  - 添加 Skills 系统说明和消息协议类型

---

## [0.5.7] - 2026-02-18

### 新增 (Added)

- 网页采集工具
  - WebCrawlerService: 网页抓取、解析、分块、入库
  - WebCrawlTool: 抓取网页内容并添加到知识库
  - WebFetchTool: 仅获取网页内容（不入库）
  - 支持提取标题、正文、元数据
  - 自动文本分块处理

- 消息类型
  - web_crawl: 网页采集请求
  - web_fetch: 网页内容获取请求

---

## [0.5.6] - 2026-02-18

### 新增 (Added)

- 网页搜索工具
  - WebSearchTool：搜索互联网获取实时信息
  - NewsSearchTool：搜索最新新闻
  - 使用 DuckDuckGo 搜索引擎（无需 API 密钥）

- Function Calling 支持
  - 普通聊天支持工具调用（useTools 参数）
  - 工具可在 Agent 和普通 LLM 模式下使用
  - 自动处理工具调用循环

### 修改 (Changed)

- model_router.py 新增 chat_with_tools 方法
- message_handler.py 支持 useTools 参数
- websocket.ts 类型定义添加 useTools 字段

---

## [0.5.5] - 2026-02-18

### 修复 (Fixed)

- 修复 Deep Agent 工具转换和模型配置获取
  - 工具包装改用函数闭包方式（兼容 LangChain 新版本）
  - ModelConfig 对象属性访问适配
  - 默认模型获取逻辑修正

---

## [0.5.4] - 2026-02-16

### 新增 (Added)

- Python 进程管理服务 (AI-009)
  - 启动/停止/重启 Python 服务
  - 自动重启和健康检查机制
  - 服务状态监控
  - 日志输出管理
- AI 设置页面添加智能体服务管理 UI
  - 服务状态显示（运行中/已停止/错误）
  - 启动/停止/重启按钮
  - 端口配置
  - 最近日志展示

---

## [0.5.3] - 2026-02-16

### 新增 (Added)

- Python 环境检测服务 (AI-008)
  - 跨平台支持：macOS/Windows/Linux
  - 检测 Python 版本和安装路径
  - 检测 pip/pip3/poetry/conda 包管理器
  - 检测虚拟环境状态
  - 生成安装建议和引导
- AI 设置页面添加 Python 环境检测 UI
  - 环境状态卡片
  - 安装引导
  - 建议列表

---

## [0.5.2] - 2026-02-16

### 修复 (Fixed)

- 修复 @/types/electron 导入错误
  - 将 electron.d.ts 重命名为 electron.ts
  - .d.ts 文件不支持运行时导出，Vite 无法正确解析

---

## [0.5.1] - 2026-02-16

### 修复 (Fixed)

- 修复 ws 模块 bufferutil 依赖错误
  - 将 bufferutil、utf-8-validate 添加到 vite external 配置

### 修改 (Changed)

- 升级 antd 从 5.x 到 6.x 以兼容 @ant-design/x
- 重构 AI 聊天界面，参考 ai-view.html 设计稿
  - 添加对话历史侧边栏
  - 添加模型选择功能
  - 优化消息列表样式
  - 完善输入工具栏
- 修正 ai-tasks.md 时间错误

---

## [0.5.0] - 2026-02-16

### 新增 (Added)

- WebSocket 通信层
  - 创建 `websocketService.ts` WebSocket 服务器服务
  - 心跳检测和自动断开机制
  - 消息协议类型定义（`electron/types/websocket.ts`）

- AI 聊天界面
  - 创建 `AIChat` 页面组件
  - 消息列表渲染（用户/AI 样式区分）
  - 多行输入框（Enter 发送/Shift+Enter 换行）
  - 连接状态实时显示

- WebSocket 客户端 Hook
  - 创建 `useWebSocket` Hook
  - 自动连接和重连机制
  - 消息发送和接收封装

- 导航更新
  - 侧边栏添加「AI 助手」菜单入口
  - 路由配置添加 `/ai-chat` 路径

### 修改 (Changed)

- 更新 `main.ts` 启动 WebSocket 服务器
- 更新 `preload.ts` 添加 `getWsInfo` IPC 调用
- 更新类型声明支持 WebSocket 相关类型导出

---

## [0.4.6] - 2026-02-13

### 新增 (Added)

- 类型定义规范化
  - 创建 `electron/types/` 目录独立管理接口定义
  - `user.ts` - 用户相关类型（User、LoginResult、LoginCredentials 等）
  - `storage.ts` - 存储和头像相关类型
  - `index.ts` - 统一导出

- Settings 页面组件解耦
  - `GeneralSettings` - 常规设置（主题切换）
  - `ProfileSettings` - 个人信息（含头像功能）
  - `StorageSettings` - 存储管理
  - `AboutSettings` - 关于页面

- 头像功能完整实现
  - 创建 `avatarService.ts` 头像服务
  - 支持文件选择对话框
  - 支持 JPG、PNG、WebP、GIF 格式（最大 5MB）
  - 自动转换为 base64 格式用于预览
  - 保存到应用数据目录

### 修改 (Changed)

- 更新 `preload.ts` 引用独立类型文件
- 更新 `src/types/electron.d.ts` 引用主进程类型定义
- 重构 `Settings/index.tsx` 为导航容器，各模块独立渲染

---

## [0.4.5] - 2026-02-13

### 新增 (Added)

- 存储管理服务 (`electron/services/storageService.ts`)
  - 获取应用存储信息（缓存大小、总大小、数据库大小、日志大小）
  - 缓存清理功能
  - 字节格式化工具函数
- IPC 通信扩展
  - `storage:getInfo` - 获取存储信息
  - `storage:clearCache` - 清理缓存
- 类型声明扩展
  - `StorageInfo` 接口
  - `ClearCacheResult` 接口

### 修改 (Changed)

- Settings 页面个人信息功能完善
  - 用户昵称、邮箱、手机号、简介编辑
  - 数据保存到 SQLite 数据库
  - 保存按钮和加载状态
- Settings 页面存储管理功能完善
  - 实时显示缓存大小和总占用
  - 存储详情（数据库、日志、路径）
  - 一键清理缓存功能

---

## [0.4.4] - 2026-02-13

### 新增 (Added)

- 设置页面
  - 常规设置：外观模式切换
  - 个人信息：用户名、邮箱编辑
  - AI 设置入口：跳转到高级 AI 配置
  - 存储管理：缓存监控与清理
  - 关于：版本信息
- AI 模型设置页面
  - 在线 API 配置：OpenAI、阿里云百炼、智谱 AI
  - 本地模型配置：Ollama 连接设置
  - 连接测试功能

---

## [0.4.3] - 2026-02-15

### 新增 (Added)

- JSON 美化工具支持 JavaScript 对象格式
  - 支持键名无引号的 JS 对象格式
  - 智能移除注释（正确处理字符串内的 `//`，如 URL）
  - 多重解析策略：JSON.parse → Function 直接解析 → 移除注释后解析

---

## [0.4.2] - 2026-02-15

### 新增 (Added)

- 升级 JSON 美化工具编辑器
  - 集成 Monaco Editor（VS Code 同款编辑器）
  - 自动换行对齐
  - 输入双引号自动配对
  - 输入冒号后自动添加成对双引号
  - JSON 格式错误时显示波浪线提示
  - 对比差异时高亮显示不同行

---

## [0.4.1] - 2026-02-15

### 修改 (Changed)

- 优化侧边栏导航组件
  - 使用 useNavigate 替代 href 进行路由跳转
  - 使用 useLocation 自动判断选中状态（支持嵌套路由）
  - 退出登录调用 logout 方法
  - 优化选中状态样式为 primary 高亮

- 优化页面布局结构
  - WLayout 使用 flex 布局，内容区自适应高度
  - Developer 布局优化标签页样式
  - 所有页面添加 min-h-full 确保填充满父元素高度

### 新增 (Added)

- 添加页面切换动画
  - fadeIn 淡入动画（0.2s）
  - slideIn 滑入动画（0.2s）

---

## [0.4.0] - 2026-02-15

### 新增 (Added)

- 开发者工具模块
  - 创建 Developer 布局组件，包含顶部菜单栏
  - JSON 美化工具：支持双栏对比、美化、差异检测
  - 图片 Base64 转换工具：图片与 Base64 双向转换
  - 颜色转换工具：HEX/RGB/HSL 颜色格式转换
  - Excel 转 JSON 工具：CSV 文件转 JSON 格式
  - 简易 Postman：支持 GET/POST/PUT/DELETE 等请求
  - OCR 功能：图片文字识别（模拟模式）

### 修改 (Changed)

- 按照 rules.md 规范重组文件结构
  - 每个页面放入独立的 PascalCase 文件夹
  - 入口文件统一命名为 index.tsx
  - 配置文件统一命名为 config.ts

---

## [0.3.6] - 2026-02-15

### 修改 (Changed)

- 重构页面布局结构
  - 创建 WLayout 布局组件，包含侧边栏、头部、内容区
  - 使用 React Router 嵌套路由，所有受保护页面共享布局
  - Home 页面只保留内容区域，移除布局相关代码
  - ProtectedRoute 支持 Outlet 模式渲染子路由
  - AI 悬浮按钮移至 WLayout 组件

---

## [0.3.5] - 2026-02-15

### 修复 (Fixed)

- 修复 antd message 静态方法警告
  - 在 App.tsx 中添加 AntdApp 组件包裹
  - 使用 App.useApp() hook 获取 message 实例
  - 更新 Login、ForgotPassword、WHeader 组件使用动态主题上下文

---

## [0.3.4] - 2026-02-15

### 修复 (Fixed)

- 修复 SQLite datetime 函数语法错误
  - 将 `datetime("now", "localtime")` 改为 `datetime('now', 'localtime')`
  - SQLite 要求字符串字面量使用单引号
  - 使用反引号包裹 SQL 语句避免 JavaScript 嵌套引号问题

---

## [0.3.3] - 2026-02-14

### 修改 (Changed)

- 重新设计登录页面布局
  - 按照 login.html 设计更新 WAuthLayout 组件
  - 添加背景模糊圆形装饰效果 (blur-[120px])
  - 移除 Tabs，改为登录/注册切换模式
  - 添加记住我 checkbox
  - 添加密码显示/隐藏切换按钮
  - 添加其他登录方式（扫码登录、指纹登录）
  - 添加底部注册/登录链接

---

## [0.3.2] - 2026-02-14

### 修改 (Changed)

- 使用 @types/better-sqlite3 替代自定义类型声明
  - 安装 @types/better-sqlite3 开发依赖
  - 删除自定义的 electron/types/better-sqlite3.d.ts 类型声明文件
  - 删除空的 electron/types 目录
  - 将 better-sqlite3 正确添加到 package.json 依赖

### 修复 (Fixed)

- 修复 ESLint 错误
  - userService.ts 中未使用变量警告
  - ForgotPassword 页面中未使用的状态变量

---

## [0.3.1] - 2026-02-14

### 修复 (Fixed)

- 修复 Tailwind 边框颜色配置
  - 将 `border-color` 改为 `border` 对象结构
  - `border-border` 类现在正确使用 `--color-border` CSS 变量
  - 边框颜色在深色模式下显示为 `#334155` 而非白色

---

## [0.3.0] - 2026-02-14

### 新增 (Added)

- 实现主题切换功能
  - 创建 CSS 变量文件 `src/styles/themes/variables.css`
  - 定义深色/浅色模式的颜色变量
  - 添加主题切换过渡动画

- 创建主题管理系统
  - 创建 `ThemeContext` 主题上下文
  - 创建 `useTheme` Hook
  - 支持三种主题模式：light、dark、system
  - 默认跟随系统主题
  - 使用 localStorage 持久化用户选择

- 配置 Ant Design 主题
  - 创建 `antd-theme.ts` 配置文件
  - 根据当前主题动态切换 Ant Design 组件样式
  - 深色/浅色模式完整适配

- 更新 Tailwind CSS 配置
  - 使用 CSS 变量定义主题色
  - 支持 `bg-primary`、`text-primary`、`border-color` 等主题类

- 更新所有组件使用主题变量
  - WSidebar、WHeader、WCard、WProgress 组件适配主题
  - Home 页面完全适配深色/浅色模式

### 更新规范

- 添加主题规范章节
- 添加 Git 提交前 TS 检查规范
- 添加主题变量对照表

---

## [0.2.1] - 2026-02-14

### 修复 (Fixed)

- 修复 Tailwind CSS 配置问题
  - 补充 tailwind.config.js 的 content 配置
  - 重写所有全局组件使用 Tailwind CSS 原子类
  - WSidebar、WHeader、WCard、WProgress 组件完全使用 Tailwind CSS

---

## [0.2.0] - 2026-02-14

### 新增 (Added)

- 集成 Tailwind CSS
  - 安装 tailwindcss, postcss, autoprefixer
  - 创建 tailwind.config.js 配置文件
  - 创建 postcss.config.js 配置文件
  - 创建 src/styles/global.css 全局样式文件

- 创建路由系统
  - 安装 react-router-dom
  - 创建 src/router/index.tsx 路由配置文件
  - 配置页面路由: /, /developer, /gis, /journal, /notes, /todo

- 创建 Home 页面
  - 创建 src/views/Home 目录
  - index.tsx - 页面组件
  - config.ts - 配置文件

- 创建全局组件 (使用 Tailwind CSS)
  - WSidebar - 侧边栏导航组件
  - WHeader - 页面头部组件
  - WCard - 卡片组件
  - WProgress - 进度条组件
  - 每个组件包含 README.md 文档

- 更新项目规范
  - 添加 Tailwind CSS 使用规范
  - 添加路由配置规范
  - 更新样式规范: 简单样式使用 Tailwind, 复杂样式使用 SCSS

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
