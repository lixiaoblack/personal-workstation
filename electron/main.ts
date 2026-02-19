import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { initDatabase, closeDatabase } from "./database/index";
import * as userService from "./services/userService";
import * as storageService from "./services/storageService";
import * as avatarService from "./services/avatarService";
import * as websocketService from "./services/websocketService";
import * as pythonEnvService from "./services/pythonEnvService";
import * as pythonProcessService from "./services/pythonProcessService";
import * as modelConfigService from "./services/modelConfigService";
import * as conversationService from "./services/conversationService";
import * as knowledgeService from "./services/knowledgeService";
import * as memoryService from "./services/memoryService";
import { dialog } from "electron";
import { MessageType } from "./types/websocket";
import type {
  PythonDetectOptions,
  PythonServiceConfig,
  CreateModelConfigInput,
  UpdateModelConfigInput,
  CreateConversationInput,
  UpdateConversationInput,
  CreateMessageInput,
} from "./types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 开发环境 URL
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

let mainWindow: BrowserWindow | null = null;

// 当前登录用户的 Token（用于登出等操作）
let currentToken: string | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    title: "Personal Workstation",
    show: false,
  });

  // 窗口准备好后再显示，避免白屏
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    // 开发环境打开 DevTools
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * 注册 IPC 处理器
 */
function registerIpcHandlers() {
  // 用户登录
  ipcMain.handle("user:login", async (_event, credentials) => {
    const result = userService.login(credentials);
    if (result.success && result.token) {
      currentToken = result.token;
    }
    return result;
  });

  // 用户注册
  ipcMain.handle("user:register", async (_event, data) => {
    const result = userService.register(data);
    if (result.success && result.token) {
      currentToken = result.token;
    }
    return result;
  });

  // 用户登出
  ipcMain.handle("user:logout", async () => {
    if (currentToken) {
      const success = userService.logout(currentToken);
      currentToken = null;
      return success;
    }
    return true;
  });

  // 获取当前用户
  ipcMain.handle("user:getCurrent", async () => {
    if (!currentToken) {
      return null;
    }
    return userService.validateToken(currentToken);
  });

  // 验证 Token
  ipcMain.handle("user:validateToken", async (_event, token: string) => {
    const user = userService.validateToken(token);
    if (user) {
      currentToken = token;
    }
    return user;
  });

  // 更新用户资料
  ipcMain.handle("user:updateProfile", async (_event, data) => {
    if (!currentToken) {
      return null;
    }
    const user = userService.validateToken(currentToken);
    if (!user) {
      return null;
    }
    return userService.updateProfile(user.id, data);
  });

  // 更新密码
  ipcMain.handle("user:updatePassword", async (_event, data) => {
    if (!currentToken) {
      return { success: false, error: "未登录" };
    }
    const user = userService.validateToken(currentToken);
    if (!user) {
      return { success: false, error: "用户不存在" };
    }
    const result = userService.updatePassword(user.id, data);
    if (result.success) {
      currentToken = null; // 强制重新登录
    }
    return result;
  });

  // 重置密码
  ipcMain.handle("user:resetPassword", async (_event, data) => {
    return userService.resetPassword(data);
  });

  // 检查是否已初始化
  ipcMain.handle("user:isInitialized", async () => {
    return userService.isInitialized();
  });

  // 检查用户名是否存在
  ipcMain.handle("user:checkUsername", async (_event, username: string) => {
    return userService.checkUsernameExists(username);
  });

  // 存储管理
  ipcMain.handle("storage:getInfo", async () => {
    return storageService.getStorageInfo();
  });

  ipcMain.handle("storage:clearCache", async () => {
    return storageService.clearCache();
  });

  // 头像管理
  ipcMain.handle("avatar:select", async () => {
    return avatarService.selectAvatar(mainWindow);
  });

  // WebSocket 服务管理
  ipcMain.handle("ws:getInfo", async () => {
    return websocketService.getServerInfo();
  });

  // Python 环境检测
  ipcMain.handle(
    "python:detect",
    async (_event, options?: PythonDetectOptions) => {
      return pythonEnvService.detectPythonEnvironment(options);
    }
  );

  ipcMain.handle("python:getInstallGuide", async () => {
    return pythonEnvService.getPythonInstallGuide();
  });

  ipcMain.handle("python:checkDependencies", async () => {
    return pythonEnvService.checkAIDependencies();
  });

  // Python 服务管理
  ipcMain.handle(
    "python:service:start",
    async (_event, config?: PythonServiceConfig) => {
      return pythonProcessService.startPythonService(config);
    }
  );

  ipcMain.handle("python:service:stop", async () => {
    return pythonProcessService.stopPythonService();
  });

  ipcMain.handle(
    "python:service:restart",
    async (_event, config?: PythonServiceConfig) => {
      return pythonProcessService.restartPythonService(config);
    }
  );

  ipcMain.handle("python:service:getInfo", async () => {
    return pythonProcessService.getPythonServiceInfo();
  });

  // 模型配置管理
  ipcMain.handle("model:getConfigs", async () => {
    return modelConfigService.getModelConfigs();
  });

  ipcMain.handle("model:getById", async (_event, id: number) => {
    return modelConfigService.getModelConfigById(id);
  });

  ipcMain.handle("model:getDefault", async () => {
    return modelConfigService.getDefaultModelConfig();
  });

  ipcMain.handle("model:getEnabled", async () => {
    return modelConfigService.getEnabledModelConfigs();
  });

  ipcMain.handle(
    "model:create",
    async (_event, input: CreateModelConfigInput) => {
      const result = modelConfigService.createModelConfig(input);
      // 同步模型配置到 Python 服务
      websocketService.syncModelConfigsToPython();
      return result;
    }
  );

  ipcMain.handle(
    "model:update",
    async (_event, id: number, input: UpdateModelConfigInput) => {
      const result = modelConfigService.updateModelConfig(id, input);
      // 同步模型配置到 Python 服务
      websocketService.syncModelConfigsToPython();
      return result;
    }
  );

  ipcMain.handle("model:delete", async (_event, id: number) => {
    const result = modelConfigService.deleteModelConfig(id);
    // 同步模型配置到 Python 服务
    websocketService.syncModelConfigsToPython();
    return result;
  });

  ipcMain.handle("model:setDefault", async (_event, id: number) => {
    const result = modelConfigService.setDefaultModelConfig(id);
    // 同步模型配置到 Python 服务
    websocketService.syncModelConfigsToPython();
    return result;
  });

  // 对话管理
  ipcMain.handle("conversation:getList", async () => {
    return conversationService.getConversationList();
  });

  ipcMain.handle("conversation:getGrouped", async () => {
    return conversationService.getGroupedConversations();
  });

  ipcMain.handle("conversation:getById", async (_event, id: number) => {
    return conversationService.getConversationById(id);
  });

  ipcMain.handle(
    "conversation:create",
    async (_event, input: CreateConversationInput) => {
      return conversationService.createConversation(input);
    }
  );

  ipcMain.handle(
    "conversation:update",
    async (_event, id: number, input: UpdateConversationInput) => {
      return conversationService.updateConversation(id, input);
    }
  );

  ipcMain.handle("conversation:delete", async (_event, id: number) => {
    return conversationService.deleteConversation(id);
  });

  ipcMain.handle("message:add", async (_event, input: CreateMessageInput) => {
    return conversationService.addMessage(input);
  });

  ipcMain.handle(
    "message:autoSetTitle",
    async (_event, conversationId: number) => {
      return conversationService.autoSetConversationTitle(conversationId);
    }
  );

  // 获取对话最近消息（用于上下文传递）
  ipcMain.handle(
    "message:getRecent",
    async (_event, conversationId: number, limit?: number) => {
      return conversationService.getRecentMessages(conversationId, limit);
    }
  );

  // Ollama 相关
  ipcMain.handle("ollama:getStatus", async (_, host?: string) => {
    const wsInfo = websocketService.getServerInfo();

    if (!wsInfo.running || !wsInfo.pythonConnected) {
      return {
        running: false,
        host: host || "http://127.0.0.1:11434",
        error: "Python 服务未连接",
        models: [],
        modelCount: 0,
      };
    }

    return websocketService.getOllamaStatus(host);
  });

  ipcMain.handle("ollama:getModels", async (_, host?: string) => {
    const wsInfo = websocketService.getServerInfo();

    if (!wsInfo.running || !wsInfo.pythonConnected) {
      return [];
    }

    return websocketService.getOllamaModels(host);
  });

  ipcMain.handle("ollama:testConnection", async (_, host?: string) => {
    const wsInfo = websocketService.getServerInfo();

    if (!wsInfo.running || !wsInfo.pythonConnected) {
      return {
        success: false,
        host: host || "http://127.0.0.1:11434",
        error: "Python 服务未连接",
      };
    }

    return websocketService.testOllamaConnection(host);
  });

  // ==================== Skills 技能相关 ====================

  // 获取技能列表
  ipcMain.handle("skill:getList", async () => {
    const wsInfo = websocketService.getServerInfo();

    if (!wsInfo.running || !wsInfo.pythonConnected) {
      return {
        success: false,
        skills: [],
        count: 0,
        error: "Python 服务未连接",
      };
    }

    return websocketService.getSkillList();
  });

  // 执行技能
  ipcMain.handle(
    "skill:execute",
    async (_, skillName: string, parameters?: Record<string, unknown>) => {
      const wsInfo = websocketService.getServerInfo();

      if (!wsInfo.running || !wsInfo.pythonConnected) {
        return {
          success: false,
          skillName,
          error: "Python 服务未连接",
        };
      }

      return websocketService.executeSkill(skillName, parameters);
    }
  );

  // 重载技能
  ipcMain.handle("skill:reload", async (_, skillName?: string) => {
    const wsInfo = websocketService.getServerInfo();

    if (!wsInfo.running || !wsInfo.pythonConnected) {
      return {
        success: false,
        error: "Python 服务未连接",
      };
    }

    return websocketService.reloadSkills(skillName);
  });

  // ==================== Knowledge 知识库相关 ====================

  // 创建知识库
  ipcMain.handle("knowledge:create", async (_event, input) => {
    try {
      // 先在本地数据库创建，生成 ID
      const knowledge = await knowledgeService.createKnowledge(
        input.name,
        input.description,
        input.embeddingModel,
        input.embeddingModelName
      );

      // 检查 Python 服务是否连接
      const wsInfo = websocketService.getServerInfo();
      if (wsInfo.pythonConnected) {
        // 通过 WebSocket 创建向量存储，使用本地数据库生成的 ID
        try {
          await websocketService.sendKnowledgeRequest(
            MessageType.KNOWLEDGE_CREATE,
            {
              knowledgeId: knowledge.id,
              name: input.name,
              description: input.description,
              embeddingModel: input.embeddingModel,
              embeddingModelName: input.embeddingModelName,
            }
          );
        } catch (pyError) {
          console.error("[Main] Python 端创建向量存储失败:", pyError);
          // Python 失败不回滚本地记录，用户可以稍后重试
        }
      }

      return {
        success: true,
        knowledge: [knowledge],
        count: 1,
      };
    } catch (error) {
      console.error("[Main] 创建知识库失败:", error);
      return {
        success: false,
        knowledge: [],
        count: 0,
        error: String(error),
      };
    }
  });

  // 删除知识库
  ipcMain.handle("knowledge:delete", async (_event, knowledgeId: string) => {
    try {
      const wsInfo = websocketService.getServerInfo();
      if (wsInfo.pythonConnected) {
        await websocketService.sendKnowledgeRequest(
          MessageType.KNOWLEDGE_DELETE,
          { knowledgeId }
        );
      }

      const success = await knowledgeService.deleteKnowledge(knowledgeId);
      return { success };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 列出知识库
  ipcMain.handle("knowledge:list", async () => {
    try {
      const knowledge = knowledgeService.listKnowledge();
      return {
        success: true,
        knowledge,
        count: knowledge.length,
      };
    } catch (error) {
      return {
        success: false,
        knowledge: [],
        count: 0,
        error: String(error),
      };
    }
  });

  // 获取知识库详情
  ipcMain.handle("knowledge:get", async (_event, knowledgeId: string) => {
    try {
      const knowledge = knowledgeService.getKnowledge(knowledgeId);
      return {
        success: !!knowledge,
        knowledge: knowledge ? [knowledge] : [],
        count: knowledge ? 1 : 0,
        error: knowledge ? undefined : "知识库不存在",
      };
    } catch (error) {
      return {
        success: false,
        knowledge: [],
        count: 0,
        error: String(error),
      };
    }
  });

  // 选择知识库文件
  ipcMain.handle("knowledge:selectFiles", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: "选择要添加的文档",
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "支持的文档",
          extensions: ["md", "txt", "pdf", "json", "html"],
        },
        { name: "Markdown", extensions: ["md"] },
        { name: "文本文件", extensions: ["txt"] },
        { name: "PDF", extensions: ["pdf"] },
        { name: "JSON", extensions: ["json"] },
        { name: "HTML", extensions: ["html", "htm"] },
      ],
    });
    return result;
  });

  // 添加文档到知识库
  ipcMain.handle(
    "knowledge:addDocument",
    async (_event, knowledgeId: string, filePath: string) => {
      try {
        const wsInfo = websocketService.getServerInfo();
        if (!wsInfo.pythonConnected) {
          return {
            success: false,
            error: "Python 服务未连接，无法处理文档",
          };
        }

        const result = (await websocketService.sendKnowledgeRequest(
          MessageType.KNOWLEDGE_ADD_DOCUMENT,
          { knowledgeId, filePath }
        )) as {
          success: boolean;
          document?: unknown;
          error?: string;
        };

        // 如果 Python 端添加成功，同步保存到本地数据库
        if (result.success && result.document) {
          const doc = result.document as Record<string, unknown>;
          try {
            const fileName =
              (doc.fileName as string) ||
              filePath.split("/").pop() ||
              "unknown";
            const fileType =
              (doc.fileType as string) ||
              fileName.split(".").pop() ||
              "unknown";
            const fileSize = (doc.fileSize as number) || 0;
            const chunkCount = (doc.chunkCount as number) || 0;

            const document = knowledgeService.addDocument(
              knowledgeId,
              fileName,
              filePath,
              fileType,
              fileSize,
              chunkCount
            );

            return {
              success: true,
              document,
            };
          } catch (dbError) {
            console.error("[Main] 保存文档到本地数据库失败:", dbError);
            // 仍然返回 Python 端的结果
          }
        }

        return result;
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  );

  // 删除文档
  ipcMain.handle(
    "knowledge:removeDocument",
    async (_event, knowledgeId: string, documentId: string) => {
      try {
        const success = knowledgeService.removeDocument(
          knowledgeId,
          documentId
        );
        return { success };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  );

  // 搜索知识库
  ipcMain.handle(
    "knowledge:search",
    async (_event, knowledgeId: string, query: string, topK?: number) => {
      try {
        const wsInfo = websocketService.getServerInfo();
        if (!wsInfo.pythonConnected) {
          return {
            success: false,
            results: [],
            count: 0,
            error: "Python 服务未连接",
          };
        }

        return await websocketService.sendKnowledgeRequest(
          MessageType.KNOWLEDGE_SEARCH,
          { knowledgeId, query, topK: topK || 5 }
        );
      } catch (error) {
        return {
          success: false,
          results: [],
          count: 0,
          error: String(error),
        };
      }
    }
  );

  // 列出知识库文档
  ipcMain.handle(
    "knowledge:listDocuments",
    async (_event, knowledgeId: string) => {
      try {
        const documents = knowledgeService.listDocuments(knowledgeId);
        return {
          success: true,
          documents,
          count: documents.length,
        };
      } catch (error) {
        return {
          success: false,
          documents: [],
          count: 0,
          error: String(error),
        };
      }
    }
  );

  // ========== Memory 记忆管理 IPC ==========

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
        const summaries =
          memoryService.getSummariesByConversation(conversationId);
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

          memoryService.createSummary(
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

// Electron 应用生命周期
app.whenReady().then(async () => {
  // 初始化数据库
  initDatabase();

  // 注册 IPC 处理器
  registerIpcHandlers();

  // 启动 WebSocket 服务器
  try {
    const wsInfo = await websocketService.startWebSocketServer();
    console.log(
      `[Main] WebSocket 服务已启动: ws://${wsInfo.host}:${wsInfo.port}`
    );

    // 自动启动 Python 服务
    try {
      const pythonResult = await pythonProcessService.startPythonService({
        port: wsInfo.port,
        autoRestart: true,
        maxRestarts: 3,
      });
      if (pythonResult.success) {
        console.log(`[Main] Python 服务已自动启动，PID: ${pythonResult.pid}`);
      } else {
        console.warn(`[Main] Python 服务自动启动失败: ${pythonResult.error}`);
      }
    } catch (pythonError) {
      console.warn("[Main] Python 服务自动启动异常:", pythonError);
    }
  } catch (error) {
    console.error("[Main] WebSocket 服务启动失败:", error);
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", async () => {
  // 停止 Python 服务
  pythonProcessService.cleanup();

  // 关闭 WebSocket 服务器
  await websocketService.stopWebSocketServer();

  // 关闭数据库连接
  closeDatabase();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  // 应用退出前清理
  pythonProcessService.cleanup();
  await websocketService.stopWebSocketServer();
  closeDatabase();
});
