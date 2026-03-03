# 智能体搭建平台 - 任务清单

> 本文档记录智能体搭建平台（类 Dify）的开发任务，按功能模块组织，每个模块开发完即可测试

---

## 任务统计

| 状态 | 数量 |
|------|------|
| 进行中 | 0 |
| 已完成 | 26 |
| 待处理 | 13 |

---

## 项目概述

### 目标

构建一个可视化智能体搭建平台，让用户无需编写代码即可创建、配置、发布智能体。

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + TypeScript + Ant Design + ReactFlow |
| 后端 | Python + FastAPI + LangGraph |
| 存储 | SQLite |
| 通信 | WebSocket + HTTP API |

---

## 功能模块概览

| 模块 | 功能 | 预计时间 | 优先级 |
|------|------|----------|--------|
| M1 | 智能体列表与管理 | 3 天 | P0 |
| M2 | 智能体创建与编辑 | 4 天 | P0 |
| M3 | 工作流编排 | 2 周 | P0 |
| M4 | 智能体对话 | 3 天 | P0 |
| M5 | 模板系统 | 2 天 | P1 |

---

## M1: 智能体列表与管理

**目标**：用户可以查看、创建、删除智能体

**状态**：✅ 已完成 (2026-03-02)

### 已完成

- [x] M1-01: 数据库 - agents 表
  - 创建 `agents` 表
  - 字段：id, name, description, avatar, model_id, system_prompt, tools, knowledge_ids, skills, parameters, status, created_at, updated_at
  - 文件：`python-service/api/database.py`

- [x] M1-02: 后端 API - 智能体 CRUD
  - 创建 `python-service/api/routers/agents.py`
  - GET `/api/agents` - 获取列表
  - GET `/api/agents/{id}` - 获取详情
  - POST `/api/agents` - 创建
  - PUT `/api/agents/{id}` - 更新
  - DELETE `/api/agents/{id}` - 删除
  - POST `/api/agents/{id}/duplicate` - 复制

- [x] M1-03: Electron IPC - 智能体通信
  - 创建 `electron/ipc/registerAgentBuilderIpc.ts`
  - 添加智能体 CRUD IPC 处理器
  - 更新 `electron/preload.ts` 暴露 API

- [x] M1-04: 前端类型定义
  - 创建 `src/types/agent.ts`
  - 定义 Agent, AgentConfig, AgentListResponse 接口

- [x] M1-05: 前端 Hook - 智能体管理
  - 创建 `src/hooks/useAgents.ts`
  - getList, getById, create, update, remove, duplicate 方法

- [x] M1-06: 组件 - AgentCard 智能体卡片
  - 创建 `src/views/Agents/components/AgentCard/`
  - 展示头像、名称、描述、模型、状态
  - 操作按钮：对话、编辑、删除
  - 悬停效果、选中高亮

- [x] M1-07: 页面 - 智能体列表页
  - 创建 `src/views/Agents/index.tsx`
  - 顶部：标题 + 创建按钮
  - 搜索栏：关键词搜索
  - 内容区：卡片网格布局
  - 空状态引导
  - 删除确认弹窗

- [x] M1-08: 路由与菜单集成
  - 添加 `/agents` 路由
  - 侧边栏添加"智能体"菜单项

### 验收标准

- [x] 页面可正常访问，显示智能体列表
- [x] 点击"创建"可跳转到创建页（占位页面即可）
- [x] 点击卡片可跳转到编辑页（占位页面即可）
- [x] 点击删除可删除智能体
- [x] 搜索功能正常工作

---

## M2: 智能体创建与编辑

**目标**：用户可以配置智能体的基础信息、提示词、工具、知识库等

**状态**：✅ 已完成 (2026-03-02)

### 已完成

- [x] M2-01: 组件 - BasicConfig 基础配置
  - 创建 `src/views/Agents/AgentBuilder/components/BasicConfig/`
  - 名称输入框
  - 描述文本域
  - 头像选择（预设图标）
  - 模型选择下拉框（从已有模型配置加载）

- [x] M2-02: 组件 - PromptEditor 提示词编辑器
  - 创建 `src/views/Agents/AgentBuilder/components/PromptEditor/`
  - 多行文本编辑器
  - 变量插入按钮
  - 字数统计

- [x] M2-03: 组件 - ToolSelector 工具选择器
  - 创建 `src/views/Agents/AgentBuilder/components/ToolSelector/`
  - 从后端获取可用工具列表
  - 多选开关
  - 已选工具标签展示
  - 工具说明弹窗

- [x] M2-04: 组件 - KnowledgeBinder 知识库绑定
  - 创建 `src/views/Agents/AgentBuilder/components/KnowledgeBinder/`
  - 从后端获取知识库列表
  - 多选绑定
  - 检索参数配置（top_k）

- [x] M2-05: 组件 - AdvancedConfig 高级配置
  - 创建 `src/views/Agents/AgentBuilder/components/AdvancedConfig/`
  - 温度滑块（0-2）
  - 最大迭代次数
  - 开场白配置

- [x] M2-06: 页面 - 智能体配置页
  - 创建 `src/views/Agents/AgentBuilder/index.tsx`
  - 左侧：配置表单（Tab 切换各配置模块）
  - 右侧：预览对话窗口（可选，Phase 2.5）
  - 顶部：返回、标题、保存按钮
  - 表单验证
  - 创建/编辑模式复用

- [x] M2-07: 路由配置
  - 添加 `/agents/create` 路由
  - 添加 `/agents/:id/edit` 路由

### 验收标准

- [x] 可创建新智能体并保存到数据库
- [x] 可编辑已有智能体
- [x] 表单验证正常（名称必填等）
- [x] 保存后跳转回列表页
- [x] 工具、知识库选择正常保存

---

## M3: 工作流编排器

**目标**：拖拽式可视化工作流编辑器，支持条件分支和循环

**依赖**：M1、M2

**状态**：✅ 已完成 (2026-03-02)

### 已完成

- [x] M3-01: 数据库 - workflows 表
  - 创建 `workflows` 表
  - 字段：id, agent_id, name, description, nodes, edges, variables, status, created_at, updated_at
  - 文件：`python-service/api/database.py`

- [x] M3-02: 后端 API - 工作流 CRUD
  - 创建 `python-service/api/routers/workflows.py`
  - GET `/api/workflows/list` - 列表
  - GET `/api/workflows/{id}` - 详情
  - POST `/api/workflows/create` - 创建
  - PUT `/api/workflows/{id}` - 更新
  - DELETE `/api/workflows/{id}` - 删除
  - POST `/api/workflows/{id}/duplicate` - 复制
  - POST `/api/workflows/{id}/publish` - 发布
  - POST `/api/workflows/{id}/execute` - 执行

- [x] M3-03: 后端 - 工作流执行引擎
  - 创建 `python-service/workflow/executor.py`
  - 解析工作流 JSON
  - 按拓扑顺序执行节点
  - 条件分支处理
  - 循环处理
  - 变量传递
  - 支持 12 种节点类型

- [x] M3-04: 前端类型定义
  - 创建 `src/types/workflow.ts`
  - 定义 WorkflowNode, WorkflowEdge, WorkflowVariable 接口
  - 定义各节点配置类型

- [x] M3-05: ReactFlow 集成
  - 安装 @xyflow/react 依赖
  - 创建基础画布组件
  - 自定义节点样式

- [x] M3-06: 基础节点组件开发
  - 创建 `src/views/Workflow/WorkflowEditor/nodes/`
  - StartNode 开始节点
  - EndNode 结束节点
  - LLMNode LLM 调用节点
  - ToolNode 工具调用节点
  - KnowledgeNode 知识检索节点
  - ConditionNode 条件分支节点
  - LoopNode 循环节点

- [x] M3-07: 交互节点组件开发
  - FileSelectNode 文件选择节点（Electron 客户端特性）
    - 选择本地文件/文件夹路径
    - 支持多选、类型过滤、大小检查
    - 直接读取本地文件内容，无需上传
  - UserInputNode 用户输入节点（文本输入、下拉选择、多选框）
  - HumanReviewNode 人工审核节点（暂停工作流等待审批）
  - MessageNode 消息输出节点（向用户展示信息）
  - WebhookNode Webhook 触发节点（外部系统触发工作流）

- [x] M3-08: 节点面板与配置面板
  - 创建 `src/views/Workflow/WorkflowEditor/components/NodePanel/`
  - 创建 `src/views/Workflow/WorkflowEditor/components/NodeConfig/`
  - 节点拖拽到画布
  - 点击节点显示配置
  - 配置面板从数据库加载模型、知识库数据

- [x] M3-09: 页面 - 工作流编排页
  - 创建 `src/views/Workflow/WorkflowEditor/index.tsx`
  - 左侧：节点面板
  - 中间：画布区域
  - 右侧：节点配置面板
  - 顶部：工具栏（名称编辑、保存、测试、发布）
  - 工作流列表页 `src/views/Workflow/WorkflowList/index.tsx`

- [x] M3-10: 智能体绑定工作流
  - 智能体配置页添加工作流选择组件
  - WorkflowSelector 组件
  - agents 表添加 workflow_id 字段
  - 对话时调用工作流执行

- [x] M3-11: 工作流交互执行
  - 文件选择交互（Electron 原生文件对话框）
  - 用户输入表单收集与验证
  - 人工审核状态管理与通知
  - 执行暂停/恢复机制

### 验收标准

- [x] 可拖拽节点到画布
- [x] 节点可连线
- [x] 节点配置正常保存
- [x] 简单工作流可执行
- [x] 条件分支正常工作
- [x] 文件选择节点可选择本地文件并读取内容
- [x] 用户输入节点可收集表单数据
- [x] 人工审核节点可暂停/恢复工作流

---

## M4: 智能体对话

**目标**：每个智能体有独立的对话界面，支持流式响应和思考过程展示

**依赖**：M1、M2、M3

### 待处理

- [ ] M4-01: 数据库 - agent_conversations 表
  - 创建 `agent_conversations` 表
  - 字段：id, agent_id, title, messages, created_at, updated_at

- [ ] M4-02: 后端 API - 对话管理
  - 扩展 `python-service/api/routers/agents.py`
  - GET `/api/agents/{id}/conversations` - 对话列表
  - GET `/api/agents/{id}/conversations/{conv_id}` - 对话详情
  - DELETE `/api/agents/{id}/conversations/{conv_id}` - 删除对话

- [ ] M4-03: 后端 - 智能体对话执行
  - 扩展 `python-service/message_handler.py`
  - 支持 agent_chat 消息类型
  - 从数据库加载智能体配置
  - 动态绑定工具、知识库
  - 流式响应 + 思考过程推送

- [ ] M4-04: Electron IPC - 对话通信
  - 扩展 `electron/ipc/registerAgentBuilderIpc.ts`
  - 对话 CRUD IPC 处理器

- [ ] M4-05: 前端类型定义
  - 扩展 `src/types/agent.ts`
  - 定义 AgentConversation, AgentMessage 接口

- [ ] M4-06: 前端 Hook - 智能体对话
  - 创建 `src/hooks/useAgentChat.ts`
  - WebSocket 连接
  - 消息发送/接收
  - 流式响应处理
  - 思考过程状态

- [ ] M4-07: 页面 - 智能体对话页
  - 创建 `src/views/Agents/AgentChat/index.tsx`
  - 左侧：历史对话列表
  - 右侧：对话区域
  - 顶部：智能体信息
  - 消息列表：用户/AI 消息样式
  - 思考过程折叠展示
  - 底部：输入框

- [ ] M4-08: 路由配置
  - 添加 `/agents/:id/chat` 路由
  - AgentCard "对话"按钮跳转

### 验收标准

- [ ] 点击"对话"进入智能体对话页
- [ ] 显示智能体名称、描述
- [ ] 发送消息可收到 AI 流式回复
- [ ] 思考过程正确展示
- [ ] 历史对话列表正常显示
- [ ] 可新建/删除对话

---

## M5: 模板系统

**目标**：提供预置模板，用户可一键创建智能体

**依赖**：M1、M2、M3、M4

### 待处理

- [ ] M5-01: 预置模板数据
  - 创建 `python-service/templates/` 目录
  - 知识问答助手模板（knowledge-assistant.yaml）
  - 内容创作助手模板（content-creator.yaml）
  - 网页研究助手模板（web-researcher.yaml）
  - 任务管理助手模板（task-manager.yaml）

- [ ] M5-02: 后端 API - 模板管理
  - 创建 `python-service/api/routers/templates.py`
  - GET `/api/templates` - 模板列表
  - GET `/api/templates/{id}` - 模板详情
  - POST `/api/templates/{id}/instantiate` - 基于模板创建智能体

- [ ] M5-03: Electron IPC - 模板通信
  - 扩展 `electron/ipc/registerAgentBuilderIpc.ts`
  - 模板相关 IPC 处理器

- [ ] M5-04: 组件 - AgentTemplateModal 模板选择弹窗
  - 创建 `src/views/Agents/components/AgentTemplateModal/`
  - 模板列表网格布局
  - 模板卡片：图标、名称、描述、使用按钮
  - "从空白创建"选项
  - 模板详情预览

- [ ] M5-05: 集成到创建流程
  - 智能体列表页"创建"按钮打开模板弹窗
  - 选择模板后跳转配置页（预填数据）

### 验收标准

- [ ] 点击"创建智能体"弹出模板选择
- [ ] 模板列表正确显示
- [ ] 选择模板后跳转配置页，数据预填
- [ ] 选择"空白创建"跳转空白配置页

---

## 模块依赖关系

```
M1 (智能体列表) ──→ M2 (创建编辑) ──→ M3 (工作流编排)
                          │                │
                          ↓                ↓
                     M4 (智能体对话) ←──────┘
                          │
                          ↓
                     M5 (模板系统)
```

---

## 开发顺序建议

1. **M1** → 智能体列表，基础框架搭建完成
2. **M2** → 创建/编辑智能体，核心配置可用
3. **M3** → 工作流编排，智能体能力扩展
4. **M4** → 智能体对话，完整闭环（可执行工作流）
5. **M5** → 模板系统，降低用户使用门槛
