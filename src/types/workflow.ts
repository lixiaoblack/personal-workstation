/**
 * 工作流模块类型定义
 */

// ==================== 节点类型 ====================

/**
 * 工作流节点类型
 */
export type WorkflowNodeType =
  | "start"
  | "end"
  | "llm"
  | "tool"
  | "knowledge"
  | "condition"
  | "loop"
  | "file_select"
  | "user_input"
  | "human_review"
  | "message"
  | "webhook";

/**
 * 节点位置
 */
export interface NodePosition {
  x: number;
  y: number;
}

/**
 * 工作流节点
 */
export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: NodePosition;
  data: Record<string, unknown>;
}

/**
 * 工作流边（连线）
 */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  data?: Record<string, unknown>;
}

// ==================== 工作流类型 ====================

/**
 * 工作流状态
 */
export type WorkflowStatus = "draft" | "published" | "deleted";

/**
 * 工作流配置
 */
export interface WorkflowConfig {
  id: string;
  agent_id: string | null;
  name: string;
  description: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, unknown>;
  status: WorkflowStatus;
  created_at: number;
  updated_at: number;
}

/**
 * 创建工作流输入
 */
export interface CreateWorkflowInput {
  name: string;
  description?: string;
  agent_id?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  variables?: Record<string, unknown>;
}

/**
 * 更新工作流输入
 */
export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  agent_id?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  variables?: Record<string, unknown>;
  status?: WorkflowStatus;
}

/**
 * 工作流列表结果
 */
export interface WorkflowListResult {
  success: boolean;
  data: WorkflowConfig[];
  count: number;
  error?: string;
}

/**
 * 工作流详情结果
 */
export interface WorkflowResult {
  success: boolean;
  data?: WorkflowConfig;
  error?: string;
}

// ==================== 节点配置类型 ====================

/**
 * LLM 节点配置
 */
export interface LLMNodeData {
  model_id?: number;
  model_name?: string;
  prompt_template: string;
  temperature?: number;
  max_tokens?: number;
}

/**
 * 工具节点配置
 */
export interface ToolNodeData {
  tool_name: string;
  parameters: Record<string, unknown>;
}

/**
 * 知识库节点配置
 */
export interface KnowledgeNodeData {
  knowledge_ids: string[];
  query_template: string;
  top_k?: number;
}

/**
 * 条件节点配置
 */
export interface ConditionNodeData {
  conditions: Array<{
    id: string;
    expression: string;
    label: string;
  }>;
  default_target?: string;
}

/**
 * 循环节点配置
 */
export interface LoopNodeData {
  max_iterations: number;
  break_condition?: string;
}

/**
 * 文件选择节点配置
 */
export interface FileSelectNodeData {
  multiple?: boolean;
  file_types?: string[];
  max_size?: number;
  output_variable: string;
}

/**
 * 用户输入节点配置
 */
export interface UserInputNodeData {
  fields: Array<{
    id: string;
    label: string;
    type: "text" | "textarea" | "select" | "checkbox";
    required?: boolean;
    options?: string[];
    default_value?: string;
    output_variable: string;
  }>;
}

/**
 * 人工审核节点配置
 */
export interface HumanReviewNodeData {
  title: string;
  description?: string;
  timeout?: number;
  approvers?: string[];
}

/**
 * 消息节点配置
 */
export interface MessageNodeData {
  message_template: string;
  message_type?: "info" | "warning" | "error" | "success";
}

/**
 * Webhook 节点配置
 */
export interface WebhookNodeData {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body_template?: string;
}

/**
 * 所有节点数据类型的联合
 */
export type NodeDataTypes =
  | LLMNodeData
  | ToolNodeData
  | KnowledgeNodeData
  | ConditionNodeData
  | LoopNodeData
  | FileSelectNodeData
  | UserInputNodeData
  | HumanReviewNodeData
  | MessageNodeData
  | WebhookNodeData;
