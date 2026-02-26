/**
 * SimplePostman 简易Postman页面
 *
 * 功能：
 * 1. 接口分组、请求记录（数据持久化）
 * 2. 解析 Swagger/OpenAPI 文档
 * 3. 多环境配置支持
 * 4. 全局配置和文件夹级别配置
 */
import React, { useState, useCallback, useEffect, useMemo } from "react";
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

// Postman 持久化类型
import type {
  PostmanProject,
  PostmanGroup,
  PostmanRequest,
  PostmanRequestInput,
} from "@/types/electron";

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
  const [activeRequestId, setActiveRequestId] = useState<number | undefined>();
  const [activeProjectId, setActiveProjectId] = useState<number | undefined>();

  // 数据加载状态
  const [, setDataLoading] = useState(true);

  // 兼容旧代码的 folders（由 projects 和 groups 转换）
  const [folders, setFolders] = useState<ApiFolder[]>([]);

  // 请求列表（从数据库加载）
  const [requests, setRequests] = useState<PostmanRequest[]>([]);

  // 转换后的请求列表（用于 PostmanSidebar）
  const requestsForSidebar: RequestConfig[] = requests.map((r) => ({
    id: String(r.id),
    name: r.name || "",
    method: r.method as HttpMethod,
    url: r.url,
    params: r.params || [],
    headers: r.headers || [],
    bodyType: r.bodyType as RequestConfig["bodyType"],
    body: r.body || "",
    authType: r.authType as RequestConfig["authType"],
    authConfig: (r.authConfig as Record<string, string>) || {},
    folderId: r.groupId ? String(r.groupId) : undefined,
    swaggerInfo: r.swaggerInfo as SwaggerRequestInfo,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

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

  // ==================== 数据加载 ====================

  // 加载所有数据
  const loadAllData = useCallback(async () => {
    setDataLoading(true);
    try {
      // 加载项目列表
      const projectList = await window.electronAPI.postmanGetProjects();

      // 加载所有项目的分组和请求
      const allGroups: PostmanGroup[] = [];
      const allRequests: PostmanRequest[] = [];

      for (const project of projectList) {
        const projectGroups =
          await window.electronAPI.postmanGetGroupsByProjectId(project.id);
        allGroups.push(...projectGroups);

        const projectRequests =
          await window.electronAPI.postmanGetRequestsByProjectId(project.id);
        allRequests.push(...projectRequests);
      }

      setRequests(allRequests);

      // 转换为 folders 格式（兼容旧代码）
      const convertedFolders: ApiFolder[] = [];

      // 添加项目作为顶层文件夹
      for (const project of projectList) {
        convertedFolders.push({
          id: String(project.id),
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          baseUrl: project.baseUrl,
          swaggerUrl: project.swaggerUrl,
          auth: project.authConfig as AuthConfig | undefined,
        });
      }

      // 添加分组作为子文件夹
      for (const group of allGroups) {
        convertedFolders.push({
          id: String(group.id),
          name: group.name,
          description: group.description,
          parentId: String(group.projectId),
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          baseUrl: group.baseUrl,
          auth: group.authConfig as AuthConfig | undefined,
          overrideGlobalBaseUrl: group.overrideGlobal,
          overrideGlobalAuth: group.overrideGlobal,
        });
      }

      setFolders(convertedFolders);

      // 加载全局设置
      const settings = await window.electronAPI.postmanGetSetting("global");
      if (settings?.value) {
        setGlobalConfig((prev) => ({
          ...prev,
          ...(settings.value as Partial<GlobalConfig>),
        }));
      }
    } catch (error) {
      console.error("加载数据失败:", error);
      antdMessage.error("加载数据失败");
    } finally {
      setDataLoading(false);
    }
  }, [antdMessage]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // 保存全局设置
  const saveGlobalConfig = useCallback(async (config: GlobalConfig) => {
    try {
      await window.electronAPI.postmanSaveSetting("global", {
        currentEnvironment: config.currentEnvironment,
        environments: config.environments,
        globalAuth: config.globalAuth,
        timeout: config.timeout,
      });
    } catch (error) {
      console.error("保存全局设置失败:", error);
    }
  }, []);

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

  // 处理 Swagger 解析结果并持久化到数据库
  const processAndPersistSwagger = useCallback(
    async (
      parseResult: SwaggerParseResultFromBackend,
      swaggerSourceUrl?: string
    ): Promise<{ success: boolean; project?: PostmanProject }> => {
      if (!parseResult.success || !parseResult.endpoints) {
        return { success: false };
      }

      const apiTitle = parseResult.info?.title || "导入的 API";
      const apiDescription = parseResult.info?.description;

      // 创建 tag 信息映射
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

      // 创建项目
      const project = await window.electronAPI.postmanCreateProject({
        name: apiTitle,
        description: apiDescription,
        swaggerUrl: swaggerSourceUrl,
      });

      // 创建分组
      const tagNameToGroupId = new Map<string, number>();
      let sortOrder = 0;
      for (const tag of Array.from(tagSet)) {
        const tagInfo = tagInfoMap.get(tag);
        const group = await window.electronAPI.postmanCreateGroup({
          projectId: project.id,
          name: tagInfo?.displayName || tag,
          description: tagInfo?.description || "",
          sortOrder: sortOrder++,
        });
        tagNameToGroupId.set(tag, group.id);
      }

      // 创建请求
      const requestInputs: PostmanRequestInput[] = parseResult.endpoints.map(
        (endpoint, index) => {
          let bodyContent = "";
          if (endpoint.requestBody?.content?.length) {
            const firstContent = endpoint.requestBody.content[0];
            if (firstContent.generatedExample) {
              bodyContent = JSON.stringify(
                firstContent.generatedExample,
                null,
                2
              );
            } else if (firstContent.example) {
              bodyContent = JSON.stringify(firstContent.example, null, 2);
            }
          }

          const tagName =
            endpoint.tags && endpoint.tags.length > 0
              ? endpoint.tags[0]
              : "默认分组";
          const groupId = tagNameToGroupId.get(tagName);

          // 构建 swaggerInfo
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
            projectId: project.id,
            groupId: groupId,
            name: endpoint.summary || endpoint.path,
            method: endpoint.method.toUpperCase(),
            url: endpoint.path,
            params:
              endpoint.parameters?.map((p) => ({
                id: `param-${Date.now()}-${Math.random()}`,
                key: p.name,
                value: "",
                description: p.description,
                enabled: p.required ?? false,
              })) || [],
            headers: DEFAULT_HEADERS.map((h) => ({ ...h })),
            bodyType: "json",
            body: bodyContent,
            authType: "none",
            swaggerInfo: swaggerInfo as unknown as Record<string, unknown>,
            sortOrder: index,
          };
        }
      );

      // 批量创建请求
      await window.electronAPI.postmanBatchCreateRequests(requestInputs);

      return { success: true, project };
    },
    []
  );

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
        setSyncStatus("正在保存到数据库...");
        const result = await processAndPersistSwagger(
          parseResult as SwaggerParseResultFromBackend,
          swaggerUrl
        );

        if (result.success && result.project) {
          // 重新加载数据
          await loadAllData();
          setActiveProjectId(result.project.id);
          antdMessage.success(
            `成功导入 ${parseResult.endpoints.length} 个接口`
          );
        } else {
          antdMessage.error("保存失败");
        }
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
  }, [swaggerUrl, antdMessage, processAndPersistSwagger, loadAllData]);

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
          setSyncStatus("正在保存到数据库...");
          const persistResult = await processAndPersistSwagger(
            parseResult as SwaggerParseResultFromBackend,
            undefined
          );

          if (persistResult.success && persistResult.project) {
            await loadAllData();
            setActiveProjectId(persistResult.project.id);
            antdMessage.success(
              `成功导入 ${parseResult.endpoints.length} 个接口`
            );
          } else {
            antdMessage.error("保存失败");
          }
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
  }, [antdMessage, processAndPersistSwagger, loadAllData]);

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
              setSyncStatus("正在保存到数据库...");
              const persistResult = await processAndPersistSwagger(
                parseResult as SwaggerParseResultFromBackend,
                undefined
              );

              if (persistResult.success && persistResult.project) {
                await loadAllData();
                setActiveProjectId(persistResult.project.id);
                antdMessage.success(
                  `成功导入 ${parseResult.endpoints.length} 个接口`
                );
                setUploadModalVisible(false);
                setFileList([]);
              } else {
                antdMessage.error("保存失败");
              }
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
    [antdMessage, processAndPersistSwagger, loadAllData]
  );

  // 选择请求
  const handleRequestSelect = useCallback(
    (id: number) => {
      const request = requests.find((r) => r.id === id);
      if (request) {
        // 转换为 RequestConfig 格式
        setCurrentRequest({
          id: String(request.id),
          name: request.name || "",
          method: request.method as HttpMethod,
          url: request.url,
          params: request.params || [],
          headers: request.headers || [],
          bodyType: request.bodyType as RequestConfig["bodyType"],
          body: request.body || "",
          authType: request.authType as RequestConfig["authType"],
          authConfig: (request.authConfig as Record<string, string>) || {},
          folderId: request.groupId ? String(request.groupId) : undefined,
          swaggerInfo: request.swaggerInfo as SwaggerRequestInfo,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
        });
        setActiveRequestId(id);
        setResponse(null);
      }
    },
    [requests]
  );

  // 获取当前请求的 LLM 类型定义
  const currentRequestLlmTypes = useMemo(() => {
    if (!activeRequestId) return undefined;
    const request = requests.find((r) => r.id === activeRequestId);
    return request?.llmTypes;
  }, [activeRequestId, requests]);

  // 保存 LLM 类型定义到数据库
  const handleSaveLlmTypes = useCallback(
    async (types: string) => {
      if (!activeRequestId) {
        antdMessage.warning("请先选择一个请求");
        return;
      }

      try {
        await window.electronAPI.postmanUpdateRequestLlmTypes(
          activeRequestId,
          types
        );
        // 重新加载数据以更新本地状态
        await loadAllData();
      } catch (error) {
        throw new Error(
          `保存失败: ${error instanceof Error ? error.message : "未知错误"}`
        );
      }
    },
    [activeRequestId, antdMessage, loadAllData]
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
    async (folderId: string) => {
      try {
        const numericId = Number(folderId);
        const folder = folders.find((f) => f.id === folderId);

        if (folder) {
          if (!folder.parentId) {
            // 顶层文件夹 = 项目
            await window.electronAPI.postmanDeleteProject(numericId);
          } else {
            // 子文件夹 = 分组
            await window.electronAPI.postmanDeleteGroup(numericId);
          }
          // 重新加载数据
          await loadAllData();
          antdMessage.success("已删除");
        }
      } catch (error) {
        antdMessage.error(
          `删除失败: ${error instanceof Error ? error.message : "未知错误"}`
        );
      }
    },
    [folders, antdMessage, loadAllData]
  );

  const handleSaveFolder = useCallback(async () => {
    try {
      const values = await folderForm.validateFields();
      if (editingFolder) {
        const numericId = Number(editingFolder.id);

        if (!editingFolder.parentId) {
          // 顶层文件夹 = 项目
          await window.electronAPI.postmanUpdateProject(numericId, {
            name: values.name,
            description: values.description,
            baseUrl: values.baseUrl,
          });
        } else {
          // 子文件夹 = 分组
          await window.electronAPI.postmanUpdateGroup(numericId, {
            name: values.name,
            description: values.description,
            baseUrl: values.baseUrl,
            overrideGlobal: values.overrideGlobalBaseUrl,
          });
        }

        await loadAllData();
        antdMessage.success("已更新");
      }
      setFolderEditModalVisible(false);
      setEditingFolder(null);
    } catch {
      // 表单验证失败
    }
  }, [editingFolder, folderForm, antdMessage, loadAllData]);

  // 更新项目信息
  const handleUpdateProject = useCallback(
    async (project: ApiFolder) => {
      try {
        const projectId = Number(project.id);
        await window.electronAPI.postmanUpdateProject(projectId, {
          name: project.name,
          description: project.description,
          baseUrl: project.baseUrl,
          swaggerUrl: project.swaggerUrl,
        });
        // 重新加载数据
        await loadAllData();
        antdMessage.success("项目已更新");
      } catch (error) {
        antdMessage.error(
          `更新失败: ${error instanceof Error ? error.message : "未知错误"}`
        );
      }
    },
    [antdMessage, loadAllData]
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
        const projectId = Number(project.id);

        // 先删除旧项目（会级联删除分组和请求）
        await window.electronAPI.postmanDeleteProject(projectId);

        // 解析并创建新项目
        const parseResult = await window.electronAPI.swaggerParseUrl(
          project.swaggerUrl
        );

        if (parseResult.success && parseResult.endpoints) {
          setSyncStatus("正在保存到数据库...");
          const result = await processAndPersistSwagger(
            parseResult as SwaggerParseResultFromBackend,
            project.swaggerUrl
          );

          if (result.success && result.project) {
            await loadAllData();
            setActiveProjectId(result.project.id);
            antdMessage.success(
              `重新解析成功，导入 ${parseResult.endpoints.length} 个接口`
            );
          } else {
            antdMessage.error("保存失败");
          }
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
    [antdMessage, processAndPersistSwagger, loadAllData]
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
      const newConfig: GlobalConfig = {
        ...globalConfig,
        ...values,
      };
      setGlobalConfig(newConfig);
      await saveGlobalConfig(newConfig);
      setGlobalConfigModalVisible(false);
      antdMessage.success("全局配置已保存");
    } catch {
      // 表单验证失败
    }
  }, [globalConfig, globalConfigForm, antdMessage, saveGlobalConfig]);

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
          requests={requestsForSidebar}
          activeRequestId={
            activeRequestId !== undefined ? String(activeRequestId) : undefined
          }
          onRequestSelect={(id) => handleRequestSelect(Number(id))}
          syncing={syncing}
          syncStatus={syncStatus}
          onEditFolder={handleEditFolder}
          onDeleteFolder={handleDeleteFolder}
          globalConfig={globalConfig}
          currentEnvironment={globalConfig.currentEnvironment}
          onEnvironmentChange={handleEnvironmentChange}
          onOpenGlobalConfig={handleOpenGlobalConfig}
          activeProjectId={
            activeProjectId !== undefined ? String(activeProjectId) : undefined
          }
          onProjectChange={(id) => setActiveProjectId(Number(id))}
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
          llmTypes={currentRequestLlmTypes}
          onSaveLlmTypes={handleSaveLlmTypes}
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
            className="material-symbols-outlined !text-sm cursor-pointer hover:text-primary"
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
              <span className="material-symbols-outlined !text-sm">
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
