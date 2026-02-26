/**
 * SimplePostman IPC 处理器
 */
import { ipcMain } from "electron";
import * as postmanService from "../services/postmanService";

/**
 * 注册 SimplePostman 相关的 IPC 处理器
 */
export function registerPostmanIpc(): void {
  // ==================== 项目操作 ====================

  // 获取所有项目
  ipcMain.handle("postman:getProjects", () => {
    return postmanService.getProjects();
  });

  // 根据 ID 获取项目
  ipcMain.handle("postman:getProjectById", (_event, id: number) => {
    return postmanService.getProjectById(id);
  });

  // 创建项目
  ipcMain.handle(
    "postman:createProject",
    (_event, input: Parameters<typeof postmanService.createProject>[0]) => {
      return postmanService.createProject(input);
    }
  );

  // 更新项目
  ipcMain.handle(
    "postman:updateProject",
    (
      _event,
      id: number,
      input: Parameters<typeof postmanService.updateProject>[1]
    ) => {
      return postmanService.updateProject(id, input);
    }
  );

  // 删除项目
  ipcMain.handle("postman:deleteProject", (_event, id: number) => {
    return postmanService.deleteProject(id);
  });

  // ==================== 分组操作 ====================

  // 获取项目的所有分组
  ipcMain.handle(
    "postman:getGroupsByProjectId",
    (_event, projectId: number) => {
      return postmanService.getGroupsByProjectId(projectId);
    }
  );

  // 创建分组
  ipcMain.handle(
    "postman:createGroup",
    (_event, input: Parameters<typeof postmanService.createGroup>[0]) => {
      return postmanService.createGroup(input);
    }
  );

  // 更新分组
  ipcMain.handle(
    "postman:updateGroup",
    (
      _event,
      id: number,
      input: Parameters<typeof postmanService.updateGroup>[1]
    ) => {
      return postmanService.updateGroup(id, input);
    }
  );

  // 删除分组
  ipcMain.handle("postman:deleteGroup", (_event, id: number) => {
    return postmanService.deleteGroup(id);
  });

  // ==================== 请求操作 ====================

  // 获取项目的所有请求
  ipcMain.handle(
    "postman:getRequestsByProjectId",
    (_event, projectId: number) => {
      return postmanService.getRequestsByProjectId(projectId);
    }
  );

  // 获取分组的所有请求
  ipcMain.handle("postman:getRequestsByGroupId", (_event, groupId: number) => {
    return postmanService.getRequestsByGroupId(groupId);
  });

  // 根据 ID 获取请求
  ipcMain.handle("postman:getRequestById", (_event, id: number) => {
    return postmanService.getRequestById(id);
  });

  // 创建请求
  ipcMain.handle(
    "postman:createRequest",
    (_event, input: Parameters<typeof postmanService.createRequest>[0]) => {
      return postmanService.createRequest(input);
    }
  );

  // 更新请求
  ipcMain.handle(
    "postman:updateRequest",
    (
      _event,
      id: number,
      input: Parameters<typeof postmanService.updateRequest>[1]
    ) => {
      return postmanService.updateRequest(id, input);
    }
  );

  // 删除请求
  ipcMain.handle("postman:deleteRequest", (_event, id: number) => {
    return postmanService.deleteRequest(id);
  });

  // 更新请求的 LLM 类型定义
  ipcMain.handle(
    "postman:updateRequestLlmTypes",
    (_event, id: number, llmTypes: string) => {
      return postmanService.updateRequestLlmTypes(id, llmTypes);
    }
  );

  // 批量创建请求
  ipcMain.handle(
    "postman:batchCreateRequests",
    (
      _event,
      requests: Parameters<typeof postmanService.batchCreateRequests>[0]
    ) => {
      return postmanService.batchCreateRequests(requests);
    }
  );

  // ==================== 历史记录操作 ====================

  // 添加历史记录
  ipcMain.handle(
    "postman:addHistory",
    (_event, input: Parameters<typeof postmanService.addHistory>[0]) => {
      return postmanService.addHistory(input);
    }
  );

  // 获取历史记录列表
  ipcMain.handle("postman:getHistoryList", (_event, limit?: number) => {
    return postmanService.getHistoryList(limit);
  });

  // 清空历史记录
  ipcMain.handle("postman:clearHistory", () => {
    return postmanService.clearHistory();
  });

  // ==================== 设置操作 ====================

  // 获取设置
  ipcMain.handle("postman:getSetting", (_event, key: string) => {
    return postmanService.getSetting(key);
  });

  // 保存设置
  ipcMain.handle(
    "postman:saveSetting",
    (_event, key: string, value: Record<string, unknown>) => {
      return postmanService.saveSetting(key, value);
    }
  );

  console.log("[IPC] Postman IPC handlers registered");
}
