/**
 * PostmanWorkspace 主工作区组件
 */
import React, { useState } from "react";
import { Select, Input, Button, Table, Tooltip, Spin } from "antd";
import {
  HTTP_METHODS,
  REQUEST_TABS,
  BODY_TYPES,
  AUTH_TYPES,
  type HttpMethod,
  type RequestTabKey,
  type BodyType,
  type AuthType,
  type RequestConfig,
  type RequestParam,
  type RequestHeader,
  type ResponseData,
  type AuthConfig,
} from "../../config";

const { TextArea } = Input;

// HTTP 方法颜色映射
const METHOD_COLORS: Record<string, { text: string; bg: string }> = {
  GET: { text: "text-green-500", bg: "bg-green-500/10" },
  POST: { text: "text-yellow-500", bg: "bg-yellow-500/10" },
  PUT: { text: "text-blue-500", bg: "bg-blue-500/10" },
  DELETE: { text: "text-red-500", bg: "bg-red-500/10" },
  PATCH: { text: "text-purple-500", bg: "bg-purple-500/10" },
  HEAD: { text: "text-gray-500", bg: "bg-gray-500/10" },
  OPTIONS: { text: "text-gray-500", bg: "bg-gray-500/10" },
};

interface Props {
  // 请求配置
  request: Partial<RequestConfig>;
  onRequestChange: (request: Partial<RequestConfig>) => void;

  // 响应数据
  response: ResponseData | null;
  responseLoading: boolean;

  // 操作
  onSend: () => void;

  // 继承的配置
  effectiveBaseUrl?: string;
  effectiveAuth?: AuthConfig;
}

const PostmanWorkspace: React.FC<Props> = ({
  request,
  onRequestChange,
  response,
  responseLoading,
  onSend,
  effectiveBaseUrl,
  effectiveAuth,
}) => {
  const [activeTab, setActiveTab] = useState<RequestTabKey>("body");

  // 获取方法颜色
  const getMethodColor = (method: HttpMethod) => {
    return METHOD_COLORS[method] || METHOD_COLORS.GET;
  };

  // 更新请求方法
  const handleMethodChange = (method: HttpMethod) => {
    onRequestChange({ ...request, method });
  };

  // 更新 URL
  const handleUrlChange = (url: string) => {
    onRequestChange({ ...request, url });
  };

  // 更新 Body 类型
  const handleBodyTypeChange = (bodyType: BodyType) => {
    onRequestChange({ ...request, bodyType });
  };

  // 更新 Body 内容
  const handleBodyChange = (body: string) => {
    onRequestChange({ ...request, body });
  };

  // 更新参数
  const handleParamsChange = (params: RequestParam[]) => {
    onRequestChange({ ...request, params });
  };

  // 更新请求头
  const handleHeadersChange = (headers: RequestHeader[]) => {
    onRequestChange({ ...request, headers });
  };

  // 更新 Auth 类型
  const handleAuthTypeChange = (authType: AuthType) => {
    onRequestChange({ ...request, authType, authConfig: {} });
  };

  // 更新 Auth 配置
  const handleAuthConfigChange = (authConfig: Record<string, string>) => {
    onRequestChange({ ...request, authConfig });
  };

  // 渲染 Body 标签页
  const renderBodyTab = () => (
    <div className="flex flex-col h-full">
      {/* Body 类型选择 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-tertiary/30">
        <Select
          value={request.bodyType || "json"}
          onChange={handleBodyTypeChange}
          options={BODY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          className="w-56"
          size="small"
        />
        <Tooltip title="复制内容">
          <Button
            type="text"
            size="small"
            icon={
              <span className="material-symbols-outlined text-sm">
                content_copy
              </span>
            }
          />
        </Tooltip>
      </div>
      {/* Body 编辑器 */}
      <div className="flex-1 p-4">
        {request.bodyType === "none" ? (
          <div className="flex items-center justify-center h-full text-text-tertiary">
            当前请求不需要 Body
          </div>
        ) : (
          <TextArea
            value={request.body || ""}
            onChange={(e) => handleBodyChange(e.target.value)}
            placeholder={
              request.bodyType === "json"
                ? '{\n  "key": "value"\n}'
                : "请求体内容..."
            }
            className="flex-1 font-mono text-sm resize-none"
            style={{ minHeight: 200 }}
          />
        )}
      </div>
    </div>
  );

  // 渲染 Params 标签页
  const renderParamsTab = () => {
    const params = request.params || [];
    const columns = [
      {
        title: "",
        dataIndex: "enabled",
        width: 40,
        render: (_: unknown, record: RequestParam) => (
          <input
            type="checkbox"
            checked={record.enabled}
            onChange={(e) => {
              const newParams = params.map((p) =>
                p.id === record.id ? { ...p, enabled: e.target.checked } : p
              );
              handleParamsChange(newParams);
            }}
          />
        ),
      },
      {
        title: "Key",
        dataIndex: "key",
        width: 150,
        render: (text: string, record: RequestParam) => (
          <Input
            value={text}
            onChange={(e) => {
              const newParams = params.map((p) =>
                p.id === record.id ? { ...p, key: e.target.value } : p
              );
              handleParamsChange(newParams);
            }}
            size="small"
            className="font-mono text-xs"
          />
        ),
      },
      {
        title: "Value",
        dataIndex: "value",
        render: (text: string, record: RequestParam) => (
          <Input
            value={text}
            onChange={(e) => {
              const newParams = params.map((p) =>
                p.id === record.id ? { ...p, value: e.target.value } : p
              );
              handleParamsChange(newParams);
            }}
            size="small"
            className="font-mono text-xs"
          />
        ),
      },
      {
        title: "描述",
        dataIndex: "description",
        width: 150,
        render: (text: string, record: RequestParam) => (
          <Input
            value={text}
            onChange={(e) => {
              const newParams = params.map((p) =>
                p.id === record.id ? { ...p, description: e.target.value } : p
              );
              handleParamsChange(newParams);
            }}
            size="small"
            placeholder="描述..."
          />
        ),
      },
      {
        title: "",
        width: 40,
        render: (_: unknown, record: RequestParam) => (
          <Button
            type="text"
            size="small"
            danger
            icon={
              <span className="material-symbols-outlined text-sm">delete</span>
            }
            onClick={() => {
              handleParamsChange(params.filter((p) => p.id !== record.id));
            }}
          />
        ),
      },
    ];

    return (
      <div className="p-4">
        <Table
          dataSource={params}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: "暂无参数" }}
        />
        <Button
          type="dashed"
          block
          className="mt-2"
          onClick={() => {
            const newParam: RequestParam = {
              id: Date.now().toString(),
              key: "",
              value: "",
              enabled: true,
            };
            handleParamsChange([...params, newParam]);
          }}
        >
          + 添加参数
        </Button>
      </div>
    );
  };

  // 渲染 Headers 标签页
  const renderHeadersTab = () => {
    const headers = request.headers || [];
    const columns = [
      {
        title: "",
        dataIndex: "enabled",
        width: 40,
        render: (_: unknown, record: RequestHeader) => (
          <input
            type="checkbox"
            checked={record.enabled}
            onChange={(e) => {
              const newHeaders = headers.map((h) =>
                h.id === record.id ? { ...h, enabled: e.target.checked } : h
              );
              handleHeadersChange(newHeaders);
            }}
          />
        ),
      },
      {
        title: "Key",
        dataIndex: "key",
        width: 150,
        render: (text: string, record: RequestHeader) => (
          <Input
            value={text}
            onChange={(e) => {
              const newHeaders = headers.map((h) =>
                h.id === record.id ? { ...h, key: e.target.value } : h
              );
              handleHeadersChange(newHeaders);
            }}
            size="small"
            className="font-mono text-xs"
          />
        ),
      },
      {
        title: "Value",
        dataIndex: "value",
        render: (text: string, record: RequestHeader) => (
          <Input
            value={text}
            onChange={(e) => {
              const newHeaders = headers.map((h) =>
                h.id === record.id ? { ...h, value: e.target.value } : h
              );
              handleHeadersChange(newHeaders);
            }}
            size="small"
            className="font-mono text-xs"
          />
        ),
      },
      {
        title: "描述",
        dataIndex: "description",
        width: 150,
        render: (text: string, record: RequestHeader) => (
          <Input
            value={text}
            onChange={(e) => {
              const newHeaders = headers.map((h) =>
                h.id === record.id ? { ...h, description: e.target.value } : h
              );
              handleHeadersChange(newHeaders);
            }}
            size="small"
            placeholder="描述..."
          />
        ),
      },
      {
        title: "",
        width: 40,
        render: (_: unknown, record: RequestHeader) => (
          <Button
            type="text"
            size="small"
            danger
            icon={
              <span className="material-symbols-outlined text-sm">delete</span>
            }
            onClick={() => {
              handleHeadersChange(headers.filter((h) => h.id !== record.id));
            }}
          />
        ),
      },
    ];

    return (
      <div className="p-4">
        <Table
          dataSource={headers}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: "暂无请求头" }}
        />
        <Button
          type="dashed"
          block
          className="mt-2"
          onClick={() => {
            const newHeader: RequestHeader = {
              id: Date.now().toString(),
              key: "",
              value: "",
              enabled: true,
            };
            handleHeadersChange([...headers, newHeader]);
          }}
        >
          + 添加请求头
        </Button>
      </div>
    );
  };

  // 渲染 Auth 标签页
  const renderAuthTab = () => {
    const authType = request.authType || "none";
    const authConfig = request.authConfig || {};

    return (
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            认证类型
          </label>
          <Select
            value={authType}
            onChange={handleAuthTypeChange}
            options={AUTH_TYPES.map((t) => ({
              value: t.value,
              label: t.label,
            }))}
            className="w-full"
          />
        </div>

        {authType === "bearer" && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Token
            </label>
            <TextArea
              value={authConfig.token || ""}
              onChange={(e) =>
                handleAuthConfigChange({ ...authConfig, token: e.target.value })
              }
              placeholder="输入 Bearer Token..."
              rows={3}
              className="font-mono text-sm"
            />
          </div>
        )}

        {authType === "basic" && (
          <>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                用户名
              </label>
              <Input
                value={authConfig.username || ""}
                onChange={(e) =>
                  handleAuthConfigChange({
                    ...authConfig,
                    username: e.target.value,
                  })
                }
                placeholder="用户名..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                密码
              </label>
              <Input.Password
                value={authConfig.password || ""}
                onChange={(e) =>
                  handleAuthConfigChange({
                    ...authConfig,
                    password: e.target.value,
                  })
                }
                placeholder="密码..."
              />
            </div>
          </>
        )}

        {authType === "api-key" && (
          <>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Key
              </label>
              <Input
                value={authConfig.key || ""}
                onChange={(e) =>
                  handleAuthConfigChange({ ...authConfig, key: e.target.value })
                }
                placeholder="API Key 名称..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Value
              </label>
              <Input.Password
                value={authConfig.value || ""}
                onChange={(e) =>
                  handleAuthConfigChange({
                    ...authConfig,
                    value: e.target.value,
                  })
                }
                placeholder="API Key 值..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                添加到
              </label>
              <Select
                value={authConfig.addTo || "header"}
                onChange={(v) =>
                  handleAuthConfigChange({ ...authConfig, addTo: v })
                }
                options={[
                  { value: "header", label: "请求头 (Header)" },
                  { value: "query", label: "查询参数 (Query Params)" },
                ]}
                className="w-full"
              />
            </div>
          </>
        )}
      </div>
    );
  };

  // 渲染设置标签页
  const renderSettingsTab = () => (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          请求名称
        </label>
        <Input
          value={request.name || ""}
          onChange={(e) =>
            onRequestChange({ ...request, name: e.target.value })
          }
          placeholder="请求名称..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          请求超时 (ms)
        </label>
        <Input type="number" value={30000} placeholder="30000" />
      </div>
    </div>
  );

  // 渲染标签页内容
  const renderTabContent = () => {
    switch (activeTab) {
      case "body":
        return renderBodyTab();
      case "params":
        return renderParamsTab();
      case "headers":
        return renderHeadersTab();
      case "auth":
        return renderAuthTab();
      case "settings":
        return renderSettingsTab();
      default:
        return null;
    }
  };

  // 格式化响应大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
      {/* 请求栏 */}
      <div className="p-4 border-b border-border space-y-4">
        {/* 继承配置提示 */}
        {(effectiveBaseUrl || effectiveAuth) && (
          <div className="flex items-center gap-4 text-xs text-text-tertiary">
            {effectiveBaseUrl && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">link</span>
                Base URL: <span className="text-primary">{effectiveBaseUrl}</span>
              </span>
            )}
            {effectiveAuth && effectiveAuth.type !== 'none' && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">lock</span>
                授权: <span className="text-primary">{effectiveAuth.type}</span>
              </span>
            )}
          </div>
        )}
        <div className="flex gap-3">
          <Select
            value={request.method || "GET"}
            onChange={handleMethodChange}
            style={{ width: 120 }}
            className="h-10"
          >
            {HTTP_METHODS.map((m) => (
              <Select.Option key={m.value} value={m.value}>
                <span
                  className={`font-bold ${
                    getMethodColor(m.value as HttpMethod).text
                  }`}
                >
                  {m.label}
                </span>
              </Select.Option>
            ))}
          </Select>
          {effectiveBaseUrl && (
            <div className="flex items-center px-3 h-10 bg-bg-tertiary rounded-lg text-xs text-text-tertiary border border-border">
              <span className="truncate max-w-[150px]">{effectiveBaseUrl}</span>
            </div>
          )}
          <Input
            value={request.url || ""}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={effectiveBaseUrl ? "输入路径..." : "输入请求 URL..."}
            className="flex-1 h-10"
            onPressEnter={onSend}
          />
          <Button
            type="primary"
            onClick={onSend}
            className="h-10 px-6 font-bold"
          >
            发送
            <span className="material-symbols-outlined text-sm ml-1">send</span>
          </Button>
        </div>

        {/* 请求标签页 */}
        <div className="flex items-center gap-6 border-b border-border pb-1">
          {REQUEST_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-sm font-medium pb-2 px-1 transition-colors ${
                activeTab === tab.key
                  ? "text-primary border-b-2 border-primary"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 编辑器内容 */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* 请求编辑区 */}
        <div className="flex-1 min-h-[200px] border-b border-border">
          {renderTabContent()}
        </div>

        {/* 响应区域 */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-4 px-4">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
              响应内容
            </h3>
            {response && (
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="text-text-tertiary">状态码:</span>
                  <span
                    className={`font-bold ${
                      response.status < 400 ? "text-success" : "text-error"
                    }`}
                  >
                    {response.status} {response.statusText}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-text-tertiary">耗时:</span>
                  <span className="text-text-secondary">{response.time}ms</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-text-tertiary">大小:</span>
                  <span className="text-text-secondary">
                    {formatSize(response.size)}
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="px-4 pb-4">
            {responseLoading ? (
              <div className="flex items-center justify-center h-32">
                <Spin tip="请求中..." />
              </div>
            ) : response ? (
              <div className="bg-bg-tertiary rounded-xl p-4 font-mono text-sm overflow-x-auto text-text-primary">
                <pre className="whitespace-pre-wrap">{response.body}</pre>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-text-tertiary">
                <div className="text-center">
                  <span className="material-symbols-outlined text-4xl opacity-50">
                    api
                  </span>
                  <p className="mt-2">响应结果将显示在这里</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export { PostmanWorkspace };
export default PostmanWorkspace;
