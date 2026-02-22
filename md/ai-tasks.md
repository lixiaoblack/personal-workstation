# AI 知识库与智能体功能 - 任务清单

> 本文档独立记录 AI 功能开发任务进度，与主项目任务清单互不关联

---

## 任务统计

| 状态 | 数量 |
|------|------|
| 进行中 | 1 |
| 已完成 | 44 |
| 待处理 | 7 |

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

- [x] AI-015: 模型路由 - Ollama 连接 | 完成时间: 2026-02-17 15:30
  - 扩展 WebSocket 消息类型，添加 Ollama 相关消息类型
  - 实现 Electron IPC 处理器，通过 WebSocket 转发 Ollama 请求到 Python
  - 扩展 WebSocket 服务消息路由，支持 Ollama 消息转发和响应处理
  - AIChat 页面集成 Ollama 模型选择交互，显示提供商标签
  - 支持获取 Ollama 状态、模型列表、连接测试
  - ModelConfigModal 添加 Ollama 模型自动发现功能，下拉选择已有模型

- [x] AI-016: 模型状态管理 - MobX 集成 | 完成时间: 2026-02-17 16:30
  - 安装 mobx 和 mobx-react-lite 依赖
  - 创建 modelStore 管理模型列表和当前选中模型
  - AIChat 页面使用 MobX observer 自动响应状态变化
  - AISettings 页面配置变更后自动同步 MobX Store
  - 解决模型配置后 AIChat 页面不刷新的问题

- [x] AI-017: 上下文管理 - 滑动窗口策略 | 完成时间: 2026-02-17 17:30
  - 添加 HistoryMessageItem 类型支持历史消息传递
  - Electron 端添加 getRecentMessages API 获取最近 N 条消息
  - AIChat 页面发送消息时携带历史记录（默认 20 条）
  - Python 端优先使用传入的历史记录，兼容旧客户端
  - 支持切换对话时自动加载上下文
  - 重启软件后上下文不丢失（数据存储在 SQLite）



### 待处理

暂无

---

## Phase 3：LangGraph 智能体核心 (预计 2 周)

### 进行中

暂无

### 已完成

- [x] AI-018: LangGraph 智能体 - ReAct Agent 基础实现 | 完成时间: 2026-02-17 19:00
  - 创建 agent 模块（state.py, tools.py, graph.py）
  - 实现 AgentState 状态管理（TypedDict + 详细注释）
  - 实现 ToolRegistry 工具注册机制（动态注册 + OpenAI 格式）
  - 内置 CalculatorTool 和 EchoTool 示例工具
  - 实现 ReActAgent 基于 LangGraph 的 ReAct 循环
  - 扩展 WebSocket 消息协议支持 agent_step 等消息类型
  - 集成 agent_chat 消息处理到 message_handler
  - **前端思考过程展示**
  - AIChat 页面添加 agentSteps 状态管理
  - 创建 renderAgentSteps 组件显示思考步骤
  - 支持显示 thought/tool_call/tool_result/answer 四种步骤类型
  - 工具调用详情展示（工具名、参数、结果）

- [x] AI-020: LangGraph 智能体 - 多轮对话状态管理 | 完成时间: 2026-02-17
  - 数据库迁移：创建 conversation_summaries 和 user_memory 表
  - Python 记忆服务：实现摘要生成和记忆提取（memory_service.py）
  - Electron 记忆服务：添加摘要和记忆的查询/存储 API（memoryService.ts）
  - WebSocket 消息类型：添加 Memory 相关消息类型
  - 前端集成：新对话时加载摘要和记忆注入上下文
  - 触发机制：消息达到阈值（10条）时自动生成摘要
  - 摘要生成：通过 Python LLM 服务生成对话摘要
  - 记忆上下文：将用户偏好、项目信息、历史摘要注入 LLM 提示

- [x] AI-021: Skills 系统 - 技能注册机制 | 完成时间: 2026-02-17 21:00
  - 创建 Skills 模块目录结构（agent/skills/）
  - 实现 Skill 基类和类型定义（base.py）
  - 实现 SkillRegistry 注册中心（registry.py）
  - 实现 SkillLoader 热加载器（loader.py）
  - 支持三种技能类型：builtin（内置）、custom（自定义）、composite（组合）
  - 支持三种触发方式：manual（手动）、keyword（关键词）、intent（意图）
  - 技能参数定义和 OpenAI Tool 格式转换

- [x] AI-022: Skills 系统 - 热加载支持 | 完成时间: 2026-02-17 21:00
  - 实现 SkillLoader 从 YAML/JSON 文件加载技能
  - 支持目录批量加载
  - 支持文件变化监听（watchdog）
  - 实现技能重载功能
  - 添加 pyyaml、watchdog 依赖

- [x] AI-023: Skills 系统 - 内置技能实现 | 完成时间: 2026-02-17 21:00
  - 实现 CalculatorSkill 数学计算技能
  - 实现 DateTimeSkill 日期时间技能
  - 实现 TextProcessSkill 文本处理技能
  - 创建 YAML 自定义技能示例（code_explainer.yaml）
  - 集成到 main.py 启动初始化
  - 添加 WebSocket 消息类型（skill_list/execute/reload）
  - 实现 message_handler 技能处理函数

- [x] AI-019: LangGraph 智能体 - Deep Agents 集成 | 完成时间: 2026-02-18
  - 安装 deepagents 依赖包
  - 创建 DeepAgentWrapper 封装类
  - 集成 Skills 和 Knowledge 工具
  - 更新 message_handler 支持 Deep Agent
  - 实现降级策略（Deep Agent → ReAct Agent）

### 待处理

暂无

---

## Phase 4：RAG 知识库 (预计 2 周)

### 进行中

暂无

### 已完成

- [x] AI-024: 向量存储 - LanceDB 集成 | 完成时间: 2026-02-17
  - 创建 python-service/rag/ 模块
  - 实现 LanceDBVectorStore 类
  - 支持文档添加、相似度搜索、删除操作
  - 数据存储位置：~/.personal-workstation/knowledge/

- [x] AI-025: 文档处理 - 多格式解析 (MD/PDF/TXT) | 完成时间: 2026-02-17
  - 实现 DocumentProcessor 类
  - 支持 Markdown、PDF、TXT、JSON、HTML 格式
  - 提取元数据（文件名、路径、创建时间、修改时间）

- [x] AI-026: 文档处理 - 分块策略 | 完成时间: 2026-02-17
  - 实现 SmartTextSplitter 类
  - 按 token 数量分块
  - 支持重叠窗口
  - 保留代码块完整性

- [x] AI-027: 文档处理 - 嵌入模型集成 | 完成时间: 2026-02-17
  - 实现 EmbeddingService 类
  - 支持 Ollama 本地模型（nomic-embed-text）
  - 支持 OpenAI 在线模型（text-embedding-3-small）
  - 实现检索器 KnowledgeRetriever

- [x] AI-028: 知识库 UI - 文档管理界面 | 完成时间: 2026-02-17
  - 创建 Knowledge 页面
  - 知识库列表展示
  - 文档上传和管理
  - 搜索测试功能

- [x] AI-029: 知识库 UI - 配置界面 | 完成时间: 2026-02-17
  - 创建知识库弹窗（名称、描述、嵌入模型选择）
  - 添加文档弹窗（支持多文件选择）
  - 侧边栏菜单入口

### 待处理

暂无

---

## Phase 5：Skills UI 扩展 (预计 1 周)

### 进行中

暂无

### 已完成

- [x] AI-030: Skills 管理 UI - 技能列表 | 完成时间: 2026-02-17 22:00
  - 创建 SkillsCard 组件
  - 技能列表展示
  - 启用/禁用切换
  - 热重载功能

- [x] AI-031: Skills 管理 UI - 自定义技能上传 | 完成时间: 2026-02-17 22:00
  - Skills 系统支持 YAML/JSON 配置文件
  - SkillLoader 支持文件加载

- [x] AI-032: Skills 管理 UI - 技能启用/禁用 | 完成时间: 2026-02-17 22:00
  - 技能状态持久化
  - Agent 自动调用已启用技能

### 待处理

暂无

---

## Phase 6：完善与优化 (后期)

### 进行中

暂无

### 已完成

- [x] AI-033: 知识库与 Agent 集成 | 完成时间: 2026-02-16
  - 创建 KnowledgeRetrieverTool 工具类
  - AgentChatMessage 添加 knowledgeId 字段
  - Python 端处理 knowledgeId 设置默认知识库
  - 前端 AIChatInput 添加知识库选择器

- [x] AI-034: AIChat 页面组件拆分 | 完成时间: 2026-02-16
  - 创建 config.ts 存放常量和类型定义
  - 拆分 AIChatSidebar 侧边栏组件
  - 拆分 AIChatHeader 头部组件
  - 拆分 AIChatMessage 消息渲染组件
  - 拆分 AIChatAgentSteps 思考过程组件
  - 拆分 AIChatStreamingMessage 流式消息组件
  - 拆分 AIChatEmptyState 空状态组件
  - 拆分 AIChatInput 输入区域组件
  - 主文件从 1360 行精简到约 500 行

- [x] AI-035: 流式消息显示优化 | 完成时间: 2026-02-16
  - 流式阶段思考过程始终展开显示
  - 完成状态可展开/收起查看
  - 持久化 Agent 思考步骤到消息 metadata

- [x] AI-036: 知识库智能匹配与全库搜索 | 完成时间: 2026-02-17
  - 不指定知识库时自动搜索所有知识库
  - 根据查询关键词智能匹配知识库名称/描述
  - 前端发送知识库元数据支持智能匹配
  - 修复 vectorstore.search 参数错误
  - 修复 EmbeddingService 方法名错误
  - 修复 Agent 流式输出问题

- [x] AI-037: 知识库服务 FrontendBridge 化改造 | 完成时间: 2026-02-19
  - 前端 knowledgeService 统一处理 SQLite + LanceDB 操作
  - 添加 createLanceDBCollection/deleteLanceDBCollection 辅助函数
  - 修改 createKnowledge/deleteKnowledge 为异步函数
  - 简化 Python message_handler 知识库消息处理
  - 移除 _sync_knowledge_to_electron 等同步逻辑
  - 优化 Agent knowledge_tool 使用 FrontendBridge 调用
  - knowledge_list/create 工具改为桥接调用
  - 保留本地 LanceDB 作为 Fallback

### 待处理

暂无

---

## Phase 7：输入体验增强 (预计 2 周)

> **跨平台兼容性说明**：本阶段所有功能需在 macOS、Windows、Linux 三个平台测试验证

### 进行中

- [ ] AI-040: 语音输入 - UI 状态与交互 | 开始时间: 2026-02-21 20:00
  - 配置 Sender allowSpeech 属性（已使用受控模式）
  - 录音状态动画（波形/脉冲效果）
  - 语音识别结果实时显示
  - 识别失败/超时错误处理
  - macOS 权限请求机制（通过 Electron API）

### 已完成

暂无

### 待处理

#### 7.1 基础架构迁移

- [x] AI-038: Sender 组件迁移 - 输入框重构 | 完成时间: 2026-02-21
  - 使用 Ant Design X Sender 组件替换现有输入框
  - 保持现有功能（发送消息、历史记录、快捷键）
  - 类型定义和组件接口迁移
  - 参考：https://ant-design-x.antgroup.com/components/sender-cn

#### 7.2 语音输入功能（macOS/Windows）

- [x] AI-039: 语音输入 - 能力检测与降级策略 | 完成时间: 2026-02-21 20:00
  - 检测系统是否支持 Web Speech API（Chromium 内核）
  - 检测麦克风权限状态（支持 Electron API）
  - macOS 权限请求机制（systemPreferences.askForMediaAccess）
  - 不支持时 UI 隐藏语音按钮
  - 平台支持：macOS、Windows
  - 新增文件：build/entitlements.mac.plist
  - 更新文件：
    - electron/main.ts（添加媒体权限 IPC）
    - electron/preload.ts（暴露权限 API）
    - src/hooks/useSpeechCapability.ts（使用 Electron API）
    - src/types/electron.ts（添加类型定义）
    - src/views/AIChat/components/AIChatInput/index.tsx（受控模式语音识别）
    - package.json（添加 macOS entitlements 配置）

- [ ] AI-040: 语音输入 - UI 状态与交互 | 创建时间: 2026-02-20
  - ~配置 Sender allowSpeech 属性~ （已在 AI-039 中实现受控模式）
  - 录音状态动画（波形/脉冲效果）
  - 语音识别结果实时显示
  - 识别失败/超时错误处理
  - **测试方法**：
    - [ ] 各平台录音状态 UI 显示正确
    - [ ] 识别结果实时更新
    - [ ] 网络断开时的错误提示
    - [ ] 超时自动停止机制

#### 7.3 文件粘贴与上传（跨平台）

- [ ] AI-041: 文件粘贴 - 跨平台剪贴板处理 | 创建时间: 2026-02-20
  - 实现 onPasteFile 回调处理
  - 跨平台剪贴板文件获取（图片、文本文件）
  - 剪贴板权限检测（特别是 Linux Wayland）
  - 平台差异处理：
    - macOS: 原生支持剪贴板文件
    - Windows: 原生支持剪贴板文件
    - Linux: X11 支持，Wayland 需额外权限
  - **测试方法**：
    - [ ] macOS: 截图粘贴、复制文件粘贴
    - [ ] Windows: 截图粘贴、复制文件粘贴
    - [ ] Linux(X11): 截图粘贴、复制文件粘贴
    - [ ] Linux(Wayland): 权限检测和降级提示
    - [ ] 粘贴超大文件时的进度提示

- [ ] AI-042: 文件上传 - Electron 原生文件选择 | 创建时间: 2026-02-20
  - 使用 Electron dialog.showOpenDialog API
  - 支持多文件、多类型选择
  - 文件大小限制和类型过滤
  - 跨平台文件路径处理
  - **测试方法**：
    - [ ] macOS: 文件选择对话框、多选、类型过滤
    - [ ] Windows: 文件选择对话框、多选、类型过滤
    - [ ] Linux: 文件选择对话框、多选、类型过滤
    - [ ] 大文件选择时的内存占用

- [x] AI-043: 文件落盘存储 - 跨平台存储方案 | 完成时间: 2026-02-22
  - 使用 Electron app.getPath('userData') 获取存储路径
  - 文件存储到系统专属目录
  - 跨平台路径分隔符处理
  - 存储空间检测和清理机制
  - 存储路径配置入口（设置页面）
  - **测试方法**：
    - [x] macOS: 文件存储到 ~/Library/Application Support/
    - [ ] Windows: 文件存储到 %APPDATA%/
    - [ ] Linux: 文件存储到 ~/.config/
    - [ ] 存储空间不足时的提示
    - [ ] 清理功能验证

- [x] 知识库拖拽上传优化 | 完成时间: 2026-02-22
  - KnowledgeUpload 组件支持拖拽文件上传
  - 利用 Electron 特有能力获取拖拽文件本地路径
  - 点击触发原生对话框，拖拽直接获取文件路径
  - 添加 onDropFile 回调和 handleDropFile 处理函数

- [x] 知识库文件预览功能完善 | 完成时间: 2026-02-22
  - 添加 readKnowledgeFileContent API 读取文件内容
  - WFilePreview 组件支持文本类文件预览
  - 支持 Markdown/JSON/代码/文本等格式
  - 大文件截断提示

#### 7.4 快捷指令系统

- [ ] AI-044: Suggestion 组件 - 快捷指令框架 | 创建时间: 2026-02-20
  - 集成 Ant Design X Suggestion 组件
  - 输入 / 触发快捷指令面板
  - 快捷指令注册机制
  - 键盘导航（上下选择、Enter 确认）
  - 参考：https://ant-design-x.antgroup.com/components/suggestion-cn
  - **测试方法**：
    - [ ] 输入 / 触发面板
    - [ ] 键盘导航流畅
    - [ ] Esc 关闭面板
    - [ ] 点击外部关闭面板
    - [ ] 各平台快捷键不冲突

- [ ] AI-045: Suggestion 组件 - 知识库快捷选择 | 创建时间: 2026-02-20
  - /k 或 /knowledge 触发知识库选择
  - 显示知识库列表（名称、描述、文档数量）
  - 支持全选（所有知识库）和单选
  - 选择后自动注入知识库 ID
  - **测试方法**：
    - [ ] 快捷触发知识库选择
    - [ ] 列表显示正确
    - [ ] 单选/全选功能
    - [ ] 选择后消息携带正确 ID

#### 7.5 文件展示与 Agent 按钮

- [ ] AI-046: FileCard 组件 - 文件卡片展示 | 创建时间: 2026-02-20
  - 使用 Ant Design X FileCard 组件
  - 显示文件名、类型、大小、状态
  - 图片预览（使用 Electron 原生图片查看）
  - 文件删除操作
  - 参考：https://ant-design-x.antgroup.com/components/file-card-cn
  - **测试方法**：
    - [ ] 各平台文件卡片样式一致
    - [ ] 图片预览正常
    - [ ] 删除操作正确
    - [ ] 大文件卡片不卡顿

- [ ] AI-047: Sender 组件 - Agent 按钮预留 | 创建时间: 2026-02-20
  - 参考 Ant Design X 内部 Agent 按钮效果
  - 自定义 actions 属性添加 Agent 切换按钮
  - Agent 模式切换状态管理
  - 按钮样式和交互动画
  - **测试方法**：
    - [ ] 按钮显示正确
    - [ ] 切换状态同步
    - [ ] 动画流畅
    - [ ] 各平台样式一致

- [ ] AI-048: 文件引用集成 | 创建时间: 2026-02-20
  - 输入区域显示已选择的知识库文件
  - FileCard 展示引用的文档信息
  - 发送消息时携带文件引用
  - Agent 响应时标注引用来源
  - **测试方法**：
    - [ ] 文件引用显示正确
    - [ ] 消息携带引用信息
    - [ ] Agent 响应包含来源
    - [ ] 多文件引用场景

#### 7.6 整体集成测试

- [ ] AI-049: 输入体验集成测试 | 创建时间: 2026-02-20
  - 所有输入功能集成验证
  - 各平台端到端测试
  - 性能测试（内存、CPU 占用）
  - 异常场景处理
  - **测试方法**：
    - [ ] macOS 全功能回归测试
    - [ ] Windows 全功能回归测试
    - [ ] Linux 全功能回归测试
    - [ ] 长时间使用内存不泄漏
    - [ ] 异常场景（断网、权限拒绝）处理

---

## 附录：跨平台测试矩阵

| 功能 | macOS | Windows | Linux(X11) | Linux(Wayland) |
|------|-------|---------|------------|----------------|
| Sender 组件 | ✅ | ✅ | ✅ | ✅ |
| 语音输入 | ✅ | ✅ | ⚠️ | ⚠️ |
| 文件粘贴 | ✅ | ✅ | ✅ | ⚠️ 需权限 |
| 文件选择 | ✅ | ✅ | ✅ | ✅ |
| 快捷指令 | ✅ | ✅ | ✅ | ✅ |
| 文件落盘 | ✅ | ✅ | ✅ | ✅ |

---

*文档版本: v2.0*
*创建时间: 2026-02-13*
*最后更新: 2026-02-20*
