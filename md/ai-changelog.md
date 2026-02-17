<!--
 * @Author: wanglx
 * @Date: 2026-02-15 22:05:03
 * @LastEditors: wanglx
 * @LastEditTime: 2026-02-16 13:44:52
 * @Description: 
 * 
 * Copyright (c) 2026 by ${git_name_email}, All Rights Reserved. 
-->
# AI 知识库与智能体功能 - 修改记录

> 本文档独立记录 AI 功能开发的版本变更，与主项目修改日志互不关联

---

## 版本统计

| 版本 | 发布日期 | 主要变更 |
|------|----------|----------|
| 0.5.20 | 2026-02-17 | RAG 知识库功能完整实现 |
| 0.5.19 | 2026-02-17 | Skills 前端 UI 集成与 Agent 消息优化 |
| 0.5.18 | 2026-02-17 | Skills 技能系统框架 |
| 0.5.17 | 2026-02-16 | Agent 思考过程持久化与修复 |
| 0.5.16 | 2026-02-16 | Agent 思考过程前端展示 |
| 0.5.15 | 2026-02-16 | ReAct Agent 基础框架 |
| 0.5.14 | 2026-02-16 | 上下文滑动窗口策略 |
| 0.5.13 | 2026-02-16 | MobX 模型状态管理 |
| 0.5.12 | 2026-02-16 | AI-015 Ollama 连接支持 |
| 0.5.11 | 2026-02-17 | 对话历史持久化、流式消息传输 |
| 0.5.10 | 2026-02-17 | 模型配置同步修复 |
| 0.5.9 | 2026-02-17 | AI-014 架构重构：Python 端 LangChain |
| 0.5.8 | 2026-02-17 | 模型路由在线 API 连接（已废弃） |
| 0.5.7 | 2026-02-17 | AI 设置页面模型配置 UI |
| 0.5.6 | 2026-02-17 | 模型配置 SQLite 存储 |
| 0.5.5 | 2026-02-17 | Python WebSocket 桥接 |
| - | - | 暂无发布版本 |

---

## [Unreleased] - 开发中

### 新增 (Added)

### 新增 (Added) - v0.5.20

- **RAG 知识库功能**
  - 创建 python-service/rag/ 模块
  - **嵌入模型服务**（embeddings.py）
    - EmbeddingModelType 枚举：OLLAMA / OPENAI
    - EmbeddingService 类：自动选择嵌入模型
    - 默认模型：nomic-embed-text（Ollama）/ text-embedding-3-small（OpenAI）
  - **向量存储**（vectorstore.py）
    - LanceDBVectorStore 类
    - 支持文档添加、相似度搜索、删除操作
    - 数据存储位置：~/.personal-workstation/knowledge/
  - **文档处理**（document_processor.py）
    - DocumentProcessor 类
    - 支持 Markdown、PDF、TXT、JSON、HTML 格式
    - 提取元数据（文件名、路径、创建时间、修改时间）
  - **文本分块**（text_splitter.py）
    - SmartTextSplitter 类
    - 按 token 数量分块
    - 支持重叠窗口
    - 保留代码块完整性
  - **知识检索器**（retriever.py）
    - KnowledgeRetriever 类
    - 向量检索 + 重排序

- **知识库管理服务**
  - 创建 knowledgeService.ts
  - 知识库 CRUD 操作
  - 文档添加/删除/搜索
  - SQLite 数据库迁移（knowledge、documents 表）

- **WebSocket 消息处理**
  - 添加知识库相关消息类型
  - knowledge_create/delete/add_document/search/list

- **前端知识库 UI**
  - 创建 Knowledge 页面
  - 知识库列表展示和选择
  - 创建知识库弹窗（名称、描述、嵌入模型选择）
  - 添加文档弹窗（支持多文件选择）
  - 文档列表展示
  - 搜索测试功能
  - 侧边栏菜单入口

### 新增 (Added) - v0.5.19

- **Skills 前端 UI 集成**
  - 创建 SkillsCard 组件（技能管理卡片）
  - 技能列表展示：名称、描述、类型、触发方式、状态
  - 技能启用/禁用切换
  - 技能热重载功能
  - 集成到 AISettings 页面

- **Skills 集成到 Agent 工具调用**
  - 创建 SkillToolAdapter 类，将 Skill 包装为 Tool
  - 实现 register_skills_as_tools() 函数
  - Agent 自动调用已启用的技能
  - DateTimeSkill 触发方式改为 intent（意图触发）

- **Agent 模式消息展示优化**
  - 思考过程和最终答案合并为一条消息
  - 流式阶段：展开显示思考过程（带动画）
  - 完成后：默认收起，显示「查看思考过程」按钮
  - 支持点击展开/收起查看详细推理过程

### 修复 (Fixed) - v0.5.19

- watchdog 依赖缺失导致 Python 服务启动失败（改为可选依赖）
- Pydantic v2 动态模型创建报错（使用 create_model 替代 type()）
- Markdown 渲染空代码块显示问题（sanitizeMarkdown 清理不完整标记）
- LLM 返回内容末尾不完整的 ``` 标记导致空 pre 标签显示

### 新增 (Added) - v0.5.18

- **Skills 技能系统框架**
  - 创建 Skills 模块目录结构（python-service/agent/skills/）
  - 实现 Skill 基类和类型定义（base.py）
    - SkillType 枚举：builtin（内置）、custom（自定义）、composite（组合）
    - SkillTrigger 枚举：manual（手动）、keyword（关键词）、intent（意图）
    - SkillMetadata、SkillToolBinding、SkillConfig 数据模型
    - BaseSkill 抽象基类、YamlSkill 配置技能、BuiltinSkill 内置技能
  - 实现 SkillRegistry 注册中心（registry.py）
    - 技能注册/注销/查询
    - 按类型/触发方式过滤
    - OpenAI Tool 格式转换
    - 技能执行接口
  - 实现 SkillLoader 热加载器（loader.py）
    - 从 YAML/JSON 文件加载技能
    - 目录批量加载
    - 文件变化监听（watchdog）
    - 技能热重载
  - 内置技能实现（builtin.py）
    - CalculatorSkill：数学计算技能
    - DateTimeSkill：日期时间技能
    - TextProcessSkill：文本处理技能
  - YAML 自定义技能示例（skills/code_explainer.yaml）
  - 添加依赖：pyyaml、watchdog、pydantic

- **Skills 系统集成**
  - main.py 启动时初始化 Skills 系统
  - message_handler.py 添加技能消息处理
    - skill_list：获取技能列表
    - skill_execute：执行技能
    - skill_reload：热重载技能
  - WebSocket 消息类型扩展（websocket.ts）
    - SKILL_LIST、SKILL_LIST_RESPONSE
    - SKILL_EXECUTE、SKILL_EXECUTE_RESPONSE
    - SKILL_RELOAD、SKILL_RELOAD_RESPONSE
  - SkillInfo、SkillType、SkillTrigger TypeScript 类型定义

### 新增 (Added) - v0.5.17

- **Agent 思考过程持久化存储**
  - 在 messages 表添加 metadata 字段（JSON 格式存储）
  - 添加 MessageMetadata、AgentStepData 类型定义
  - 保存 AI 消息时附带 Agent 步骤到 metadata
  - 加载对话时从最后一条 AI 消息的 metadata 恢复 Agent 步骤
  - 切换对话、刷新应用后思考过程保留
  - 数据库自动迁移，不影响现有数据

### 修复 (Fixed) - v0.5.17

- Agent 模式缺少 chat_stream_start 消息导致 conversationId 未设置，消息无法保存
- LLM 输出包含 markdown 代码块标记导致 JSON 解析失败
- Python format 字符串中花括号转义问题
- Agent 步骤重复发送问题（增量发送优化）
- answer 类型步骤重复显示问题（过滤 answer 类型，答案在消息列表显示）

### 新增 (Added) - v0.5.16

- **Agent 思考过程前端展示**
  - AIChat 页面添加 agentSteps 状态管理
  - 创建 renderAgentSteps 组件显示 Agent 执行步骤
  - 支持显示四种步骤类型：thought（思考）、tool_call（工具调用）、tool_result（工具结果）、answer（回答）
  - 工具调用详情展示：工具名称、参数 JSON、执行结果
  - 迭代次数显示，追踪多轮推理过程
  - 步骤图标和标签配置（AGENT_STEP_ICONS、AGENT_STEP_LABELS）
  - 流式结束/错误时自动清空 Agent 步骤

### 新增 (Added) - v0.5.15

- **ReAct Agent 基础框架**
  - agent 模块：state.py（状态定义）、tools.py（工具系统）、graph.py（工作流）
  - AgentState 状态管理：包含输入、执行步骤、输出、控制字段
  - ToolRegistry 工具注册机制：支持动态注册、OpenAI 格式转换
  - 内置工具：CalculatorTool（计算器）、EchoTool（回显测试）
  - ReActAgent 类：基于 LangGraph 实现 ReAct 循环
  - WebSocket 消息类型：agent_step、agent_thought、agent_tool_call、agent_tool_result
  - agent_chat 消息处理：集成到 message_handler.py

### 新增 (Added) - v0.5.14

- **上下文滑动窗口策略**
  - HistoryMessageItem 类型支持历史消息传递
  - Electron 端 getRecentMessages API 获取最近 N 条消息
  - AIChat 页面发送消息时携带历史记录（默认 20 条）
  - Python 端优先使用传入的历史记录，兼容旧客户端
  - 支持切换对话时自动加载上下文
  - 重启软件后上下文不丢失（数据存储在 SQLite）
  - Token 成本可控，用户可配置保留消息条数

- 存储管理服务
  - 获取应用存储信息（缓存大小、总大小、数据库大小、日志大小）
  - 缓存清理功能
  - 字节格式化工具函数
- IPC 通信扩展
  - `storage:getInfo` - 获取存储信息
  - `storage:clearCache` - 清理缓存
- 设置页面基础框架
  - Settings 主设置页面（常规设置、个人信息、存储管理、关于）
  - AISettings AI 模型配置页面
  - 在线 API 配置 UI（OpenAI、百炼、智谱）
  - 本地 Ollama 配置 UI
- WebSocket 通信层
  - WebSocket 服务器（主进程）
  - 消息协议定义
  - 渲染进程客户端（useWebSocket Hook）
- 聊天界面
  - AIChat 页面布局
  - 消息列表和输入框组件
  - WebSocket 消息收发
- Python 服务管理
  - Python 环境检测（跨平台）
  - Python 进程管理（启动/停止/重启）
  - WebSocket 桥接
    - Python 服务作为 WebSocket 客户端连接 Electron
    - 客户端标识机制（renderer/python_agent）
    - 消息路由：渲染进程 <-> Electron WS <-> Python 服务
    - Python 服务状态广播
- 模型配置管理
  - 模型配置类型定义（ModelConfig, ModelConfigListItem 等）
  - 支持 OpenAI、百炼、智谱、Ollama、自定义 API
  - SQLite 存储模型配置
  - CRUD 服务和 IPC API
  - 默认模型配置模板
- AI 设置页面完善
  - ModelConfigCard 组件（显示模型配置卡片）
  - ModelConfigModal 组件（添加/编辑配置弹窗）
  - 重构 AISettings 页面使用 SQLite 存储
  - 支持启用/禁用、设为默认、优先级管理
  - 测试连接功能预留
- 模型路由服务
  - 集成 OpenAI SDK
  - 支持 OpenAI、百炼、智谱、自定义 API（OpenAI 兼容格式）
  - 支持流式响应（sendChatRequestStream）
  - 支持连接测试（testModelConnection）
  - 自动更新模型配置状态（active/error）
- **架构重构**：移除 Electron 端 AI 调用，迁移至 Python 端
  - 移除 openai SDK（Electron 端）
  - Python 端创建 model_router.py（LangChain 封装）
  - 支持模型注册/注销/测试（WebSocket 消息）
  - 正确架构：渲染进程 → Electron → WebSocket → Python → LangChain
- **模型配置同步机制**
  - Python 连接时自动同步已启用的模型配置
  - 模型配置变更时自动同步到 Python 服务
  - 添加 syncModelConfigsToPython 函数
- 技术方案文档 `md/ai-agent-tech-plan.md`
- 任务清单文档 `md/ai-tasks.md`
- 修改记录文档 `md/ai-changelog.md`

### 修复 (Fixed)

- Python ModelConfig 缺少 id 字段导致注册失败
- Python 端未处理 connection_ack 消息类型警告
- 模型状态默认值逻辑：有 API Key/host 时自动标记为 active
- 数据迁移：更新已有模型配置状态

### 新增 (Added) - v0.5.11

- **对话历史持久化**
  - 数据库新增 conversations、messages 表
  - ConversationService 服务：对话 CRUD、消息存储
  - IPC API：getConversationList、getGroupedConversations、createConversation 等
  - 对话分组：今天/昨天/本周/更早
  - 自动标题：从用户第一条消息生成对话标题
- **流式消息传输**
  - WebSocket 类型：chat_stream_start、chat_stream_chunk、chat_stream_end
  - Python 端：LangChain astream() 流式输出
  - send_callback 回调机制：支持流式消息发送
  - Electron 端：流式消息处理和转发
  - 消息存储：流式完成后才存储到数据库
- **AIChat 页面重构**
  - 模型选择：从已启用模型配置加载
  - 对话列表：分组展示、新建/编辑/删除
  - 流式显示：实时显示 AI 回复
  - 空状态提示：引导用户配置模型

### 新增 (Added) - v0.5.12

- **Ollama 连接支持**
  - WebSocket 消息类型：ollama_status、ollama_models、ollama_test 及响应类型
  - Electron IPC 处理器：通过 WebSocket 转发 Ollama 请求到 Python 服务
  - WebSocket 服务消息路由：支持 Ollama 消息转发和响应处理
  - 请求响应 Promise 机制：支持异步等待 Python 服务响应
- **AIChat 页面模型选择增强**
  - 提供商标签显示（OpenAI、百炼、智谱、Ollama、自定义）
  - Ollama 本地模型标识图标
  - 下拉菜单优化，显示提供商信息
- **ModelConfigModal Ollama 模型自动发现**
  - 选择 Ollama 提供商时自动获取可用模型列表
  - 模型下拉选择替代手动输入，显示模型大小
  - 支持手动刷新模型列表
  - 连接失败时显示友好提示
  - 选择模型后自动填充配置名称

### 新增 (Added) - v0.5.13

- **MobX 状态管理集成**
  - 安装 mobx 和 mobx-react-lite 依赖
  - 创建 modelStore 管理模型列表和当前选中模型
  - AIChat 页面使用 observer 自动响应状态变化
  - 配置变更自动同步 MobX Store，跨页面状态实时更新
  - 解决模型配置后 AIChat 页面不刷新的问题

---

## 版本历史

暂无正式发布版本

---

*文档版本: v1.7*
*创建时间: 2026-02-13*
*最后更新: 2026-02-17*
