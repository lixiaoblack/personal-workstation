/**
 * 工作流管理 IPC 处理器
 *
 * 处理工作流的 CRUD 操作，通过 HTTP API 与 Python 服务通信。
 */

import { ipcMain, dialog } from "electron";
import { get, post, put, del } from "../services/pythonApiClient";
import * as fs from "fs";
import * as path from "path";

// ==================== 类型定义 ====================

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

// ==================== IPC 处理器 ====================

/**
 * 注册工作流相关 IPC 处理器
 */
export function registerWorkflowIpc(): void {
  // 获取工作流列表
  ipcMain.handle(
    "workflow:list",
    async (
      _event,
      filters?: { agent_id?: string; status?: string }
    ): Promise<WorkflowListResult> => {
      try {
        let url = "/api/workflows/list";
        if (filters) {
          const params = new URLSearchParams();
          if (filters.agent_id) params.append("agent_id", filters.agent_id);
          if (filters.status) params.append("status", filters.status);
          if (params.toString()) url += `?${params.toString()}`;
        }

        const response = await get<WorkflowConfig[]>(url);
        return {
          success: response.success,
          data: response.data || [],
          count: response.data?.length || 0,
          error: response.error,
        };
      } catch (error) {
        console.error("[WorkflowIpc] 获取工作流列表失败:", error);
        return {
          success: false,
          data: [],
          count: 0,
          error: String(error),
        };
      }
    }
  );

  // 获取工作流详情
  ipcMain.handle(
    "workflow:get",
    async (_event, workflowId: string): Promise<WorkflowResult> => {
      try {
        const response = await get<WorkflowConfig>(
          `/api/workflows/${workflowId}`
        );
        return {
          success: response.success,
          data: response.data,
          error: response.error,
        };
      } catch (error) {
        console.error("[WorkflowIpc] 获取工作流详情失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 创建工作流
  ipcMain.handle(
    "workflow:create",
    async (_event, input: CreateWorkflowInput): Promise<WorkflowResult> => {
      try {
        const response = await post<WorkflowConfig>(
          "/api/workflows/create",
          input
        );
        return {
          success: response.success,
          data: response.data,
          error: response.error,
        };
      } catch (error) {
        console.error("[WorkflowIpc] 创建工作流失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 更新工作流
  ipcMain.handle(
    "workflow:update",
    async (
      _event,
      workflowId: string,
      input: UpdateWorkflowInput
    ): Promise<WorkflowResult> => {
      try {
        const response = await put<WorkflowConfig>(
          `/api/workflows/${workflowId}`,
          input
        );
        return {
          success: response.success,
          data: response.data,
          error: response.error,
        };
      } catch (error) {
        console.error("[WorkflowIpc] 更新工作流失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 删除工作流
  ipcMain.handle(
    "workflow:delete",
    async (
      _event,
      workflowId: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await del(`/api/workflows/${workflowId}`);
        return {
          success: response.success,
          error: response.error,
        };
      } catch (error) {
        console.error("[WorkflowIpc] 删除工作流失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 复制工作流
  ipcMain.handle(
    "workflow:duplicate",
    async (_event, workflowId: string): Promise<WorkflowResult> => {
      try {
        const response = await post<WorkflowConfig>(
          `/api/workflows/${workflowId}/duplicate`
        );
        return {
          success: response.success,
          data: response.data,
          error: response.error,
        };
      } catch (error) {
        console.error("[WorkflowIpc] 复制工作流失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 发布工作流
  ipcMain.handle(
    "workflow:publish",
    async (_event, workflowId: string): Promise<WorkflowResult> => {
      try {
        const response = await post<WorkflowConfig>(
          `/api/workflows/${workflowId}/publish`
        );
        return {
          success: response.success,
          data: response.data,
          error: response.error,
        };
      } catch (error) {
        console.error("[WorkflowIpc] 发布工作流失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 执行工作流
  ipcMain.handle(
    "workflow:execute",
    async (
      _event,
      workflowId: string,
      inputData?: Record<string, unknown>
    ): Promise<{
      success: boolean;
      execution_id?: string;
      variables?: Record<string, unknown>;
      error?: string;
      status?: string;
      waiting_for?: string;
      node_id?: string;
    }> => {
      try {
        const response = await post<{
          success: boolean;
          execution_id?: string;
          variables?: Record<string, unknown>;
          error?: string;
          status?: string;
          waiting_for?: string;
          node_id?: string;
        }>(`/api/workflows/${workflowId}/execute`, inputData || {});
        return response;
      } catch (error) {
        console.error("[WorkflowIpc] 执行工作流失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 单节点测试执行
  ipcMain.handle(
    "workflow:executeNode",
    async (
      _event,
      workflowId: string,
      nodeId: string,
      inputVariables?: Record<string, unknown>
    ): Promise<{
      success: boolean;
      node_id?: string;
      node_type?: string;
      status?: string;
      output?: unknown;
      variables?: Record<string, unknown>;
      error?: string;
      execution_time?: number;
    }> => {
      try {
        const response = await post<{
          success: boolean;
          node_id?: string;
          node_type?: string;
          status?: string;
          output?: unknown;
          variables?: Record<string, unknown>;
          error?: string;
          execution_time?: number;
        }>(`/api/workflows/${workflowId}/execute-node/${nodeId}`, {
          input_variables: inputVariables || {},
        });
        return response;
      } catch (error) {
        console.error("[WorkflowIpc] 单节点测试执行失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 从指定节点开始执行
  ipcMain.handle(
    "workflow:executeFromNode",
    async (
      _event,
      workflowId: string,
      nodeId: string,
      initialVariables?: Record<string, unknown>
    ): Promise<{
      success: boolean;
      execution_id?: string;
      variables?: Record<string, unknown>;
      node_results?: Record<string, unknown>;
      error?: string;
    }> => {
      try {
        const response = await post<{
          success: boolean;
          execution_id?: string;
          variables?: Record<string, unknown>;
          node_results?: Record<string, unknown>;
          error?: string;
        }>(`/api/workflows/${workflowId}/execute-from/${nodeId}`, {
          initial_variables: initialVariables || {},
        });
        return response;
      } catch (error) {
        console.error("[WorkflowIpc] 从指定节点执行失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 恢复工作流执行（用户交互后）
  ipcMain.handle(
    "workflow:resume",
    async (
      _event,
      executionId: string,
      nodeId: string,
      responseData: Record<string, unknown>
    ): Promise<{
      success: boolean;
      error?: string;
    }> => {
      try {
        const response = await post<{
          success: boolean;
          error?: string;
        }>(`/api/workflows/execution/${executionId}/resume`, {
          node_id: nodeId,
          response_data: responseData,
        });
        return response;
      } catch (error) {
        console.error("[WorkflowIpc] 恢复工作流执行失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 选择文件（Electron 原生文件对话框）
  ipcMain.handle(
    "workflow:selectFiles",
    async (
      _event,
      options: {
        multiple?: boolean;
        accept?: string;
        maxSize?: number;
      }
    ): Promise<{
      success: boolean;
      files?: Array<{
        path: string;
        name: string;
        size: number;
        content?: string;
      }>;
      error?: string;
    }> => {
      try {
        // 构建文件过滤器
        const filters: Array<{ name: string; extensions: string[] }> = [];
        if (options.accept) {
          const extensions = options.accept
            .split(",")
            .map((ext) => ext.trim().replace(".", ""))
            .filter(Boolean);
          if (extensions.length > 0) {
            filters.push({ name: "允许的文件", extensions });
          }
        }
        if (filters.length === 0) {
          filters.push({ name: "所有文件", extensions: ["*"] });
        }

        // 打开文件选择对话框
        const result = await dialog.showOpenDialog({
          properties: options.multiple
            ? ["openFile", "multiSelections"]
            : ["openFile"],
          filters,
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { success: true, files: [] };
        }

        // 读取文件信息
        const files = result.filePaths.map((filePath) => {
          const stats = fs.statSync(filePath);
          const fileName = path.basename(filePath);
          return {
            path: filePath,
            name: fileName,
            size: stats.size,
          };
        });

        // 检查文件大小
        const maxSizeBytes = (options.maxSize || 10) * 1024 * 1024;
        const oversizedFiles = files.filter((f) => f.size > maxSizeBytes);
        if (oversizedFiles.length > 0) {
          return {
            success: false,
            error: `以下文件超过大小限制 (${options.maxSize || 10}MB): ${oversizedFiles.map((f) => f.name).join(", ")}`,
          };
        }

        return { success: true, files };
      } catch (error) {
        console.error("[WorkflowIpc] 选择文件失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 读取文件内容
  ipcMain.handle(
    "workflow:readFile",
    async (
      _event,
      filePath: string
    ): Promise<{
      success: boolean;
      content?: string;
      error?: string;
    }> => {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        return { success: true, content };
      } catch (error) {
        console.error("[WorkflowIpc] 读取文件失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 读取文件内容（Base64）
  ipcMain.handle(
    "workflow:readFileBase64",
    async (
      _event,
      filePath: string
    ): Promise<{
      success: boolean;
      content?: string;
      mimeType?: string;
      error?: string;
    }> => {
      try {
        const buffer = fs.readFileSync(filePath);
        const content = buffer.toString("base64");

        // 根据 extension 判断 MIME 类型
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          ".pdf": "application/pdf",
          ".doc": "application/msword",
          ".docx":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ".txt": "text/plain",
          ".md": "text/markdown",
          ".json": "application/json",
          ".csv": "text/csv",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".gif": "image/gif",
        };
        const mimeType = mimeTypes[ext] || "application/octet-stream";

        return { success: true, content, mimeType };
      } catch (error) {
        console.error("[WorkflowIpc] 读取文件失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  console.log("[WorkflowIpc] 工作流 IPC 处理器已注册");
}
