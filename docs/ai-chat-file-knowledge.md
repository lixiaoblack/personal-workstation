# AI 聊天文件与知识库功能

本文档记录 AI 聊天页面中文件添加与知识库集成功能的实现细节。

---

## 一、功能概览

### 1.1 文件处理入口

| 入口 | 触发方式 | 处理流程 |
|------|----------|----------|
| 拖拽文件 | 拖拽文件到聊天输入区 | 直接获取本地路径 → 创建附件对象 |
| 粘贴文件 | Ctrl/Cmd+V 粘贴 | 从剪贴板获取文件信息 |
| URL 输入 | 输入框输入 URL | 自动检测 URL 格式 |

### 1.2 知识库交互方式

| 方式 | 触发条件 | 功能说明 |
|------|----------|----------|
| `/` 触发选择 | 输入框输入 `/` | 弹出知识库下拉列表 |
| `@` 标签选择 | 选择知识库后显示标签 | 明确指定使用的知识库 |
| 附件卡片内嵌 | AI 响应完成后 | 询问是否添加到知识库 |

---

## 二、前端组件架构

### 2.1 核心组件

```
src/views/AIChat/
├── index.tsx                    # 主页面（状态管理、消息发送）
├── config.ts                    # 配置和类型定义
└── components/
    ├── AIChatInput/
    │   └── index.tsx            # 输入组件（拖拽、粘贴、附件显示）
    ├── AIChatMessage/
    │   └── index.tsx            # 消息组件（附件卡片、文档列表）
    ├── KnowledgeSelectCard/
    │   └── index.tsx            # 知识库选择卡片
    ├── KnowledgeSuggestion/
    │   └── index.tsx            # 知识库建议下拉（/ 触发）
    ├── AttachmentFileCard/
    │   └── index.tsx            # 附件文件卡片
    └── KnowledgeDocumentListCard/
        └── index.tsx            # 文档列表卡片
```

### 2.2 数据流

```
用户操作 → AIChatInput → AIChat (状态管理) → WebSocket → Python Agent
                ↓
          attachments[]  ←  拖拽/粘贴文件
          selectedTags[]  ←  知识库选择
```

---

## 三、附件处理流程

### 3.1 文件拖拽处理

**文件**: [AIChatInput/index.tsx](file:///Users/wanglixiao/Desktop/个人/personal-workstation/src/views/AIChat/components/AIChatInput/index.tsx)

```typescript
// 拖拽处理（Electron 特有能力）
const handleDrop = useCallback(
  async (e: React.DragEvent) => {
    e.preventDefault();
    
    const files = e.dataTransfer.files;
    for (const file of files) {
      // Electron 中可通过 file.path 获取本地文件路径
      const filePath = (file as File & { path?: string }).path;
      
      const attachment: AttachmentFile = {
        id: generateFileId(),
        name: file.name,
        path: filePath,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        type: getFileType(file.name, file.type),
        status: "pending",
      };
      
      onAttachmentsChange([...attachments, attachment]);
    }
  },
  [attachments, onAttachmentsChange]
);
```

### 3.2 附件数据结构

**文件**: [electron/types/websocket.ts](file:///Users/wanglixiao/Desktop/个人/personal-workstation/electron/types/websocket.ts)

```typescript
export interface AttachmentInfo {
  id: string;                  // 附件 ID
  type: AttachmentType;        // 'file' | 'image' | 'url'
  name: string;                // 显示名称
  size?: number;               // 文件大小（字节）
  mimeType?: string;           // MIME 类型
  path?: string;               // 文件路径（本地文件）
  url?: string;                // URL 地址
  thumbnail?: string;          // 缩略图（Base64 或 URL）
}
```

### 3.3 消息发送时附件处理

**文件**: [AIChat/index.tsx](file:///Users/wanglixiao/Desktop/个人/personal-workstation/src/views/AIChat/index.tsx)

```typescript
// 发送 Agent 消息（带附件）
await sendAgentChat({
  content,
  conversationId: String(conversationId),
  modelId: currentModel.id,
  knowledgeId,
  knowledgeMetadata,
  attachments: currentAttachments.length > 0 
    ? currentAttachments.map(a => ({
        name: a.name,
        path: a.path,
        type: a.type,
        size: a.size,
      }))
    : undefined,
});
```

---

## 四、Agent 文件处理流程

### 4.1 Python 端消息处理

**文件**: [python-service/message_handler.py](file:///Users/wanglixiao/Desktop/个人/personal-workstation/python-service/message_handler.py)

```python
async def _handle_agent_chat(self, message: dict) -> Optional[dict]:
    attachments = message.get("attachments", [])  # 附件列表
    
    # 如果有附件，构建附件上下文
    if attachments:
        attachment_paths = {}
        attachment_info = []
        for att in attachments:
            att_name = att.get('name', '未知文件')
            att_path = att.get('path', '')
            # 建立文件名到路径的映射
            attachment_paths[att_name] = att_path
            attachment_info.append(f"""文件名称: {att_name}
文件路径: {att_path}
文件类型: {att.get('type')}
文件大小: {att.get('size')} 字节""")
        
        # 设置附件路径映射（用于修正 LLM 可能编造的路径）
        DeepAgentWrapper.set_attachment_paths(attachment_paths)
        
        # 构建增强内容
        attachment_context = f"""
[重要：用户上传了以下文件]
{chr(10).join(attachment_info)}

[指令] 用户上传了文件并询问相关问题，你必须先使用 file_read 工具读取文件内容。
"""
```

### 4.2 Agent 系统提示中的文件优先级

**文件**: [python-service/agent/deep_agent.py](file:///Users/wanglixiao/Desktop/个人/personal-workstation/python-service/agent/deep_agent.py)

```python
DEEP_AGENT_SYSTEM_PROMPT = """你是一个智能助手，具有强大的任务规划和执行能力。

## ⚠️ 重要：工具调用判断原则

### 🔴 必须调用工具的情况

**文件分析（使用 file_read）** - 最高优先级：
- 用户上传了文件并询问文件内容
- 用户问"这个文档讲了什么"、"文件内容是什么"
- 当用户消息中包含"[重要：用户上传了以下文件]"时
- **必须先调用 file_read 工具读取文件内容！**
- 调用格式：file_read(file_path="文件路径")
"""
```

### 4.3 文件读取工具

**文件**: [python-service/agent/tools.py](file:///Users/wanglixiao/Desktop/个人/personal-workstation/python-service/agent/tools.py)

```python
class FileReadTool(BaseTool):
    """
    文件读取工具
    读取本地文件内容，支持多种文件格式。
    Agent 使用此工具读取用户上传的附件文件。
    """
    name = "file_read"
    description = "读取本地文件内容。用于分析用户上传的附件文件。支持文本文件、PDF、Markdown、代码文件等格式。"
    
    def _run(self, file_path: str, max_length: int = 10000) -> str:
        # 检查文件是否存在
        if not os.path.exists(file_path):
            return f"错误：文件不存在 - {file_path}"
        
        # 根据文件扩展名选择解析方式
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == '.pdf':
            return self._read_pdf(file_path, max_length)
        elif file_ext in ['.pptx', '.ppt']:
            return self._read_pptx(file_path, max_length)
        elif file_ext in ['.docx', '.doc']:
            return self._read_docx(file_path, max_length)
        # ... 更多格式支持
```

### 4.4 路径自动修正机制

当 LLM 编造错误的文件路径时，系统会自动修正：

```python
class DeepAgentWrapper:
    # 类级别的附件路径映射
    _attachment_paths: Dict[str, str] = {}
    
    @classmethod
    def get_correct_file_path(cls, provided_path: str) -> str:
        """获取正确的文件路径，如果 LLM 编造了错误路径，返回实际的附件路径"""
        # 尝试通过文件名匹配
        provided_name = os.path.basename(provided_path)
        for name, path in cls._attachment_paths.items():
            if name == provided_name:
                return path
        
        # 兜底策略：使用第一个附件的路径
        first_path = list(cls._attachment_paths.values())[0]
        return first_path
```

---

## 五、知识库快速添加功能

### 5.1 功能入口

#### 方式一：`/` 触发知识库选择

**文件**: [KnowledgeSuggestion/index.tsx](file:///Users/wanglixiao/Desktop/个人/personal-workstation/src/views/AIChat/components/KnowledgeSuggestion/index.tsx)

```typescript
// 输入 / 触发知识库下拉列表
const getItems = useCallback((info?: string) => {
  const keyword = info?.startsWith("/") 
    ? info.slice(1).toLowerCase() 
    : info?.toLowerCase() || "";
  
  return knowledgeList
    .filter(kb => !keyword || 
      kb.name.toLowerCase().includes(keyword) ||
      kb.description?.toLowerCase().includes(keyword))
    .map(kb => ({
      label: kb.name,
      value: `@${kb.name}`,
      icon: <FolderOutlined />,
      extra: `${kb.documentCount} 个文档`,
    }));
}, [knowledgeList]);
```

#### 方式二：KnowledgeSelectCard 组件

**文件**: [KnowledgeSelectCard/index.tsx](file:///Users/wanglixiao/Desktop/个人/personal-workstation/src/views/AIChat/components/KnowledgeSelectCard/index.tsx)

```typescript
/**
 * 知识库选择卡片组件
 * 在 AI 消息中内嵌显示，用于让用户选择要添加的知识库
 * 
 * 交互流程：
 * 1. 显示附件信息（文件/图片/URL）
 * 2. 显示"添加到知识库"和"暂不需要"按钮
 * 3. 点击"添加到知识库"后显示知识库列表
 * 4. 选择知识库后禁用（不可修改）
 */
interface KnowledgeSelectCardProps {
  attachment: AttachmentInfo;           // 附件信息
  knowledgeList: KnowledgeOption[];     // 知识库列表
  selected?: boolean;                   // 是否已选择
  addResult?: {                         // 添加结果
    success: boolean;
    documentName?: string;
    chunkCount?: number;
    error?: string;
  };
  onAskAdd?: () => void;                // 点击添加到知识库
  onSelectKnowledge?: (id: string) => void; // 选择知识库
}
```

### 5.2 消息元数据中的知识库信息

**文件**: [electron/types/conversation.ts](file:///Users/wanglixiao/Desktop/个人/personal-workstation/electron/types/conversation.ts)

```typescript
export interface MessageMetadata {
  // 知识库选择相关
  knowledgeSelection?: {
    attachmentId: string;       // 附件 ID
    knowledgeId: string;        // 选择的知识库 ID
    knowledgeName: string;      // 选择的知识库名称
    selectedAt: number;         // 选择时间戳
    readonly: true;             // 只读标记
  };
  
  // 附件列表（拖拽文件）
  attachments?: Array<{
    id: string;
    name: string;
    path: string;
    size: number;
    mimeType: string;
    type: "image" | "document" | "code" | "other";
  }>;
  
  // 知识库添加结果
  knowledgeAddResult?: {
    success: boolean;
    documentId?: string;
    documentName?: string;
    chunkCount?: number;
    error?: string;
  };
}
```

### 5.3 Agent 知识库工具

**文件**: [python-service/agent/knowledge_tool.py](file:///Users/wanglixiao/Desktop/个人/personal-workstation/python-service/agent/knowledge_tool.py)

| 工具名称 | 功能 | 使用场景 |
|----------|------|----------|
| `knowledge_search` | 检索知识库内容 | 用户询问知识库中的信息 |
| `knowledge_list` | 列出所有知识库 | 用户想查看有哪些知识库 |
| `knowledge_create` | 创建新知识库 | Agent 需要创建知识库存储信息 |
| `knowledge_list_documents` | 列出知识库文档 | 查看知识库中有哪些文档 |

```python
class KnowledgeRetrieverTool(BaseTool):
    """
    知识库检索工具
    让 Agent 可以从知识库中检索相关信息来回答用户问题。
    
    智能匹配功能：
    - 如果指定了 knowledge_id，只搜索该知识库
    - 如果没有指定，自动搜索所有知识库并合并结果
    """
    name = "knowledge_search"
    
    @classmethod
    def set_knowledge_metadata(cls, metadata: Dict[str, Dict[str, Any]]):
        """设置知识库元数据（用于智能匹配）"""
        cls._knowledge_metadata = metadata
```

---

## 六、知识库管理页面

### 6.1 文件上传流程

**文件**: [src/views/Knowledge/index.tsx](file:///Users/wanglixiao/Desktop/个人/personal-workstation/src/views/Knowledge/index.tsx)

```typescript
// 拖拽上传 - 直接使用文件路径
const handleDropFile = async (filePath: string) => {
  // 1. 保存文件到知识库目录
  const saveResult = await window.electronAPI.saveFileToKnowledge(
    selectedKnowledge.id,
    filePath
  );
  
  // 2. 添加到知识库（向量化）
  const uploadResult = await window.electronAPI.addKnowledgeDocument(
    selectedKnowledge.id,
    saveResult.file.path,
    saveResult.file.originalName
  );
  
  // 3. 更新文档列表
  loadDocuments(selectedKnowledge.id);
};
```

### 6.2 IPC 通信接口

**文件**: [electron/preload.ts](file:///Users/wanglixiao/Desktop/个人/personal-workstation/electron/preload.ts)

```typescript
// 知识库相关 API
window.electronAPI = {
  // 创建知识库
  createKnowledge: (input: KnowledgeCreateInput) => 
    ipcRenderer.invoke("knowledge:create", input),
  
  // 添加文档到知识库
  addKnowledgeDocument: (knowledgeId, filePath, originalFileName?) =>
    ipcRenderer.invoke("knowledge:addDocument", knowledgeId, filePath, originalFileName),
  
  // 搜索知识库
  searchKnowledge: (knowledgeId, query, topK?) =>
    ipcRenderer.invoke("knowledge:search", knowledgeId, query, topK),
  
  // 保存文件到知识库
  saveFileToKnowledge: (knowledgeId, filePath) =>
    ipcRenderer.invoke("knowledge:saveFile", knowledgeId, filePath),
};
```

---

## 七、数据流程图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        用户操作                                      │
│  拖拽文件 / 粘贴文件 / 输入 URL / 输入 / 触发知识库选择               │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     前端 (AIChatInput)                               │
│  - 创建 AttachmentFile 对象                                         │
│  - 更新 attachments[] 状态                                          │
│  - 显示附件卡片                                                      │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     发送消息 (sendAgentChat)                         │
│  - content: 用户输入                                                │
│  - attachments: 附件列表                                            │
│  - knowledgeId: 选择的知识库                                        │
│  - knowledgeMetadata: 知识库元数据                                   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼ WebSocket
┌─────────────────────────────────────────────────────────────────────┐
│                  Python Service (message_handler)                    │
│  1. 接收消息，提取 attachments                                       │
│  2. 构建 attachment_context（附件上下文）                            │
│  3. 设置 attachment_paths（路径映射）                                │
│  4. 传递给 Deep Agent                                               │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Deep Agent (deep_agent)                         │
│  1. 解析系统提示，识别文件分析优先级                                  │
│  2. 调用 file_read 工具读取文件内容                                  │
│  3. 路径自动修正（如 LLM 编造错误路径）                               │
│  4. 可选：调用 knowledge_search 检索知识库                          │
│  5. 生成回答并流式返回                                               │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼ WebSocket (流式)
┌─────────────────────────────────────────────────────────────────────┐
│                     前端 (AIChat)                                    │
│  1. 接收 chat_stream_start                                          │
│  2. 接收 agent_step（工具调用步骤）                                  │
│  3. 接收 chat_stream_chunk（内容块）                                 │
│  4. 接收 chat_stream_end                                            │
│  5. 保存消息到数据库（含 metadata）                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 八、关键配置

### 8.1 支持的文件类型

| 类型 | 扩展名 | 解析方式 |
|------|--------|----------|
| 文本 | .txt, .md, .json, .html, .xml | 直接读取 |
| PDF | .pdf | pypdf / PyMuPDF |
| Word | .docx, .doc | python-docx |
| PPT | .pptx, .ppt | python-pptx |
| Excel | .xlsx, .xls | openpyxl |
| 代码 | .py, .js, .ts, .java, etc. | 直接读取 |
| 图片 | .png, .jpg, .jpeg | OCR (PaddleOCR) |

### 8.2 默认配置

```typescript
// AIChat/config.ts
const DEFAULT_CONTEXT_LIMIT = 50;  // 历史消息上下文限制

// Knowledge/config.ts
const DEFAULT_TOP_K = 5;           // 知识库检索默认返回数量
```

---

## 九、注意事项

1. **文件路径安全**：Electron 中拖拽文件可直接获取本地路径，无需上传
2. **路径修正**：LLM 可能编造错误的文件路径，系统会自动修正
3. **知识库元数据**：每次发送消息时传递知识库元数据，支持智能匹配
4. **附件持久化**：附件信息存储在消息 metadata 中，重新加载对话可恢复
5. **流式响应**：Agent 步骤和内容通过 WebSocket 流式返回，提升用户体验
