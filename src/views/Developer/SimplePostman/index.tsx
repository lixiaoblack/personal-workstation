/**
 * SimplePostman 简易Postman页面
 *
 * 功能：
 * 1. 接口分组、请求记录（数据持久化）
 * 2. 解析 Swagger/OpenAPI 文档
 * 3. AI 助手集成
 */
import React, { useState, useCallback, useMemo } from "react";
import { App, Modal, Upload, Button } from "antd";
import type { UploadFile } from "antd/es/upload/interface";

// 组件导入
import { PostmanSidebar } from "./components/PostmanSidebar";
import { PostmanWorkspace } from "./components/PostmanWorkspace";
import {
  PostmanAIPanel,
  type AIMessage,
  type DebugHistory,
} from "./components/PostmanAIPanel";

// 配置和类型导入
import {
  DEFAULT_REQUEST_CONFIG,
  DEFAULT_HEADERS,
  type RequestConfig,
  type ResponseData,
  type ApiFolder,
  type SidebarMenuKey,
  type HttpMethod,
} from "./config";

const SimplePostman: React.FC = () => {
  const { message: antdMessage } = App.useApp();

  // ==================== 状态管理 ====================

  // Swagger 解析相关
  const [swaggerUrl, setSwaggerUrl] = useState("");
  const [swaggerLoading, setSwaggerLoading] = useState(false);

  // 侧边栏状态
  const [activeMenu, setActiveMenu] = useState<SidebarMenuKey>("history");
  const [activeRequestId, setActiveRequestId] = useState<string | undefined>();

  // 文件夹和请求列表（模拟数据，后续接入数据库）
  const [folders, setFolders] = useState<ApiFolder[]>([
    {
      id: "folder-1",
      name: "用户管理模块",
      description: "用户相关接口",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]);
  const [requests, setRequests] = useState<RequestConfig[]>([
    {
      id: "req-1",
      name: "获取用户列表",
      method: "GET",
      url: "https://api.example.com/v1/users",
      params: [],
      headers: [...DEFAULT_HEADERS],
      bodyType: "json",
      body: "",
      authType: "none",
      authConfig: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      folderId: "folder-1",
    },
    {
      id: "req-2",
      name: "创建新用户",
      method: "POST",
      url: "https://api.example.com/v1/users",
      params: [],
      headers: [...DEFAULT_HEADERS],
      bodyType: "json",
      body: '{\n  "username": "demo",\n  "password": "******"\n}',
      authType: "none",
      authConfig: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      folderId: "folder-1",
    },
  ]);

  // 当前请求配置
  const [currentRequest, setCurrentRequest] = useState<Partial<RequestConfig>>({
    ...DEFAULT_REQUEST_CONFIG,
    headers: [...DEFAULT_HEADERS],
  });

  // 响应数据
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [responseLoading, setResponseLoading] = useState(false);

  // AI 助手状态
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [debugHistory, setDebugHistory] = useState<DebugHistory[]>([
    {
      id: "1",
      time: "10:45 AM",
      content:
        "建议在请求头中添加 'Content-Type: application/json' 以确保服务器正确解析。",
    },
  ]);

  // 同步状态
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");

  // 文件上传相关
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

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
      // 使用 Electron 主进程解析 Swagger
      const parseResult = await window.electronAPI.swaggerParseUrl(swaggerUrl);

      if (parseResult.success && parseResult.endpoints) {
        // 创建新文件夹
        const newFolder: ApiFolder = {
          id: `folder-${Date.now()}`,
          name: parseResult.info?.title || "导入的 API",
          description: parseResult.info?.description,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setFolders((prev) => [...prev, newFolder]);

        // 创建请求
        const newRequests = parseResult.endpoints.map((endpoint, index) => ({
          id: `req-${Date.now()}-${index}`,
          name: endpoint.summary || endpoint.path,
          method: endpoint.method.toUpperCase() as HttpMethod,
          url: endpoint.path,
          params:
            endpoint.parameters?.map((p) => ({
              id: `param-${Date.now()}-${Math.random()}`,
              key: p.name,
              value: "",
              description: p.description,
              enabled: p.required ?? false,
            })) || [],
          headers: [...DEFAULT_HEADERS],
          bodyType: "json" as const,
          body: endpoint.requestBody
            ? JSON.stringify(endpoint.requestBody, null, 2)
            : "",
          authType: "none" as const,
          authConfig: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
          folderId: newFolder.id,
        }));
        setRequests((prev) => [...prev, ...newRequests]);

        antdMessage.success(`成功导入 ${parseResult.endpoints.length} 个接口`);
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
    // 使用 Electron 文件选择对话框
    const result = await window.electronAPI.swaggerSelectFile();
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      setSyncing(true);
      setSyncStatus("正在解析 Swagger 文档...");

      try {
        const parseResult = await window.electronAPI.swaggerParseFile(filePath);

        if (parseResult.success && parseResult.endpoints) {
          const newFolder: ApiFolder = {
            id: `folder-${Date.now()}`,
            name: parseResult.info?.title || "导入的 API",
            description: parseResult.info?.description,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          setFolders((prev) => [...prev, newFolder]);

          const newRequests = parseResult.endpoints.map((endpoint, index) => ({
            id: `req-${Date.now()}-${index}`,
            name: endpoint.summary || endpoint.path,
            method: endpoint.method.toUpperCase() as HttpMethod,
            url: endpoint.path,
            params:
              endpoint.parameters?.map((p) => ({
                id: `param-${Date.now()}-${Math.random()}`,
                key: p.name,
                value: "",
                description: p.description,
                enabled: p.required ?? false,
              })) || [],
            headers: [...DEFAULT_HEADERS],
            bodyType: "json" as const,
            body: "",
            authType: "none" as const,
            authConfig: {},
            createdAt: Date.now(),
            updatedAt: Date.now(),
            folderId: newFolder.id,
          }));
          setRequests((prev) => [...prev, ...newRequests]);

          antdMessage.success(
            `成功导入 ${parseResult.endpoints.length} 个接口`
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

  // 处理文件上传（保留用于 Modal 内上传）
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
            // 判断文件格式
            const format =
              file.name.endsWith(".yaml") || file.name.endsWith(".yml")
                ? "yaml"
                : "json";
            const parseResult = await window.electronAPI.swaggerParseContent(
              content,
              format
            );

            if (parseResult.success && parseResult.endpoints) {
              const newFolder: ApiFolder = {
                id: `folder-${Date.now()}`,
                name: parseResult.info?.title || "导入的 API",
                description: parseResult.info?.description,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              setFolders((prev) => [...prev, newFolder]);

              const newRequests = parseResult.endpoints.map(
                (endpoint, index) => ({
                  id: `req-${Date.now()}-${index}`,
                  name: endpoint.summary || endpoint.path,
                  method: endpoint.method.toUpperCase() as HttpMethod,
                  url: endpoint.path,
                  params:
                    endpoint.parameters?.map((p) => ({
                      id: `param-${Date.now()}-${Math.random()}`,
                      key: p.name,
                      value: "",
                      description: p.description,
                      enabled: p.required ?? false,
                    })) || [],
                  headers: [...DEFAULT_HEADERS],
                  bodyType: "json" as const,
                  body: "",
                  authType: "none" as const,
                  authConfig: {},
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  folderId: newFolder.id,
                })
              );
              setRequests((prev) => [...prev, ...newRequests]);

              antdMessage.success(
                `成功导入 ${parseResult.endpoints.length} 个接口`
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
      // 构建请求头
      const headers: Record<string, string> = {};
      (currentRequest.headers || []).forEach((h) => {
        if (h.enabled && h.key) {
          headers[h.key] = h.value;
        }
      });

      // 添加 Auth
      if (
        currentRequest.authType === "bearer" &&
        currentRequest.authConfig?.token
      ) {
        headers["Authorization"] = `Bearer ${currentRequest.authConfig.token}`;
      } else if (
        currentRequest.authType === "basic" &&
        currentRequest.authConfig?.username
      ) {
        const encoded = btoa(
          `${currentRequest.authConfig.username}:${
            currentRequest.authConfig.password || ""
          }`
        );
        headers["Authorization"] = `Basic ${encoded}`;
      } else if (
        currentRequest.authType === "api-key" &&
        currentRequest.authConfig?.key
      ) {
        if (currentRequest.authConfig.addTo === "header") {
          headers[currentRequest.authConfig.key] =
            currentRequest.authConfig.value || "";
        }
      }

      // 构建 URL（添加查询参数）
      let url = currentRequest.url;
      const params = new URLSearchParams();
      (currentRequest.params || []).forEach((p) => {
        if (p.enabled && p.key) {
          if (
            currentRequest.authType === "api-key" &&
            currentRequest.authConfig?.addTo === "query" &&
            p.key === currentRequest.authConfig.key
          ) {
            params.append(p.key, currentRequest.authConfig.value || "");
          } else {
            params.append(p.key, p.value);
          }
        }
      });
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      // 构建请求选项
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

      // 解析响应
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

      // 添加到调试历史
      setDebugHistory((prev) => [
        {
          id: `debug-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          content: `${currentRequest.method} ${currentRequest.url} - ${res.status}`,
        },
        ...prev.slice(0, 9),
      ]);

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
  }, [currentRequest, antdMessage]);

  // AI 发送消息
  const handleAISendMessage = useCallback(
    async (msg: string) => {
      const userMessage: AIMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: msg,
        timestamp: Date.now(),
      };
      setAiMessages((prev) => [...prev, userMessage]);
      setAiLoading(true);

      // 模拟 AI 响应（后续接入真实的 AI 服务）
      setTimeout(() => {
        const aiResponse: AIMessage = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: generateAIResponse(msg, currentRequest, response),
          timestamp: Date.now(),
        };
        setAiMessages((prev) => [...prev, aiResponse]);
        setAiLoading(false);
      }, 1000);
    },
    [currentRequest, response]
  );

  // 生成 AI 响应（模拟）
  const generateAIResponse = (
    query: string,
    request?: Partial<RequestConfig>,
    response?: ResponseData | null
  ): string => {
    if (query.includes("Python SDK")) {
      return `# Python SDK 代码示例

import requests

url = "${request?.url || "https://api.example.com"}"
headers = {
    "Content-Type": "application/json"
}

response = requests.${(
        request?.method || "get"
      ).toLowerCase()}(url, headers=headers)
print(response.json())`;
    }

    if (query.includes("JMeter")) {
      return `# JMeter 测试脚本

建议使用 JMeter GUI 创建测试计划：
1. 添加线程组
2. 添加 HTTP 请求
   - 方法: ${request?.method || "GET"}
   - URL: ${request?.url || ""}
3. 添加监听器查看结果`;
    }

    if (query.includes("分析响应")) {
      if (!response) {
        return "当前没有响应数据，请先发送请求。";
      }
      return `响应分析：
- 状态码: ${response.status} ${response.statusText}
- 响应时间: ${response.time}ms
- 响应大小: ${response.size} bytes
- 内容类型: ${response.headers["content-type"] || "未知"}`;
    }

    if (query.includes("调试建议")) {
      if (response?.status === 0) {
        return "请求失败，请检查：\n1. URL 是否正确\n2. 网络是否连接\n3. 是否存在跨域问题";
      }
      if (response?.status && response.status >= 400) {
        return `请求返回错误状态码 ${response.status}，建议：\n1. 检查请求参数是否正确\n2. 检查认证信息是否有效\n3. 查看响应体中的错误信息`;
      }
      return "请求看起来正常，如果需要更多帮助，请描述具体问题。";
    }

    return `收到您的问题：${query}\n\n我是 AI 助手，可以帮助您：\n- 生成代码示例\n- 分析响应数据\n- 提供调试建议\n- 解答 API 相关问题`;
  };

  // 当前请求信息（用于 AI 面板）
  const requestInfo = useMemo(
    () => ({
      method: currentRequest.method || "GET",
      url: currentRequest.url || "",
      status: response?.status,
      error: response?.status === 0 ? response.body : undefined,
    }),
    [currentRequest, response]
  );

  // ==================== 渲染 ====================

  return (
    <div className="flex flex-col h-full min-h-full bg-bg-primary overflow-hidden">
      {/* 顶部导航栏 */}
      {/* <header className="h-14 flex-shrink-0 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button type="default" size="small">
            导入文档
          </Button>
          <Button type="primary" size="small">
            导出
          </Button>
        </div>
      </header> */}

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧边栏 */}
        <PostmanSidebar
          swaggerUrl={swaggerUrl}
          swaggerLoading={swaggerLoading}
          onSwaggerUrlChange={setSwaggerUrl}
          onParseSwagger={handleParseSwagger}
          onUploadSwagger={handleUploadSwagger}
          activeMenu={activeMenu}
          onMenuChange={setActiveMenu}
          folders={folders}
          requests={requests}
          activeRequestId={activeRequestId}
          onRequestSelect={handleRequestSelect}
          syncing={syncing}
          syncStatus={syncStatus}
        />

        {/* 主工作区 */}
        <PostmanWorkspace
          request={currentRequest}
          onRequestChange={setCurrentRequest}
          response={response}
          responseLoading={responseLoading}
          onSend={handleSendRequest}
        />

        {/* AI 助手面板 */}
        <PostmanAIPanel
          requestInfo={requestInfo}
          messages={aiMessages}
          onSendMessage={handleAISendMessage}
          loading={aiLoading}
          debugHistory={debugHistory}
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
            环境: <span className="text-primary">Production</span>
          </span>
          <span>编码: UTF-8</span>
          <span className="material-symbols-outlined text-sm cursor-pointer hover:text-primary">
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
    </div>
  );
};

export { SimplePostman };
export default SimplePostman;
