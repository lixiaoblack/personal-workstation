/**
 * 智能体模块配置
 */

// 智能体状态
export const AGENT_STATUS = {
  ACTIVE: "active",
  DRAFT: "draft",
  DELETED: "deleted",
} as const;

// 状态显示文本
export const AGENT_STATUS_TEXT: Record<string, string> = {
  active: "已发布",
  draft: "草稿",
  deleted: "已删除",
};

// 可用工具列表
export const AVAILABLE_TOOLS = [
  { id: "knowledge_search", name: "知识库检索", description: "从知识库中检索相关信息" },
  { id: "web_search", name: "网络搜索", description: "搜索互联网获取信息" },
  { id: "web_crawler", name: "网页采集", description: "采集网页内容" },
  { id: "todo_manage", name: "待办管理", description: "管理待办事项" },
  { id: "note_manage", name: "笔记管理", description: "管理笔记内容" },
] as const;

// 默认智能体参数
export const DEFAULT_AGENT_PARAMETERS = {
  temperature: 0.7,
  max_tokens: 4096,
  top_p: 1,
};

// 新建智能体默认值
export const DEFAULT_AGENT_INPUT = {
  name: "",
  description: "",
  avatar: "🤖",
  model_id: null,
  model_name: null,
  system_prompt: "",
  tools: [],
  knowledge_ids: [],
  skills: [],
  parameters: DEFAULT_AGENT_PARAMETERS,
};
