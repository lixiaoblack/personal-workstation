/**
 * SimplePostman 简易Postman页面
 *
 * 功能：
 * 1. 接口分组、请求记录（数据持久化）
 * 2. 解析 Swagger/OpenAPI 文档
 * 3. 多环境配置支持
 * 4. 全局配置和文件夹级别配置
 */
import React, { useState, useCallback } from "react";
import { App, Modal, Upload, Button, Input, Select, Form } from "antd";
import type { UploadFile } from "antd/es/upload/interface";

// 组件导入
import { PostmanSidebar } from "./components/PostmanSidebar";
import { PostmanWorkspace } from "./components/PostmanWorkspace";

// 配置和类型导入
import {
  DEFAULT_HEADERS,
  DEFAULT_GLOBAL_CONFIG,
  type RequestConfig,
  type ResponseData,
  type ApiFolder,
  type HttpMethod,
  type GlobalConfig,
  type EnvironmentConfig,
  type AuthConfig,
  type SwaggerRequestInfo,
} from "./config";

// Swagger 解析结果类型（来自后端）
interface SwaggerEndpointFromBackend {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Array<{
    name: string;
    in: "query" | "header" | "path" | "cookie";
    description?: string;
    required?: boolean;
    type?: string;
    format?: string;
    schema?: Record<string, unknown>;
  }>;
  requestBody?: {
    description?: string;
    required?: boolean;
    content?: Array<{
      contentType: string;
      schema?: Record<string, unknown>;
      example?: unknown;
      generatedExample?: Record<string, unknown>;
    }>;
  };
  responses?: Array<{
    statusCode: string;
    description?: string;
    content?: Array<{
      contentType: string;
      schema?: Record<string, unknown>;
      example?: unknown;
    }>;
  }>;
}

interface SwaggerParseResultFromBackend {
  success: boolean;
  error?: string;
  info?: {
    title: string;
    version: string;
    description?: string;
  };
  endpoints?: SwaggerEndpointFromBackend[];
  tags?: Array<{ name: string; description?: string }>;
  components?: {
    schemas?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    responses?: Record<string, unknown>;
  };
  definitions?: Record<string, unknown>;
}

/**
 * 处理 Swagger 解析结果，按 tags 分组创建文件夹和请求
 */
function processSwaggerResult(
  parseResult: SwaggerParseResultFromBackend,
  swaggerSourceUrl?: string
): {
  newFolders: ApiFolder[];
  newRequests: RequestConfig[];
} {
  if (!parseResult.success || !parseResult.endpoints) {
    return { newFolders: [], newRequests: [] };
  }

  const apiTitle = parseResult.info?.title || "导入的 API";
  const apiDescription = parseResult.info?.description;
  const timestamp = Date.now();

  // 创建 tag 信息映射 (name -> {description, displayName})
  const tagInfoMap = new Map<
    string,
    { description: string; displayName: string }
  >();
  if (parseResult.tags) {
    parseResult.tags.forEach((tag) => {
      tagInfoMap.set(tag.name, {
        description: tag.description || "",
        displayName: tag.description || tag.name,
      });
    });
  }

  // 收集所有 tags
  const tagSet = new Set<string>();
  parseResult.endpoints.forEach((endpoint) => {
    if (endpoint.tags && endpoint.tags.length > 0) {
      endpoint.tags.forEach((tag) => tagSet.add(tag));
    } else {
      tagSet.add("默认分组");
    }
  });

  // 创建 tag 到文件夹的映射
  const tagToFolderMap = new Map<string, ApiFolder>();
  const newFolders: ApiFolder[] = [];

  // 创建主文件夹（API 文件）
  const mainFolder: ApiFolder = {
    id: `folder-${timestamp}`,
    name: apiTitle,
    description: apiDescription,
    createdAt: timestamp,
    updatedAt: timestamp,
    swaggerUrl: swaggerSourceUrl,
  };
  newFolders.push(mainFolder);

  // 为每个 tag 创建子文件夹（使用 description 作为显示名称）
  Array.from(tagSet).forEach((tag, index) => {
    const tagInfo = tagInfoMap.get(tag);
    const tagFolder: ApiFolder = {
      id: `folder-${timestamp}-tag-${index}`,
      name: tagInfo?.displayName || tag,
      description: tagInfo?.description || "",
      parentId: mainFolder.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    tagToFolderMap.set(tag, tagFolder);
    newFolders.push(tagFolder);
  });

  // 创建请求
  const newRequests: RequestConfig[] = parseResult.endpoints.map(
    (endpoint, index) => {
      let bodyContent = "";
      if (endpoint.requestBody?.content?.length) {
        const firstContent = endpoint.requestBody.content[0];
        if (firstContent.generatedExample) {
          bodyContent = JSON.stringify(firstContent.generatedExample, null, 2);
        } else if (firstContent.example) {
          bodyContent = JSON.stringify(firstContent.example, null, 2);
        }
      }

      // 确定文件夹 ID
      const tagName =
        endpoint.tags && endpoint.tags.length > 0
          ? endpoint.tags[0]
          : "默认分组";
      const targetFolder = tagToFolderMap.get(tagName);

      // 构建 swaggerInfo - 每个接口独立的类型信息
      const swaggerInfo: SwaggerRequestInfo = {
        tags: endpoint.tags,
        parameters: endpoint.parameters?.map((p) => ({
          name: p.name,
          in: p.in,
          description: p.description,
          required: p.required,
          type: p.type,
          format: p.format,
          schema: p.schema,
        })),
        requestBody: endpoint.requestBody,
        responses: endpoint.responses,
        components: parseResult.components,
        definitions: parseResult.definitions,
      };

      return {
        id: `req-${timestamp}-${index}`,
        name: endpoint.summary || endpoint.path,
        method: endpoint.method.toUpperCase() as HttpMethod,
        url: endpoint.path,
        params:
          endpoint.parameters?.map((p) => ({
            id: `param-${timestamp}-${Math.random()}`,
            key: p.name,
            value: "",
            description: p.description,
            enabled: p.required ?? false,
          })) || [],
        headers: [...DEFAULT_HEADERS],
        bodyType: "json" as const,
        body: bodyContent,
        authType: "none" as const,
        authConfig: {},
        createdAt: timestamp,
        updatedAt: timestamp,
        folderId: targetFolder?.id || mainFolder.id,
        swaggerInfo,
      };
    }
  );

  return { newFolders, newRequests };
}

const SimplePostman: React.FC = () => {
  const { message: antdMessage } = App.useApp();

  // ==================== 状态管理 ====================

  // 全局配置
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>(
    DEFAULT_GLOBAL_CONFIG
  );

  // Swagger 解析相关
  const [swaggerUrl, setSwaggerUrl] = useState("");
  const [swaggerLoading, setSwaggerLoading] = useState(false);

  // 侧边栏状态
  const [activeRequestId, setActiveRequestId] = useState<string | undefined>();
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>();

  // 文件夹和请求列表（模拟数据，后续接入数据库）
  const [folders, setFolders] = useState<ApiFolder[]>([]);
  const [requests, setRequests] = useState<RequestConfig[]>([]);

  // 当前请求配置
  const [currentRequest, setCurrentRequest] = useState<Partial<RequestConfig>>({
    method: "GET",
    headers: [...DEFAULT_HEADERS],
    bodyType: "json",
    body: "",
    authType: "none",
    authConfig: {},
  });

  // 响应数据
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [responseLoading, setResponseLoading] = useState(false);

  // 同步状态
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");

  // 文件上传相关
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 文件夹编辑弹窗
  const [folderEditModalVisible, setFolderEditModalVisible] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ApiFolder | null>(null);
  const [folderForm] = Form.useForm();

  // 全局配置弹窗
  const [globalConfigModalVisible, setGlobalConfigModalVisible] =
    useState(false);
  const [globalConfigForm] = Form.useForm();

  // ==================== 辅助函数 ====================

  // 获取当前环境配置
  const getCurrentEnvironment = useCallback(():
    | EnvironmentConfig
    | undefined => {
    return globalConfig.environments.find(
      (e) => e.key === globalConfig.currentEnvironment
    );
  }, [globalConfig]);

  // 获取文件夹的有效 baseUrl（继承逻辑）
  const getEffectiveBaseUrl = useCallback(
    (folderId?: string): string => {
      if (folderId) {
        const folder = folders.find((f) => f.id === folderId);
        // 如果是项目（顶层文件夹，没有 parentId），直接使用其 baseUrl
        if (!folder?.parentId && folder?.baseUrl) {
          return folder.baseUrl;
        }
        // 如果是分组，检查是否覆盖全局配置
        if (folder?.overrideGlobalBaseUrl && folder.baseUrl) {
          return folder.baseUrl;
        }
        // 如果分组没有设置，尝试获取其所属项目的 baseUrl
        if (folder?.parentId) {
          const parentFolder = folders.find((f) => f.id === folder.parentId);
          if (parentFolder?.baseUrl) {
            return parentFolder.baseUrl;
          }
        }
      }
      // 使用当前环境的 baseUrl
      const currentEnv = getCurrentEnvironment();
      return currentEnv?.baseUrl || "";
    },
    [folders, getCurrentEnvironment]
  );

  // 获取文件夹的有效授权配置（继承逻辑）
  const getEffectiveAuth = useCallback(
    (folderId?: string): GlobalConfig["globalAuth"] => {
      if (folderId) {
        const folder = folders.find((f) => f.id === folderId);
        if (folder?.overrideGlobalAuth && folder.auth) {
          return folder.auth;
        }
      }
      return globalConfig.globalAuth;
    },
    [folders, globalConfig.globalAuth]
  );

  // 构建完整的请求 URL
  const buildFullUrl = useCallback(
    (requestUrl: string, folderId?: string): string => {
      const baseUrl = getEffectiveBaseUrl(folderId);
      // 如果请求 URL 已经是完整 URL，直接返回
      if (
        requestUrl.startsWith("http://") ||
        requestUrl.startsWith("https://")
      ) {
        return requestUrl;
      }
      // 拼接 baseUrl 和请求路径
      if (baseUrl) {
        const normalizedBase = baseUrl.endsWith("/")
          ? baseUrl.slice(0, -1)
          : baseUrl;
        const normalizedPath = requestUrl.startsWith("/")
          ? requestUrl
          : `/${requestUrl}`;
        return `${normalizedBase}${normalizedPath}`;
      }
      return requestUrl;
    },
    [getEffectiveBaseUrl]
  );

  // ==================== 事件处理 ====================

  // 解析 Swagger URL
  const handleParseSwagger = useCallback(async () => {
    if (!swaggerUrl.trim()) {
      antdMessage.warning("请输入 Swagger URL");
      return;
    }

    setSwaggerLoading(true);
    setSyncing(true);
    setSyncStatus("正在解析 Swagger 文档...");

    try {
      const parseResult = await window.electronAPI.swaggerParseUrl(swaggerUrl);

      if (parseResult.success && parseResult.endpoints) {
        const { newFolders, newRequests } = processSwaggerResult(
          parseResult as SwaggerParseResultFromBackend,
          swaggerUrl
        );
        setFolders((prev) => [...prev, ...newFolders]);
        setRequests((prev) => [...prev, ...newRequests]);
        // 设置新导入的项目为当前项目
        if (newFolders.length > 0) {
          setActiveProjectId(newFolders[0].id);
        }
        antdMessage.success(
          `成功导入 ${newRequests.length} 个接口，共 ${
            newFolders.length - 1
          } 个分组`
        );
      } else {
        antdMessage.error(parseResult.error || "解析失败");
      }
    } catch (error) {
      antdMessage.error(
        `解析失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      setSwaggerLoading(false);
      setSyncing(false);
      setSyncStatus("");
    }
  }, [swaggerUrl, antdMessage]);

  // 上传 Swagger 文件
  const handleUploadSwagger = useCallback(async () => {
    const result = await window.electronAPI.swaggerSelectFile();
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      setSyncing(true);
      setSyncStatus("正在解析 Swagger 文档...");

      try {
        const parseResult = await window.electronAPI.swaggerParseFile(filePath);

        if (parseResult.success && parseResult.endpoints) {
          const { newFolders, newRequests } = processSwaggerResult(
            parseResult as SwaggerParseResultFromBackend,
            undefined // 文件上传没有 URL
          );
          setFolders((prev) => [...prev, ...newFolders]);
          setRequests((prev) => [...prev, ...newRequests]);
          // 设置新导入的项目为当前项目
          if (newFolders.length > 0) {
            setActiveProjectId(newFolders[0].id);
          }
          antdMessage.success(
            `成功导入 ${newRequests.length} 个接口，共 ${
              newFolders.length - 1
            } 个分组`
          );
        } else {
          antdMessage.error(parseResult.error || "解析失败");
        }
      } catch (error) {
        antdMessage.error(
          `解析失败: ${error instanceof Error ? error.message : "未知错误"}`
        );
      } finally {
        setSyncing(false);
        setSyncStatus("");
      }
    }
  }, [antdMessage]);

  // 处理文件上传
  const handleUploadChange = useCallback(
    async (info: { fileList: UploadFile[] }) => {
      setFileList(info.fileList);

      if (info.fileList.length > 0) {
        const file = info.fileList[0].originFileObj;
        if (file) {
          setSyncing(true);
          setSyncStatus("正在解析 Swagger 文档...");

          try {
            const content = await file.text();
            const format =
              file.name.endsWith(".yaml") || file.name.endsWith(".yml")
                ? "yaml"
                : "json";
            const parseResult = await window.electronAPI.swaggerParseContent(
              content,
              format
            );

            if (parseResult.success && parseResult.endpoints) {
              const { newFolders, newRequests } = processSwaggerResult(
                parseResult as SwaggerParseResultFromBackend,
                undefined // 文件上传没有 URL
              );
              setFolders((prev) => [...prev, ...newFolders]);
              setRequests((prev) => [...prev, ...newRequests]);
              antdMessage.success(
                `成功导入 ${newRequests.length} 个接口，共 ${
                  newFolders.length - 1
                } 个分组`
              );
              setUploadModalVisible(false);
              setFileList([]);
            } else {
              antdMessage.error(parseResult.error || "解析失败");
            }
          } catch (error) {
            antdMessage.error(
              `文件解析失败: ${
                error instanceof Error ? error.message : "未知错误"
              }`
            );
          } finally {
            setSyncing(false);
            setSyncStatus("");
          }
        }
      }
    },
    [antdMessage]
  );

  // 选择请求
  const handleRequestSelect = useCallback(
    (id: string) => {
      const request = requests.find((r) => r.id === id);
      if (request) {
        setCurrentRequest(request);
        setActiveRequestId(id);
        setResponse(null);
      }
    },
    [requests]
  );

  // 发送请求
  const handleSendRequest = useCallback(async () => {
    if (!currentRequest.url) {
      antdMessage.warning("请输入请求 URL");
      return;
    }

    setResponseLoading(true);
    const startTime = Date.now();

    try {
      const headers: Record<string, string> = {};
      (currentRequest.headers || []).forEach((h) => {
        if (h.enabled && h.key) {
          headers[h.key] = h.value;
        }
      });

      // 获取有效的授权配置
      const effectiveAuth = getEffectiveAuth(currentRequest.folderId);

      // 添加 Auth（优先使用请求级别的授权，否则使用继承的授权）
      const authType =
        currentRequest.authType !== "none"
          ? currentRequest.authType
          : effectiveAuth?.type;
      const authConfig =
        currentRequest.authType !== "none"
          ? currentRequest.authConfig
          : effectiveAuth;

      if (authType === "bearer" && authConfig?.bearerToken) {
        headers["Authorization"] = `Bearer ${authConfig.bearerToken}`;
      } else if (authType === "basic" && authConfig?.basicUsername) {
        const encoded = btoa(
          `${authConfig.basicUsername}:${authConfig.basicPassword || ""}`
        );
        headers["Authorization"] = `Basic ${encoded}`;
      } else if (authType === "api-key" && authConfig?.apiKeyName) {
        if (authConfig.apiKeyAddTo !== "query") {
          headers[authConfig.apiKeyName] = authConfig.apiKeyValue || "";
        }
      }

      // 构建完整 URL
      let url = buildFullUrl(currentRequest.url, currentRequest.folderId);
      const params = new URLSearchParams();
      (currentRequest.params || []).forEach((p) => {
        if (p.enabled && p.key) {
          params.append(p.key, p.value);
        }
      });

      // API Key 添加到 query
      if (
        authType === "api-key" &&
        authConfig?.apiKeyName &&
        authConfig.apiKeyAddTo === "query"
      ) {
        params.append(authConfig.apiKeyName, authConfig.apiKeyValue || "");
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const options: RequestInit = {
        method: currentRequest.method,
        headers,
      };

      if (
        currentRequest.method !== "GET" &&
        currentRequest.method !== "HEAD" &&
        currentRequest.body
      ) {
        options.body = currentRequest.body;
      }

      const res = await fetch(url, options);
      const endTime = Date.now();

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let body: string;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        body = JSON.stringify(data, null, 2);
      } else {
        body = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body,
        time: endTime - startTime,
        size: new Blob([body]).size,
      });

      antdMessage.success("请求成功");
    } catch (error) {
      const endTime = Date.now();
      setResponse({
        status: 0,
        statusText: "Error",
        headers: {},
        body: `请求失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`,
        time: endTime - startTime,
        size: 0,
      });
      antdMessage.error("请求失败");
    } finally {
      setResponseLoading(false);
    }
  }, [currentRequest, antdMessage, getEffectiveAuth, buildFullUrl]);

  // 文件夹操作
  const handleEditFolder = useCallback(
    (folder: ApiFolder) => {
      setEditingFolder(folder);
      folderForm.setFieldsValue({
        name: folder.name,
        description: folder.description,
        baseUrl: folder.baseUrl || "",
        overrideGlobalBaseUrl: folder.overrideGlobalBaseUrl || false,
        overrideGlobalAuth: folder.overrideGlobalAuth || false,
      });
      setFolderEditModalVisible(true);
    },
    [folderForm]
  );

  const handleDeleteFolder = useCallback(
    (folderId: string) => {
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setRequests((prev) => prev.filter((r) => r.folderId !== folderId));
      antdMessage.success("文件夹已删除");
    },
    [antdMessage]
  );

  const handleSaveFolder = useCallback(async () => {
    try {
      const values = await folderForm.validateFields();
      if (editingFolder) {
        setFolders((prev) =>
          prev.map((f) =>
            f.id === editingFolder.id
              ? {
                  ...f,
                  ...values,
                  updatedAt: Date.now(),
                }
              : f
          )
        );
        antdMessage.success("文件夹已更新");
      }
      setFolderEditModalVisible(false);
      setEditingFolder(null);
    } catch {
      // 表单验证失败
    }
  }, [editingFolder, folderForm, antdMessage]);

  // 更新项目信息
  const handleUpdateProject = useCallback(
    (project: ApiFolder) => {
      setFolders((prev) =>
        prev.map((f) =>
          f.id === project.id ? { ...project, updatedAt: Date.now() } : f
        )
      );
      antdMessage.success("项目已更新");
    },
    [antdMessage]
  );

  // 重新解析项目
  const handleReparseProject = useCallback(
    async (project: ApiFolder) => {
      if (!project.swaggerUrl) {
        antdMessage.warning("该项目没有 Swagger URL，无法重新解析");
        return;
      }

      setSwaggerLoading(true);
      setSyncing(true);
      setSyncStatus("正在重新解析 Swagger 文档...");

      try {
        const parseResult = await window.electronAPI.swaggerParseUrl(
          project.swaggerUrl
        );

        if (parseResult.success && parseResult.endpoints) {
          const { newFolders, newRequests } = processSwaggerResult(
            parseResult as SwaggerParseResultFromBackend,
            project.swaggerUrl
          );

          // 删除旧的项目及其子文件夹和请求
          const oldFolderIds = folders
            .filter((f) => f.id === project.id || f.parentId === project.id)
            .map((f) => f.id);
          setFolders((prev) =>
            prev.filter((f) => !oldFolderIds.includes(f.id))
          );
          setRequests((prev) =>
            prev.filter((r) => !oldFolderIds.includes(r.folderId || ""))
          );

          // 添加新的文件夹和请求
          setFolders((prev) => [...prev, ...newFolders]);
          setRequests((prev) => [...prev, ...newRequests]);

          // 设置新项目为当前项目
          if (newFolders.length > 0) {
            setActiveProjectId(newFolders[0].id);
          }

          antdMessage.success(
            `重新解析成功，导入 ${newRequests.length} 个接口`
          );
        } else {
          antdMessage.error(parseResult.error || "解析失败");
        }
      } catch (error) {
        antdMessage.error(
          `解析失败: ${error instanceof Error ? error.message : "未知错误"}`
        );
      } finally {
        setSwaggerLoading(false);
        setSyncing(false);
        setSyncStatus("");
      }
    },
    [folders, antdMessage]
  );

  // 环境切换
  const handleEnvironmentChange = useCallback(
    (envKey: string) => {
      setGlobalConfig((prev) => ({
        ...prev,
        currentEnvironment: envKey,
      }));
      const env = globalConfig.environments.find((e) => e.key === envKey);
      antdMessage.success(`已切换到 ${env?.name || envKey}`);
    },
    [globalConfig.environments, antdMessage]
  );

  // 打开全局配置弹窗
  const handleOpenGlobalConfig = useCallback(() => {
    globalConfigForm.setFieldsValue({
      environments: globalConfig.environments,
      globalAuth: globalConfig.globalAuth,
    });
    setGlobalConfigModalVisible(true);
  }, [globalConfig, globalConfigForm]);

  // 保存全局配置
  const handleSaveGlobalConfig = useCallback(async () => {
    try {
      const values = await globalConfigForm.validateFields();
      setGlobalConfig((prev) => ({
        ...prev,
        ...values,
      }));
      setGlobalConfigModalVisible(false);
      antdMessage.success("全局配置已保存");
    } catch {
      // 表单验证失败
    }
  }, [globalConfigForm, antdMessage]);

  // 更新全局授权配置的辅助函数
  const updateGlobalAuth = useCallback((update: Partial<AuthConfig>) => {
    setGlobalConfig((prev) => ({
      ...prev,
      globalAuth: {
        ...prev.globalAuth,
        ...update,
      } as AuthConfig,
    }));
  }, []);

  // ==================== 渲染 ====================

  const currentEnv = getCurrentEnvironment();

  return (
    <div className="flex flex-col h-full min-h-full bg-bg-primary overflow-hidden">
      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧边栏 */}
        <PostmanSidebar
          swaggerUrl={swaggerUrl}
          swaggerLoading={swaggerLoading}
          onSwaggerUrlChange={setSwaggerUrl}
          onParseSwagger={handleParseSwagger}
          onUploadSwagger={handleUploadSwagger}
          folders={folders}
          requests={requests}
          activeRequestId={activeRequestId}
          onRequestSelect={handleRequestSelect}
          syncing={syncing}
          syncStatus={syncStatus}
          onEditFolder={handleEditFolder}
          onDeleteFolder={handleDeleteFolder}
          globalConfig={globalConfig}
          currentEnvironment={globalConfig.currentEnvironment}
          onEnvironmentChange={handleEnvironmentChange}
          onOpenGlobalConfig={handleOpenGlobalConfig}
          activeProjectId={activeProjectId}
          onProjectChange={setActiveProjectId}
          onUpdateProject={handleUpdateProject}
          onReparseProject={handleReparseProject}
        />

        {/* 主工作区 */}
        <PostmanWorkspace
          request={currentRequest}
          onRequestChange={setCurrentRequest}
          response={response}
          responseLoading={responseLoading}
          onSend={handleSendRequest}
          effectiveBaseUrl={getEffectiveBaseUrl(currentRequest.folderId)}
          effectiveAuth={getEffectiveAuth(currentRequest.folderId)}
        />
      </div>

      {/* 状态栏 */}
      <footer className="h-8 border-t border-border bg-bg-tertiary/30 px-4 flex items-center justify-between text-[10px] text-text-tertiary">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">
              cloud_done
            </span>
            已连接云端
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">
              public
            </span>
            代理: 关
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>
            环境:{" "}
            <span className="text-primary">{currentEnv?.name || "未设置"}</span>
          </span>
          {currentEnv?.baseUrl && (
            <span className="text-text-tertiary">
              Base: {currentEnv.baseUrl}
            </span>
          )}
          <span>编码: UTF-8</span>
          <span
            className="material-symbols-outlined text-sm cursor-pointer hover:text-primary"
            onClick={handleOpenGlobalConfig}
          >
            settings
          </span>
        </div>
      </footer>

      {/* 上传文件弹窗 */}
      <Modal
        title="上传 Swagger 文档"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          setFileList([]);
        }}
        footer={null}
      >
        <Upload
          fileList={fileList}
          onChange={handleUploadChange}
          beforeUpload={() => false}
          accept=".json,.yaml,.yml"
          maxCount={1}
        >
          <Button
            icon={
              <span className="material-symbols-outlined text-sm">
                upload_file
              </span>
            }
          >
            选择文件
          </Button>
        </Upload>
        <p className="text-xs text-text-tertiary mt-2">
          支持 JSON 和 YAML 格式的 Swagger/OpenAPI 文档
        </p>
      </Modal>

      {/* 文件夹编辑弹窗 */}
      <Modal
        title="编辑文件夹"
        open={folderEditModalVisible}
        onCancel={() => {
          setFolderEditModalVisible(false);
          setEditingFolder(null);
        }}
        onOk={handleSaveFolder}
        okText="保存"
        cancelText="取消"
      >
        <Form form={folderForm} layout="vertical">
          <Form.Item
            name="name"
            label="文件夹名称"
            rules={[{ required: true, message: "请输入文件夹名称" }]}
          >
            <Input placeholder="请输入文件夹名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入描述" rows={2} />
          </Form.Item>
          <Form.Item name="baseUrl" label="Base URL">
            <Input placeholder="例如: https://api.example.com" />
          </Form.Item>
          <Form.Item name="overrideGlobalBaseUrl" valuePropName="checked">
            <div className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" />
              <span className="text-sm">覆盖全局 Base URL</span>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 全局配置弹窗 */}
      <Modal
        title="全局配置"
        open={globalConfigModalVisible}
        onCancel={() => setGlobalConfigModalVisible(false)}
        onOk={handleSaveGlobalConfig}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={globalConfigForm} layout="vertical">
          <Form.Item label="环境配置">
            <div className="space-y-2">
              {globalConfig.environments.map((env, index) => (
                <div key={env.key} className="flex items-center gap-2">
                  <span className="w-20 text-sm">{env.name}:</span>
                  <Input
                    className="flex-1"
                    placeholder="Base URL"
                    value={env.baseUrl}
                    onChange={(e) => {
                      const newEnvs = [...globalConfig.environments];
                      newEnvs[index] = { ...env, baseUrl: e.target.value };
                      setGlobalConfig((prev) => ({
                        ...prev,
                        environments: newEnvs,
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
          </Form.Item>
          <Form.Item label="全局授权配置">
            <Select
              placeholder="选择授权类型"
              value={globalConfig.globalAuth?.type || "none"}
              onChange={(type) => updateGlobalAuth({ type })}
              options={[
                { value: "none", label: "无认证" },
                { value: "bearer", label: "Bearer Token" },
                { value: "basic", label: "Basic Auth" },
                { value: "api-key", label: "API Key" },
              ]}
            />
            {globalConfig.globalAuth?.type === "bearer" && (
              <Input.Password
                className="mt-2"
                placeholder="Bearer Token"
                value={globalConfig.globalAuth?.bearerToken || ""}
                onChange={(e) =>
                  updateGlobalAuth({ bearerToken: e.target.value })
                }
              />
            )}
            {globalConfig.globalAuth?.type === "basic" && (
              <div className="mt-2 space-y-2">
                <Input
                  placeholder="用户名"
                  value={globalConfig.globalAuth?.basicUsername || ""}
                  onChange={(e) =>
                    updateGlobalAuth({ basicUsername: e.target.value })
                  }
                />
                <Input.Password
                  placeholder="密码"
                  value={globalConfig.globalAuth?.basicPassword || ""}
                  onChange={(e) =>
                    updateGlobalAuth({ basicPassword: e.target.value })
                  }
                />
              </div>
            )}
            {globalConfig.globalAuth?.type === "api-key" && (
              <div className="mt-2 space-y-2">
                <Input
                  placeholder="Key 名称"
                  value={globalConfig.globalAuth?.apiKeyName || ""}
                  onChange={(e) =>
                    updateGlobalAuth({ apiKeyName: e.target.value })
                  }
                />
                <Input.Password
                  placeholder="Key 值"
                  value={globalConfig.globalAuth?.apiKeyValue || ""}
                  onChange={(e) =>
                    updateGlobalAuth({ apiKeyValue: e.target.value })
                  }
                />
                <Select
                  placeholder="添加位置"
                  value={globalConfig.globalAuth?.apiKeyAddTo || "header"}
                  onChange={(value) => updateGlobalAuth({ apiKeyAddTo: value })}
                  options={[
                    { value: "header", label: "请求头" },
                    { value: "query", label: "查询参数" },
                  ]}
                />
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export { SimplePostman };
export default SimplePostman;
