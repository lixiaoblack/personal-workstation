/**
 * 模型配置和对话管理 IPC 处理器
 *
 * 处理模型配置、对话、消息等相关功能
 */

import { ipcMain } from "electron";
import * as modelConfigService from "../services/modelConfigService";
import * as conversationService from "../services/conversationService";
import * as websocketService from "../services/websocketService";
import type {
  CreateModelConfigInput,
  UpdateModelConfigInput,
  CreateConversationInput,
  UpdateConversationInput,
  CreateMessageInput,
} from "../types";

/**
 * 注册模型配置和对话相关 IPC 处理器
 */
export function registerModelIpc(): void {
  // ========== 模型配置管理 ==========

  // 获取所有模型配置
  ipcMain.handle("model:getConfigs", async () => {
    return modelConfigService.getModelConfigs();
  });

  // 获取单个模型配置
  ipcMain.handle("model:getById", async (_event, id: number) => {
    return modelConfigService.getModelConfigById(id);
  });

  // 获取默认模型配置
  ipcMain.handle("model:getDefault", async () => {
    return modelConfigService.getDefaultModelConfig();
  });

  // 获取启用的模型配置
  ipcMain.handle("model:getEnabled", async () => {
    return modelConfigService.getEnabledModelConfigs();
  });

  // 创建模型配置
  ipcMain.handle(
    "model:create",
    async (_event, input: CreateModelConfigInput) => {
      const result = modelConfigService.createModelConfig(input);
      // 同步模型配置到 Python 服务
      websocketService.syncModelConfigsToPython();
      return result;
    }
  );

  // 更新模型配置
  ipcMain.handle(
    "model:update",
    async (_event, id: number, input: UpdateModelConfigInput) => {
      const result = modelConfigService.updateModelConfig(id, input);
      // 同步模型配置到 Python 服务
      websocketService.syncModelConfigsToPython();
      return result;
    }
  );

  // 删除模型配置
  ipcMain.handle("model:delete", async (_event, id: number) => {
    const result = modelConfigService.deleteModelConfig(id);
    // 同步模型配置到 Python 服务
    websocketService.syncModelConfigsToPython();
    return result;
  });

  // 设置默认模型配置
  ipcMain.handle("model:setDefault", async (_event, id: number) => {
    const result = modelConfigService.setDefaultModelConfig(id);
    // 同步模型配置到 Python 服务
    websocketService.syncModelConfigsToPython();
    return result;
  });

  // ========== 对话管理 ==========

  // 获取对话列表
  ipcMain.handle("conversation:getList", async () => {
    return conversationService.getConversationList();
  });

  // 获取分组后的对话列表
  ipcMain.handle("conversation:getGrouped", async () => {
    return conversationService.getGroupedConversations();
  });

  // 获取单个对话
  ipcMain.handle("conversation:getById", async (_event, id: number) => {
    return conversationService.getConversationById(id);
  });

  // 创建对话
  ipcMain.handle(
    "conversation:create",
    async (_event, input: CreateConversationInput) => {
      return conversationService.createConversation(input);
    }
  );

  // 更新对话
  ipcMain.handle(
    "conversation:update",
    async (_event, id: number, input: UpdateConversationInput) => {
      return conversationService.updateConversation(id, input);
    }
  );

  // 删除对话
  ipcMain.handle("conversation:delete", async (_event, id: number) => {
    return conversationService.deleteConversation(id);
  });

  // ========== 消息管理 ==========

  // 添加消息
  ipcMain.handle("message:add", async (_event, input: CreateMessageInput) => {
    return conversationService.addMessage(input);
  });

  // 自动设置对话标题
  ipcMain.handle(
    "message:autoSetTitle",
    async (_event, conversationId: number) => {
      return conversationService.autoSetConversationTitle(conversationId);
    }
  );

  // 获取对话最近消息
  ipcMain.handle(
    "message:getRecent",
    async (_event, conversationId: number, limit?: number) => {
      return conversationService.getRecentMessages(conversationId, limit);
    }
  );
}
