# AI 知识库与智能体技术方案

> 本文档描述 Personal Workstation 项目中 AI 知识库与智能体功能的技术实现方案

---

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      Electron 应用                               │
├─────────────────────────────────────────────────────────────────┤
│  渲染进程 (React)                                               │
│  │ WebSocket 客户端 ◄──────────────────────────────────┐        │
│  │ AI 聊天 / 知识库管理 / 智能体配置 / MCP 管理          │        │
├──────────────────────┬──────────────────────────────────────────┤
│  主进程 (Node.js)    │                                          │
│  │ WebSocket 服务器 ◄─────────────────────────────────┘        │
│  │ 进程管理器                                                 │
│  └────────┬──────────┘                                        │
│           │ 子进程启动                                         │
│           ▼                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Python 智能体服务 (离线运行)                  │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │                 LangGraph + Deep Agents              │ │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │ │  │
│  │  │  │ 智能体引擎 │ │ 工具调用  │ │ 状态管理与工作流     │ │ │  │
│  │  │  └──────────┘ └──────────┘ └──────────────────────┘ │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │                    MCP 集成层                        │ │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │ │  │
│  │  │  │ MCP 客户端 │ │ Skills   │ │ 动态工具注册         │ │ │  │
│  │  │  │ (连接外部) │ │ (自定义)  │ │ (热加载)            │ │ │  │
│  │  │  └──────────┘ └──────────┘ └──────────────────────┘ │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │                    RAG 知识库                        │ │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │ │  │
│  │  │  │ LanceDB  │ │ 文档处理  │ │ Embedding 模型      │ │ │  │
│  │  │  └──────────┘ └──────────┘ └──────────────────────┘ │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
  ┌──────────────┐             ┌──────────────┐
  │ 在线 API     │             │ Ollama 本地   │
  │ (优先级高)   │             │ (优先级低)    │
  └──────────────┘             └──────────────┘
```

---

## 二、核心设计原则

### 1. 离线优先

- 智能体必须在本地运行，禁止通过联网请求外部服务器实现核心功能
- 支持完全离线模式下的知识库检索和对话
- 联网功能为增强功能，不影响核心使用

### 2. 模型调用优先级

```
优先级: 在线 API (高) > Ollama 本地模型 (低)
```

- 联网时优先使用在线 API 获得更好效果
- 离线或在线 API 不可用时自动降级到 Ollama
- 用户可手动配置优先级

### 3. Python 环境支持

支持两种方式：

| 方式 | 优点 | 缺点 |
|---|---|---|
| 系统 Python 环境 | 灵活、可定制、体积小 | 需要用户安装 Python |
| PyInstaller 打包 | 开箱即用、无需配置 | 体积大 (~150MB+) |

建议两种都支持，自动检测并选择可用方式。

---

## 三、技术选型

### 3.1 AI 框架层

| 库 | 版本要求 | 用途 |
|---|---|---|
| `langchain` | >=1.0.0 | LLM 应用框架 |
| `langchain-community` | >=1.0.0 | 社区集成 |
| `langchain-openai` | >=1.0.0 | OpenAI 兼容接口 |
| `langgraph` | >=1.0.0 | 智能体编排 |
| `langgraph-deep-agents` | >=1.0.0 | 高级智能体模式 |

### 3.2 向量数据库

| 方案 | 推荐度 | 说明 |
|---|---|---|
| **LanceDB** | ⭐⭐⭐⭐⭐ | 纯 Python、嵌入式、无服务、完美适配 |
| sqlite-vec | ⭐⭐⭐⭐ | 轻量、与现有 SQLite 集成 |
| Chroma | ⭐⭐⭐ | 功能丰富但需要额外服务进程 |

**推荐**：LanceDB

### 3.3 MCP 集成

| 组件 | 说明 |
|---|---|
| `mcp` | MCP Python SDK |
| MCP Client | 连接外部 MCP 服务器 |
| MCP Server | 暴露本地工具供外部调用 |

### 3.4 通信协议

| 协议 | 用途 |
|---|---|
| WebSocket | 流式响应、实时通信、Python 服务通信 |
| IPC | Electron 进程间通信 |
| REST API | Python 服务管理接口 |

---

## 四、详细架构

### 4.1 MCP + Skills 架构

```
┌─────────────────────────────────────────────────┐
│                  MCP 架构                        │
├─────────────────────────────────────────────────┤
│  ┌─────────────┐      ┌─────────────────────┐  │
│  │ MCP Server  │◄────►│ Python Agent Service│  │
│  │ (Electron)  │      │ (LangGraph)         │  │
│  └──────┬──────┘      └──────────┬──────────┘  │
│         │                        │              │
│         ▼                        ▼              │
│  ┌─────────────┐      ┌─────────────────────┐  │
│  │ MCP Tools   │      │ 本地 MCP 客户端      │  │
│  │ - 文件系统   │      │ 连接外部 MCP 服务器  │  │
│  │ - 数据库     │      │ - GitHub MCP        │  │
│  │ - 终端      │      │ - Slack MCP         │  │
│  └─────────────┘      │ - 自定义 MCP        │  │
│                       └─────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 4.2 Skills 自定义系统

```
agent/skills/
├── built-in/           # 内置技能 (不可删除)
│   ├── file_search.py  # 文件搜索
│   ├── code_run.py     # 代码执行 (沙箱)
│   └── web_search.py   # 网页搜索 (联网时)
│
└── custom/             # 用户自定义技能
    └── my_skill.py     # 用户添加
```

特性：
- 支持热加载
- 动态注册到 LangChain Tools
- 用户可通过 UI 管理

---

## 五、项目目录结构

### 5.1 Electron 端

```
src/
├── main/                      # 主进程
│   ├── ai/
│   │   ├── index.ts          # AI 服务入口
│   │   ├── websocket.ts      # WebSocket 服务器
│   │   └── process-manager.ts # Python 进程管理
│   └── ipc/
│       └── ai-handlers.ts    # IPC 处理器
│
├── renderer/                  # 渲染进程
│   └── src/
│       ├── views/
│       │   ├── AI/           # AI 功能页面
│       │   │   ├── Chat/     # 对话界面
│       │   │   ├── Knowledge/# 知识库管理
│       │   │   ├── Agents/   # 智能体配置
│       │   │   └── Settings/ # 模型设置
│       └── hooks/
│           └── useAI.ts      # AI 相关 hooks
│
└── shared/
    └── types/
        └── ai.ts             # AI 相关类型定义
```

### 5.2 Python 端

```
agent/
├── main.py                    # FastAPI 入口
├── requirements.txt           # Python 依赖
│
├── api/
│   ├── websocket.py          # WebSocket 处理
│   └── routes.py             # REST API
│
├── agent/
│   ├── __init__.py
│   ├── graph.py              # LangGraph 工作流
│   ├── deep_agents.py        # Deep Agents 封装
│   └── state.py              # 状态管理
│
├── mcp/
│   ├── client.py             # MCP 客户端
│   ├── manager.py            # MCP 管理器
│   └── servers/              # MCP 服务器配置
│
├── skills/
│   ├── registry.py           # 技能注册中心
│   ├── base.py               # 技能基类
│   ├── built-in/             # 内置技能
│   └── custom/               # 自定义技能
│
├── rag/
│   ├── embeddings.py         # 嵌入模型
│   ├── vectorstore.py        # 向量存储
│   └── retriever.py          # 检索器
│
└── models/
    ├── ollama.py             # Ollama 适配
    └── openai.py             # OpenAI 适配
```

---

## 六、核心依赖

### 6.1 Python 依赖 (requirements.txt)

```txt
# Web 框架
fastapi>=0.109.0
uvicorn>=0.27.0
websockets>=12.0

# LangChain 生态
langchain>=1.0.0
langchain-community>=1.0.0
langchain-openai>=1.0.0
langgraph>=1.0.0
langgraph-deep-agents>=1.0.0

# MCP
mcp>=1.0.0

# 向量存储
lancedb>=0.10.0

# 嵌入模型
sentence-transformers>=2.2.0

# 工具
pydantic>=2.0.0
python-multipart>=0.0.6
```

### 6.2 Node.js 依赖

```json
{
  "dependencies": {
    "ws": "^8.0.0"
  }
}
```

---

## 七、技术难点与解决方案

### 7.1 Python 子进程管理

**问题**：需要可靠地启动、监控、重启 Python 服务

**解决方案**：

```typescript
class PythonAgentManager {
  async start() {
    // 1. 尝试系统 Python
    if (await this.checkSystemPython()) {
      return this.startWithSystemPython();
    }
    
    // 2. 尝试打包服务
    if (await this.checkBundledService()) {
      return this.startBundledService();
    }
    
    // 3. 提示安装
    this.promptInstallPython();
  }
  
  // 健康检查 + 自动重启
  startHealthCheck() {
    setInterval(async () => {
      if (!await this.isHealthy()) {
        await this.restart();
      }
    }, 30000);
  }
}
```

### 7.2 流式响应处理

**问题**：AI 生成需要流式输出，需要通过 WebSocket 传递

**解决方案**：

```python
# Python 端 - 流式生成
async def stream_chat(message: str):
    async for chunk in agent.astream(message):
        await websocket.send_json({
            "type": "chunk",
            "content": chunk.content
        })
    await websocket.send_json({"type": "done"})
```

```typescript
// 前端 - 流式接收
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'chunk') {
    setMessages(prev => appendChunk(prev, data.content));
  }
};
```

### 7.3 模型降级策略

**问题**：在线 API 不可用时需要自动切换到本地模型

**解决方案**：

```python
class ModelRouter:
    providers = [
        {"name": "openai", "priority": 1, "require_network": True},
        {"name": "ollama", "priority": 2, "require_network": False},
    ]
    
    async def get_provider(self):
        for provider in sorted(self.providers, key=lambda x: x["priority"]):
            if await self.check_health(provider):
                return provider
        raise NoProviderAvailable()
    
    async def chat(self, messages):
        provider = await self.get_provider()
        return await provider.chat(messages)
```

---

## 八、开发计划

### Phase 1：基础架构 (1-2 周)

- [ ] WebSocket 通信层
  - [ ] 主进程 WebSocket 服务器
  - [ ] 消息协议设计
  - [ ] 心跳与重连机制
- [ ] Python 服务管理
  - [ ] 系统环境检测
  - [ ] 子进程启动/停止
  - [ ] 打包服务支持
- [ ] 模型路由
  - [ ] 在线 API 连接
  - [ ] Ollama 连接
  - [ ] 降级策略实现

### Phase 2：Python 智能体核心 (2 周)

- [ ] LangGraph 智能体
  - [ ] ReAct Agent 基础实现
  - [ ] Deep Agents 集成
  - [ ] 多轮对话状态管理
- [ ] MCP 集成
  - [ ] MCP 客户端实现
  - [ ] 工具动态注册
  - [ ] MCP 服务器管理
- [ ] Skills 系统
  - [ ] 技能注册机制
  - [ ] 热加载支持
  - [ ] 内置技能实现

### Phase 3：RAG 知识库 (2 周)

- [ ] 向量存储
  - [ ] LanceDB 集成
  - [ ] 文档嵌入
- [ ] 文档处理
  - [ ] 多格式解析 (MD/PDF/TXT)
  - [ ] 分块策略
- [ ] 知识库 UI
  - [ ] 文档管理
  - [ ] 配置界面

### Phase 4：MCP & Skills 扩展 (1-2 周)

- [ ] MCP 管理 UI
  - [ ] MCP 服务器配置
  - [ ] 工具列表展示
  - [ ] 连接状态监控
- [ ] Skills 管理
  - [ ] 技能列表
  - [ ] 自定义技能上传
  - [ ] 技能启用/禁用
- [ ] 打包与部署
  - [ ] PyInstaller 脚本
  - [ ] 自动更新机制

---

## 九、风险与备选方案

| 风险 | 影响 | 备选方案 |
|---|---|---|
| LangGraph Python 功能不足 | 智能体复杂度受限 | 自定义工作流实现 |
| LanceDB 兼容问题 | 向量存储失败 | sqlite-vec |
| Ollama 资源消耗大 | 用户体验差 | 强制使用在线 API |
| Python 环境缺失 | 功能不可用 | 提供打包服务下载 |

---

## 十、参考资料

- [LangChain Documentation](https://python.langchain.com/)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [LanceDB Documentation](https://lancedb.github.io/lancedb/)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Ollama Documentation](https://ollama.ai/)

---

*文档版本: v1.0*
*创建时间: 2026-02-13*
*最后更新: 2026-02-13*
