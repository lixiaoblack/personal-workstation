# AI 知识库与智能体功能 - 任务清单

> 本文档独立记录 AI 功能开发任务进度，与主项目任务清单互不关联

---

## 任务统计

| 状态 | 数量 |
|------|------|
| 进行中 | 0 |
| 已完成 | 19 |
| 待处理 | 21 |

---

## Phase 1：基础通信与聊天界面 (预计 1 周)

### 进行中

暂无

### 已完成

- [x] AI-000: 设置页面基础开发 | 完成时间: 2026-02-13 18:00
  - Settings 主设置页面
  - AISettings AI 模型配置页面
  - 路由配置

- [x] AI-001: 个人信息和存储管理功能 | 完成时间: 2026-02-13 19:30
  - 个人信息编辑保存到 SQLite
  - 存储管理服务
  - 缓存大小获取和清理功能

- [x] AI-002: WebSocket 通信层 - 主进程服务器 | 完成时间: 2026-02-16 22:00
  - 安装 ws 依赖
  - 创建 WebSocket 服务器服务
  - 心跳检测机制

- [x] AI-003: WebSocket 通信层 - 消息协议设计 | 完成时间: 2026-02-16 22:00
  - 定义消息类型枚举
  - 创建消息接口和辅助函数

- [x] AI-004: WebSocket 通信层 - 渲染进程客户端 | 完成时间: 2026-02-16 22:00
  - 创建 useWebSocket Hook
  - 自动连接和重连机制

- [x] AI-005: 聊天界面 - 页面布局与路由 | 完成时间: 2026-02-16 22:00
  - 创建 AIChat 页面组件
  - 添加路由配置
  - 侧边栏菜单入口

- [x] AI-006: 聊天界面 - 消息列表组件 | 完成时间: 2026-02-16 22:00
  - 消息列表渲染
  - 用户/AI 消息样式区分
  - 自动滚动到底部

- [x] AI-007: 聊天界面 - 输入框组件 | 完成时间: 2026-02-16 22:00
  - 多行输入框
  - Enter 发送/Shift+Enter 换行
  - 发送状态管理

- [x] AI-008: 聊天界面 - WebSocket 消息收发 | 完成时间: 2026-02-16 22:00
  - 消息发送和响应处理
  - 连接状态显示

- [x] AI-009: Python 服务管理 - 系统环境检测 | 完成时间: 2026-02-16 23:00
  - 检测系统 Python 版本（跨平台：macOS/Windows/Linux）
  - 检测 pip/pip3/poetry/conda 包管理器
  - 检测虚拟环境状态
  - 生成安装建议和引导
  - AI 设置页面集成环境检测 UI

- [x] AI-010: Python 服务管理 - 子进程启动/停止 | 完成时间: 2026-02-16 23:30
  - 创建 Python 进程管理服务
  - 支持启动/停止/重启操作
  - 自动重启和健康检查机制
  - 服务状态监控和日志管理
  - AI 设置页面集成服务管理 UI

### 待处理

暂无

---

## Phase 2：Python 服务与模型接入 (预计 1-2 周)

### 进行中

暂无

### 已完成

- [x] AI-011: Python 服务管理 - WebSocket 桥接 | 完成时间: 2026-02-17 00:30
  - 创建 Python 智能体服务脚本（main.py, ws_client.py, message_handler.py）
  - Python 服务作为 WebSocket 客户端连接 Electron
  - 实现渲染进程 -> Electron WS -> Python 服务的消息路由
  - 添加客户端标识机制（renderer/python_agent）
  - 支持 Python 服务状态广播

- [x] AI-012: 模型配置 - 配置存储到 SQLite | 完成时间: 2026-02-17 01:30
  - 创建模型配置类型定义（electron/types/model.ts）
  - 添加模型配置数据库迁移
  - 创建模型配置服务（CRUD 操作）
  - 支持 OpenAI、百炼、智谱、Ollama 等提供商
  - 添加 IPC 处理器和渲染进程 API

- [x] AI-013: 模型配置 - AI 设置页面完善 | 完成时间: 2026-02-17 02:00
  - 创建 ModelConfigCard 组件（显示/编辑/删除/测试）
  - 创建 ModelConfigModal 组件（添加/编辑弹窗）
  - 重构 AISettings 页面集成 SQLite 存储
  - 支持启用/禁用、设为默认、优先级管理

- [x] AI-014: 模型路由 - 在线 API 连接 | 完成时间: 2026-02-17 03:00
  - 创建模型路由类型定义（AIChatMessage, ChatRequest, ChatCompletionResponse）
  - 创建模型路由服务（modelRouterService.ts）
  - 集成 OpenAI SDK，支持 OpenAI 兼容 API
  - 支持流式响应（sendChatRequestStream）
  - 支持连接测试（testModelConnection）
  - 添加 IPC 处理器和渲染进程 API
  - **架构重构**：迁移至 Python 端使用 LangChain
  - **修复**：模型配置同步到 Python 服务
  - **修复**：ModelConfig 缺少 id 字段

- [x] AI-015: 模型路由 - Ollama 连接 | 完成时间: 2026-02-16 15:30
  - 扩展 WebSocket 消息类型，添加 Ollama 相关消息类型
  - 实现 Electron IPC 处理器，通过 WebSocket 转发 Ollama 请求到 Python
  - 扩展 WebSocket 服务消息路由，支持 Ollama 消息转发和响应处理
  - AIChat 页面集成 Ollama 模型选择交互，显示提供商标签
  - 支持获取 Ollama 状态、模型列表、连接测试
  - ModelConfigModal 添加 Ollama 模型自动发现功能，下拉选择已有模型

- [x] AI-016: 模型状态管理 - MobX 集成 | 完成时间: 2026-02-16 16:30
  - 安装 mobx 和 mobx-react-lite 依赖
  - 创建 modelStore 管理模型列表和当前选中模型
  - AIChat 页面使用 MobX observer 自动响应状态变化
  - AISettings 页面配置变更后自动同步 MobX Store
  - 解决模型配置后 AIChat 页面不刷新的问题

- [x] AI-017: 上下文管理 - 滑动窗口策略 | 完成时间: 2026-02-16 17:30
  - 添加 HistoryMessageItem 类型支持历史消息传递
  - Electron 端添加 getRecentMessages API 获取最近 N 条消息
  - AIChat 页面发送消息时携带历史记录（默认 20 条）
  - Python 端优先使用传入的历史记录，兼容旧客户端
  - 支持切换对话时自动加载上下文
  - 重启软件后上下文不丢失（数据存储在 SQLite）

- [x] AI-018: LangGraph 智能体 - ReAct Agent 基础实现 | 完成时间: 2026-02-16 19:00
  - 创建 agent 模块（state.py, tools.py, graph.py）
  - 实现 AgentState 状态管理（TypedDict + 详细注释）
  - 实现 ToolRegistry 工具注册机制（动态注册 + OpenAI 格式）
  - 内置 CalculatorTool 和 EchoTool 示例工具
  - 实现 ReActAgent 基于 LangGraph 的 ReAct 循环
  - 扩展 WebSocket 消息协议支持 agent_step 等消息类型
  - 集成 agent_chat 消息处理到 message_handler

### 待处理

暂无

---

## Phase 3：LangGraph 智能体核心 (预计 2 周)

### 进行中

暂无

### 已完成

暂无

### 待处理

- [ ] AI-018: LangGraph 智能体 - ReAct Agent 基础实现 | 创建时间: 2026-02-17
- [ ] AI-019: LangGraph 智能体 - Deep Agents 集成 | 创建时间: 2026-02-17
- [ ] AI-020: LangGraph 智能体 - 多轮对话状态管理 | 创建时间: 2026-02-17
- [ ] AI-021: MCP 集成 - MCP 客户端实现 | 创建时间: 2026-02-17
- [ ] AI-022: MCP 集成 - 工具动态注册 | 创建时间: 2026-02-17
- [ ] AI-023: MCP 集成 - MCP 服务器管理 | 创建时间: 2026-02-17
- [ ] AI-024: Skills 系统 - 技能注册机制 | 创建时间: 2026-02-17
- [ ] AI-025: Skills 系统 - 热加载支持 | 创建时间: 2026-02-17
- [ ] AI-026: Skills 系统 - 内置技能实现 | 创建时间: 2026-02-17

---

## Phase 4：RAG 知识库 (预计 2 周)

### 进行中

暂无

### 已完成

暂无

### 待处理

- [ ] AI-027: 向量存储 - LanceDB 集成 | 创建时间: 2026-02-17
- [ ] AI-028: 文档处理 - 多格式解析 (MD/PDF/TXT) | 创建时间: 2026-02-17
- [ ] AI-029: 文档处理 - 分块策略 | 创建时间: 2026-02-17
- [ ] AI-030: 文档处理 - 嵌入模型集成 | 创建时间: 2026-02-17
- [ ] AI-031: 知识库 UI - 文档管理界面 | 创建时间: 2026-02-17
- [ ] AI-032: 知识库 UI - 配置界面 | 创建时间: 2026-02-17

---

## Phase 5：MCP & Skills UI 扩展 (预计 1-2 周)

### 进行中

暂无

### 已完成

暂无

### 待处理

- [ ] AI-033: MCP 管理 UI - MCP 服务器配置界面 | 创建时间: 2026-02-17
- [ ] AI-034: MCP 管理 UI - 工具列表展示 | 创建时间: 2026-02-17
- [ ] AI-035: MCP 管理 UI - 连接状态监控 | 创建时间: 2026-02-17
- [ ] AI-036: Skills 管理 UI - 技能列表 | 创建时间: 2026-02-17
- [ ] AI-037: Skills 管理 UI - 自定义技能上传 | 创建时间: 2026-02-17
- [ ] AI-038: Skills 管理 UI - 技能启用/禁用 | 创建时间: 2026-02-17

---

## Phase 6：完善与优化 (后期)

### 待处理

- [ ] AI-039: 打包部署 - PyInstaller 脚本 | 创建时间: 2026-02-17
- [ ] AI-040: 打包部署 - 自动更新机制 | 创建时间: 2026-02-17
- [ ] AI-041: 聊天界面 - 流式消息显示优化 | 创建时间: 2026-02-17

---

*文档版本: v1.3*
*创建时间: 2026-02-13*
*最后更新: 2026-02-16*
