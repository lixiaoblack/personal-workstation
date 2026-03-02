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
| 0.5.35 | 2026-02-24 | 附件功能完整修复 |
| 0.5.34 | 2026-02-24 | 附件文件分析优先级处理 |
| 0.5.33 | 2026-02-22 | 拖拽文件到聊天框功能 |
| 0.5.32 | 2026-02-22 | 知识库文件预览功能完善 |
| 0.5.31 | 2026-02-22 | 修复打包后 database 模块找不到问题 |
| 0.5.30 | 2026-02-22 | 知识库拖拽上传支持 |
| 0.5.29 | 2026-02-22 | 知识库页面组件化重构、全局文件预览组件 |
| 0.5.28 | 2026-02-22 | 知识库存储路径字段 |
| 0.5.27 | 2026-02-21 | macOS 麦克风权限请求机制 |
| 0.5.26 | 2026-02-21 | 语音输入能力检测与降级策略 |
| 0.5.25 | 2026-02-21 | Sender 组件迁移 |
| 0.5.24 | 2026-02-19 | 知识库服务 FrontendBridge 化改造 |
| 0.5.23 | 2026-02-17 | 多轮对话状态管理（摘要生成+记忆系统） |
| 0.5.22 | 2026-02-17 | 知识库智能匹配与全库搜索 |
| 0.5.21 | 2026-02-16 | AIChat 页面组件拆分与知识库集成 |
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

### 新增 (Added) - v0.5.36

- **AI 语义创建 Todo 功能完善**
  - Ask 模块集成到 AI 创建待办流程
  - 用户说"帮我添加一个待办"时弹出分类选择卡片
  - WebSocket 消息路由支持 ASK/ASK_RESULT/ASK_RESPONSE 类型
  - agent_chat 消息异步处理，避免阻塞 WebSocket 消息循环
  - AskCard 组件用户响应后立即消失
  - AskCategoryTool 添加 `_call_async` 方法支持 Deep Agent 异步调用

### 修复 (Fixed) - v0.5.36

- WebSocket 消息循环阻塞导致 ask_response 无法被处理
- AskCard 用户响应后仍显示"处理中"状态

### 新增 (Added) - v0.5.35

- **附件功能完整修复**
  - 文件路径自动修正机制
    - DeepAgentWrapper 类添加 `set_attachment_paths` 类方法设置附件路径映射
    - `get_correct_file_path` 方法自动修正 LLM 编造的错误文件路径
    - 工具调用时自动检测 file_read 并修正路径参数
  - 附件数据持久化
    - 用户消息保存时将 attachments 存入 metadata
    - 重新打开对话可查看引用的文件
  - 附件卡片内嵌显示
    - 文件卡片显示在消息气泡内部（而非外部）
    - 显示文件图标、名称、大小
    - 白色半透明样式适配主色背景

### 新增 (Added) - v0.5.34

- **附件文件分析优先级处理**
  - 当用户消息携带附件时，Agent 优先分析附件文件内容
  - 创建 `file_read` 工具，支持读取多种文件格式
    - 文本文件（txt、md、代码文件等）
    - PDF 文件（需要 PyMuPDF）
    - Word 文档（需要 python-docx）
    - PPT 幻灯片（需要 python-pptx）
    - Excel 表格（需要 openpyxl）
  - 在 Agent 提示中告知有附件，引导 Agent 使用 file_read 工具
  - 修改 `_run_deep_agent` 方法接收和处理 attachments 参数

### 新增 (Added) - v0.5.33

- **拖拽文件到聊天框功能**
  - 修复拖拽文件触发 Electron 保存对话框的问题
  - 利用 Electron 特有能力：通过 `file.path` 获取拖拽文件的本地路径
  - 创建 `AttachmentFile` 类型定义，支持图片/文档/代码/其他类型
  - 文件卡片展示：显示文件图标、名称、大小、删除按钮
  - 发送消息时携带文件信息给 Agent
  - 用户消息 metadata 保存附件列表
  - 类型定义更新：
    - `MessageMetadata` 添加 `attachments` 字段
    - `SendChatOptions` 添加 `attachments` 字段
    - `AgentChatMessage` 添加 `attachments` 字段

### 新增 (Added) - v0.5.32

- **知识库文件预览功能完善**
  - Electron 主进程添加 `readKnowledgeFileContent` API
    - 支持读取知识库文件内容（最大 1MB，超出自动截断）
    - 文本文件返回 UTF-8 字符串，二进制文件返回 Base64
  - 前端 WFilePreview 组件完善
    - 添加 `knowledgeId` 和 `fileId` props 用于文件内容读取
    - 支持 Markdown/JSON/代码/文本等文件类型预览
    - 图片和 PDF 保持使用 file:// 协议直接显示
    - 大文件截断时显示提示信息
  - Knowledge 页面集成：预览时传递 knowledgeId 和 fileId

### 修复 (Fixed) - v0.5.31

- **打包后 database 模块找不到问题**
  - 修复 knowledgeService.ts 中混用 ES module import 和 CommonJS require 的问题
  - 将 `require("../database")` 改为 ES module 的 `import { getDatabase }` 
  - 将 `require("crypto")` 改为 `import { randomUUID } from "crypto"`

- **前端错误处理优化**
  - 添加 `warning` 字段支持：数据库保存失败但 Python 处理成功时返回警告
  - 前端上传成功时检查 warning 字段，显示警告消息
  - 类型定义更新：`addKnowledgeDocument` 返回值添加 `warning?` 字段

### 新增 (Added) - v0.5.30

- **知识库拖拽上传支持**
  - KnowledgeUpload 组件支持拖拽文件上传
  - 利用 Electron 特有能力：通过 file.path 获取拖拽文件的本地路径
  - 点击触发原生文件选择对话框，拖拽直接获取文件路径
  - 添加 onDropFile 回调处理拖拽文件
  - handleDropFile 函数：保存文件到知识库目录后向量化

### 新增 (Added) - v0.5.29

- **知识库页面组件化重构**
  - 拆分 KnowledgeSidebar 侧边栏组件
  - 拆分 KnowledgeHeader 头部组件
  - 拆分 KnowledgeDocumentList 文档列表组件
  - 拆分 KnowledgeUpload 上传组件
  - 拆分 KnowledgeSearchResult 搜索结果组件
  - 拆分 CreateKnowledgeModal 创建知识库弹窗
  - 主页面从 770 行精简到 312 行

- **全局文件预览组件 WFilePreview**
  - 支持 Markdown 预览（使用 MarkdownRenderer）
  - 支持 JSON 预览（格式化显示）
  - 支持 PDF 预览（iframe 嵌入）
  - 支持图片预览（file:// 协议）
  - 支持代码文件预览（语法高亮）
  - 支持纯文本文件预览
  - 集成到知识库文档列表，支持点击预览

- **知识库上传接口升级**
  - 使用新的 selectAndSaveKnowledgeFiles 接口
  - 文件自动保存到知识库专属目录
  - 支持更多文件类型：Word、图片等

### 新增 (Added) - v0.5.28

- **知识库存储路径字段**
  - 数据库迁移：为 knowledge 表添加 storage_path 字段
  - Python db_service.py 更新：
    - 创建知识库时自动生成 storage_path（knowledge-files/{knowledge_id}）
    - 列表/详情/直接调用 API 均返回 storage_path 字段
  - Electron 类型定义：
    - KnowledgeInfo 接口添加 storagePath 字段
    - transformKnowledgeInfo 转换函数支持字段映射
  - 用途：为后续文件管理功能提供存储位置信息

### 新增 (Added) - v0.5.27

- **macOS 麦克风权限请求机制**
  - Electron 主进程添加媒体权限 API
    - `media:askMicrophoneAccess` - 请求麦克风权限
    - `media:getMicrophoneAccessStatus` - 获取权限状态
  - 创建 build/entitlements.mac.plist
    - 配置 com.apple.security.device.audio-input 权限
  - package.json 添加 macOS 打包配置
    - hardenedRuntime: true
    - entitlements / entitlementsInherit
    - extendInfo 添加 NSMicrophoneUsageDescription
  - preload.ts 暴露权限 API 到渲染进程
  - useSpeechCapability Hook 使用 Electron API
    - getElectronMicrophoneStatus() 获取权限状态
    - askElectronMicrophoneAccess() 请求权限
  - AIChatInput 使用受控模式语音识别
    - 手动创建 SpeechRecognition 实例
    - 受控模式 allowSpeech: { recording, onRecordingChange }
    - 录音前检查并请求权限

### 新增 (Added) - v0.5.26

- **语音输入能力检测与降级策略**
  - 创建 useSpeechCapability Hook
    - 检测 Web Speech API 是否可用
    - 检测麦克风权限状态
    - requestPermission() 方法请求麦克风权限
    - 错误处理：权限拒绝、设备未找到等
  - AIChatInput 组件集成
    - 使用 allowSpeech 属性配置语音输入
    - 受控模式：自定义 onRecordingChange 处理权限检查
    - 降级策略：不支持语音时隐藏语音按钮
  - 平台支持：macOS、Windows（Electron Chromium 内核）

### 新增 (Added) - v0.5.25

- **Sender 组件迁移**
  - 使用 Ant Design X Sender 组件替换原有 textarea
  - 组件重构要点：
    - 使用 Sender 组件的 value/onChange/onSubmit 属性
    - loading 状态支持流式加载中显示
    - submitType="enter" 保持 Enter 发送快捷键
    - autoSize 自适应高度（minRows: 3, maxRows: 8）
    - header 属性承载工具栏（附件、图片、快捷模板、知识库选择、Agent 模式开关）
    - footer 属性承载底部提示信息
  - 新增 onCancel 可选属性支持取消流式响应
  - 保持现有功能：发送消息、历史记录、快捷键、知识库选择、Agent 模式切换

### 新增 (Added) - v0.5.24

- **知识库服务 FrontendBridge 化改造**
  - 前端 knowledgeService 统一处理 SQLite + LanceDB 操作
    - createKnowledge() 改为异步函数，先创建 SQLite 记录，再创建 LanceDB 集合
    - deleteKnowledge() 改为异步函数，先删除 SQLite 记录，再删除 LanceDB 集合
    - 添加 createLanceDBCollection() 辅助函数调用 Python 创建向量存储
    - 添加 deleteLanceDBCollection() 辅助函数调用 Python 删除向量存储
  - Python message_handler 简化
    - _handle_knowledge_create() 简化为仅创建 LanceDB 集合
    - _handle_knowledge_delete() 简化为仅删除 LanceDB 集合
    - 移除 _sync_knowledge_to_electron() 同步逻辑
    - _handle_knowledge_list() 添加提示说明 FrontendBridge 方式
  - Agent knowledge_tool 优化
    - KnowledgeListTool 改为通过 FrontendBridge 调用 knowledgeService.listKnowledge()
    - KnowledgeCreateTool 改为通过 FrontendBridge 调用 knowledgeService.createKnowledge()
    - 保留本地 LanceDB 作为 Fallback（WebSocket 未连接时使用）
    - 移除直接操作 LanceDB 的代码，统一走 FrontendBridge

### 新增 (Added) - v0.5.23

- **多轮对话状态管理**
  - 数据库迁移：新增 conversation_summaries（对话摘要）和 user_memory（用户记忆）表
  - Python 记忆服务（memory_service.py）：
    - generate_summary()：使用 LLM 生成对话摘要
    - extract_memory()：从对话中提取用户偏好、项目信息、任务进度
  - Electron 记忆服务（memoryService.ts）：
    - createSummary：创建对话摘要
    - getSummariesByConversation：获取对话的摘要列表
    - saveMemory/saveMemories：保存用户记忆
    - getAllMemories/getMemoriesByType：查询记忆
    - buildMemoryContext：构建记忆上下文提示
  - WebSocket 消息类型扩展：
    - MEMORY_GENERATE_SUMMARY / MEMORY_GENERATE_SUMMARY_RESPONSE
    - MEMORY_EXTRACT / MEMORY_EXTRACT_RESPONSE
  - 前端集成：
    - 发送消息时自动加载记忆上下文（长期记忆 + 历史摘要）
    - 记忆上下文作为 system 消息注入到历史记录
    - 流式结束后检查是否需要生成摘要（每 10 条消息触发）
  - 触发机制：
    - checkAndGenerateSummary 函数检测未摘要消息数量
    - 达到阈值时调用 Python LLM 服务生成摘要
    - 摘要自动保存到数据库

### 新增 (Added) - v0.5.22

- **知识库智能匹配功能**
  - 不指定知识库时自动搜索所有知识库，按相关度排序返回结果
  - 根据查询关键词自动匹配知识库名称/描述（如"腾讯云"匹配含"腾讯"的知识库）
  - 前端发送消息时携带知识库元数据（name、description）
  - KnowledgeRetrieverTool 支持设置元数据进行智能匹配

### 修复 (Fixed) - v0.5.22

- vectorstore.search() 参数错误：应使用 query + embedding_service 而非 query_embedding
- EmbeddingService 方法名错误：embed_text -> get_embedding
- Agent 流式输出：添加 chunk-by-chunk 流式传输最终答案
- asyncio 模块未导入导致 sleep 调用失败

### 新增 (Added) - v0.5.21

- **知识库与 Agent 集成**
  - 创建 python-service/agent/knowledge_tool.py
  - KnowledgeRetrieverTool：从知识库检索信息的工具
  - KnowledgeListTool：列出可用知识库的工具
  - AgentChatMessage 添加 knowledgeId 字段
  - Python 端处理 knowledgeId 设置默认知识库
  - 前端 AIChatInput 添加知识库选择器（Agent 模式下可见）

- **AIChat 页面组件拆分**
  - 创建 config.ts 存放常量和类型定义
  - 拆分 AIChatSidebar 侧边栏组件
  - 拆分 AIChatHeader 头部组件
  - 拆分 AIChatMessage 消息渲染组件
  - 拆分 AIChatAgentSteps 思考过程组件
  - 拆分 AIChatStreamingMessage 流式消息组件
  - 拆分 AIChatEmptyState 空状态组件
  - 拆分 AIChatInput 输入区域组件
  - 创建 components/index.ts 组件导出索引
  - 主文件从 1360 行精简到约 500 行

### 新增 (Added) - v0.5.21

- **Deep Agents 集成**
  - 安装 deepagents SDK（高级智能体能力）
  - 创建 DeepAgentWrapper 封装类（agent/deep_agent.py）
  - MessageSender 消息发送器接口
  - 自动降级策略：Deep Agent → ReAct Agent → 普通聊天
  - 模型配置映射（支持 OpenAI、Anthropic、Azure、Google、Ollama 等）
  - 流式输出支持

- **Deep Agents 核心能力**
  - **任务规划 (Planning)**：write_todos 工具分解复杂任务
  - **上下文管理 (Context Management)**：文件系统工具管理大型上下文
  - **子智能体生成 (Subagent Spawning)**：task 工具隔离上下文执行子任务
  - **长期记忆 (Long-term Memory)**：跨对话持久化记忆

- **工具集成**
  - Skills 工具自动注册到 Deep Agent
  - Knowledge 工具支持知识库检索
  - 自定义工具通过 LangChain Tool 格式集成

- **message_handler 重构**
  - 新增 _run_deep_agent 方法
  - 新增 _run_react_agent 方法
  - 支持 useDeepAgent 参数控制 Agent 类型
  - 自动降级保证系统稳定性

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

*文档版本: v1.9*
*创建时间: 2026-02-13*
*最后更新: 2026-02-18*
