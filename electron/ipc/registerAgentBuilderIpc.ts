/**
 * 智能体管理 IPC 处理器
 *
 * 处理智能体的 CRUD 操作，通过 HTTP API 与 Python 服务通信。
 */

import { ipcMain } from "electron";
import { get, post, put, del } from "../services/pythonApiClient";

// ==================== 类型定义 ====================

/**
 * 智能体配置
 */
export interface AgentConfig {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  model_id: number | null;
  model_name: string | null;
  system_prompt: string | null;
  tools: string[];
  knowledge_ids: string[];
  skills: string[];
  parameters: Record<string, unknown>;
  status: string;
  created_at: number;
  updated_at: number;
}

/**
 * 创建智能体输入
 */
export interface CreateAgentInput {
  name: string;
  description?: string;
  avatar?: string;
  model_id?: number;
  model_name?: string;
  system_prompt?: string;
  tools?: string[];
  knowledge_ids?: string[];
  skills?: string[];
  parameters?: Record<string, unknown>;
}

/**
 * 更新智能体输入
 */
export interface UpdateAgentInput {
  name?: string;
  description?: string;
  avatar?: string;
  model_id?: number;
  model_name?: string;
  system_prompt?: string;
  tools?: string[];
  knowledge_ids?: string[];
  skills?: string[];
  parameters?: Record<string, unknown>;
  status?: string;
}

/**
 * 智能体列表结果
 */
export interface AgentListResult {
  success: boolean;
  data: AgentConfig[];
  count: number;
  error?: string;
}

/**
 * 智能体详情结果
 */
export interface AgentResult {
  success: boolean;
  data?: AgentConfig;
  error?: string;
}

// ==================== IPC 处理器 ====================

/**
 * 注册智能体相关 IPC 处理器
 */
export function registerAgentBuilderIpc(): void {
  // 获取智能体列表
  ipcMain.handle("agent:list", async (): Promise<AgentListResult> => {
    try {
      const response = await get<AgentConfig[]>("/api/agents/list");
      return {
        success: response.success,
        data: response.data || [],
        count: response.data?.length || 0,
        error: response.error,
      };
    } catch (error) {
      console.error("[AgentBuilderIpc] 获取智能体列表失败:", error);
      return {
        success: false,
        data: [],
        count: 0,
        error: String(error),
      };
    }
  });

  // 获取智能体详情
  ipcMain.handle(
    "agent:get",
    async (_event, agentId: string): Promise<AgentResult> => {
      try {
        const response = await get<AgentConfig>(`/api/agents/${agentId}`);
        return {
          success: response.success,
          data: response.data,
          error: response.error,
        };
      } catch (error) {
        console.error("[AgentBuilderIpc] 获取智能体详情失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 创建智能体
  ipcMain.handle(
    "agent:create",
    async (_event, input: CreateAgentInput): Promise<AgentResult> => {
      try {
        const response = await post<AgentConfig>("/api/agents/create", input);
        return {
          success: response.success,
          data: response.data,
          error: response.error,
        };
      } catch (error) {
        console.error("[AgentBuilderIpc] 创建智能体失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 更新智能体
  ipcMain.handle(
    "agent:update",
    async (_event, agentId: string, input: UpdateAgentInput): Promise<AgentResult> => {
      try {
        const response = await put<AgentConfig>(`/api/agents/${agentId}`, input);
        return {
          success: response.success,
          data: response.data,
          error: response.error,
        };
      } catch (error) {
        console.error("[AgentBuilderIpc] 更新智能体失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 删除智能体
  ipcMain.handle(
    "agent:delete",
    async (_event, agentId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await del(`/api/agents/${agentId}`);
        return {
          success: response.success,
          error: response.error,
        };
      } catch (error) {
        console.error("[AgentBuilderIpc] 删除智能体失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 复制智能体
  ipcMain.handle(
    "agent:duplicate",
    async (_event, agentId: string): Promise<AgentResult> => {
      try {
        const response = await post<AgentConfig>(
          `/api/agents/${agentId}/duplicate`
        );
        return {
          success: response.success,
          data: response.data,
          error: response.error,
        };
      } catch (error) {
        console.error("[AgentBuilderIpc] 复制智能体失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  console.log("[AgentBuilderIpc] 智能体 IPC 处理器已注册");
}
