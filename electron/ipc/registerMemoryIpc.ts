/**
 * 记忆管理 IPC 处理器
 *
 * 处理用户记忆、对话摘要等
 */

import { ipcMain } from "electron";
import * as memoryService from "../services/memoryService";
import * as conversationService from "../services/conversationService";
import * as websocketService from "../services/websocketService";

/**
 * 注册记忆管理相关 IPC 处理器
 */
export function registerMemoryIpc(): void {
  // ========== 记忆管理 ==========

  // 获取记忆上下文
  ipcMain.handle("memory:getContext", async () => {
    try {
      const context = memoryService.buildMemoryContext();
      return {
        success: true,
        ...context,
      };
    } catch (error) {
      return {
        success: false,
        memories: [],
        summaries: [],
        contextPrompt: "",
        error: String(error),
      };
    }
  });

  // 保存记忆
  ipcMain.handle(
    "memory:save",
    async (
      _event,
      memoryType: string,
      memoryKey: string,
      memoryValue: string,
      sourceConversationId?: number,
      confidence?: number
    ) => {
      try {
        const memory = memoryService.saveMemory(
          memoryType as memoryService.UserMemory["memoryType"],
          memoryKey,
          memoryValue,
          sourceConversationId,
          confidence
        );
        return {
          success: true,
          memory,
        };
      } catch (error) {
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 批量保存记忆
  ipcMain.handle(
    "memory:saveBatch",
    async (
      _event,
      memories: Array<{
        type: string;
        key: string;
        value: string;
        sourceConversationId?: number;
      }>
    ) => {
      try {
        memoryService.saveMemories(
          memories.map((m) => ({
            type: m.type as memoryService.UserMemory["memoryType"],
            key: m.key,
            value: m.value,
            sourceConversationId: m.sourceConversationId,
          }))
        );
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 创建摘要
  ipcMain.handle(
    "memory:createSummary",
    async (
      _event,
      conversationId: number,
      startMessageId: number,
      endMessageId: number,
      summary: string,
      keyTopics: string[],
      messageCount: number
    ) => {
      try {
        const result = memoryService.createSummary(
          conversationId,
          startMessageId,
          endMessageId,
          summary,
          keyTopics,
          messageCount
        );
        return {
          success: true,
          summary: result,
        };
      } catch (error) {
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 获取记忆列表
  ipcMain.handle("memory:list", async (_event, memoryType?: string) => {
    try {
      const memories = memoryType
        ? memoryService.getMemoriesByType(
            memoryType as memoryService.UserMemory["memoryType"]
          )
        : memoryService.getAllMemories();
      return {
        success: true,
        memories,
      };
    } catch (error) {
      return {
        success: false,
        memories: [],
        error: String(error),
      };
    }
  });

  // 删除记忆
  ipcMain.handle("memory:delete", async (_event, memoryId: number) => {
    try {
      const success = memoryService.deleteMemory(memoryId);
      return { success };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  });

  // 获取对话摘要列表
  ipcMain.handle(
    "memory:getSummaries",
    async (_event, conversationId: number) => {
      try {
        const summaries = await memoryService.getSummariesByConversation(
          conversationId
        );
        return {
          success: true,
          summaries,
        };
      } catch (error) {
        return {
          success: false,
          summaries: [],
          error: String(error),
        };
      }
    }
  );

  // 生成摘要（通过 Python LLM 服务）
  ipcMain.handle(
    "memory:generateSummary",
    async (
      _event,
      conversationId: number,
      messages: Array<{ role: string; content: string }>,
      modelId?: number
    ) => {
      try {
        // 调用 WebSocket 服务发送请求给 Python
        const result = await websocketService.generateSummary(
          conversationId,
          messages,
          modelId
        );

        // 如果成功生成摘要，保存到数据库
        if (result.success && result.summary) {
          // 获取消息的起始和结束 ID
          const recentMessages = await conversationService.getRecentMessages(
            conversationId,
            100
          );
          const messageCount = recentMessages.length;
          const startMessageId = recentMessages[0]?.id || 0;
          const endMessageId =
            recentMessages[recentMessages.length - 1]?.id || 0;

          await memoryService.createSummary(
            conversationId,
            startMessageId,
            endMessageId,
            result.summary,
            result.keyTopics || [],
            messageCount
          );
        }

        return result;
      } catch (error) {
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );
}
