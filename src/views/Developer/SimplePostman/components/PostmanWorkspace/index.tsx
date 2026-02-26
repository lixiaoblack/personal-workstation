/**
 * PostmanWorkspace 主工作区组件
 */
import React, { useState, useRef, useCallback, useMemo } from "react";
import { Select, Input, Button, Table, Tooltip, Spin, App } from "antd";
import Editor, { OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
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
  type SwaggerRequestInfo,
} from "../../config";
import { useTheme } from "@/contexts";
import {
  initMonacoThemes,
  getMonacoThemeName,
} from "@/styles/themes/monaco-theme";

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
  const { message } = App.useApp();
  const { resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<RequestTabKey>("body");
  const responseEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(
    null
  );
  const bodyEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(
    null
  );
  const monacoRef = useRef<typeof Monaco | null>(null);
  const themesInitializedRef = useRef(false);

  // Monaco 主题名称
  const monacoTheme = getMonacoThemeName(resolvedTheme);

  // 响应编辑器挂载处理
  const handleResponseEditorMount: OnMount = (editor, monaco) => {
    responseEditorRef.current = editor;
    if (!monacoRef.current) {
      monacoRef.current = monaco;
    }

    // 初始化主题（只执行一次）
    if (!themesInitializedRef.current) {
      initMonacoThemes(monaco);
      themesInitializedRef.current = true;
    }

    // 配置 JSON 语言特性
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [],
      enableSchemaRequest: false,
      allowComments: false,
      trailingCommas: "error",
    });
  };

  // Body 编辑器挂载处理
  const handleBodyEditorMount: OnMount = (editor, monaco) => {
    bodyEditorRef.current = editor;
    if (!monacoRef.current) {
      monacoRef.current = monaco;
    }

    // 初始化主题（只执行一次）
    if (!themesInitializedRef.current) {
      initMonacoThemes(monaco);
      themesInitializedRef.current = true;
    }

    // 配置 JSON 语言特性
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [],
      enableSchemaRequest: false,
      allowComments: false,
      trailingCommas: "error",
    });
  };

  // 尝试解析并美化 JSON
  const parseAndBeautify = useCallback((input: string): string => {
    if (!input.trim()) return "";

    try {
      const parsed = JSON.parse(input);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // 不是有效的 JSON，返回原始内容
      return input;
    }
  }, []);

  // 美化后的响应内容
  const beautifiedResponseBody = useMemo(() => {
    if (!response?.body) return "";
    return parseAndBeautify(response.body);
  }, [response?.body, parseAndBeautify]);

  // 判断响应是否为 JSON
  const isJsonResponse = useMemo(() => {
    if (!response?.body) return false;
    try {
      JSON.parse(response.body);
      return true;
    } catch {
      return false;
    }
  }, [response?.body]);

  // 复制响应内容
  const handleCopyResponse = useCallback(() => {
    if (response?.body) {
      navigator.clipboard.writeText(response.body);
      message.success("已复制到剪贴板");
    }
  }, [response?.body, message]);

  // 格式化响应
  const handleFormatResponse = useCallback(() => {
    if (responseEditorRef.current) {
      responseEditorRef.current
        .getAction("editor.action.formatDocument")
        ?.run();
    }
  }, []);

  // 复制 Body 内容
  const handleCopyBody = useCallback(() => {
    if (request.body) {
      navigator.clipboard.writeText(request.body);
      message.success("已复制到剪贴板");
    }
  }, [request.body, message]);

  // 格式化 Body
  const handleFormatBody = useCallback(() => {
    if (bodyEditorRef.current) {
      bodyEditorRef.current.getAction("editor.action.formatDocument")?.run();
    }
  }, []);

  // Body 编辑器内容变化
  const handleBodyEditorChange = useCallback(
    (value: string | undefined) => {
      onRequestChange({ ...request, body: value || "" });
    },
    [request, onRequestChange]
  );

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
  const renderBodyTab = () => {
    // 根据Body类型确定语言
    const getBodyLanguage = (): string => {
      switch (request.bodyType) {
        case "json":
          return "json";
        case "raw":
          return "plaintext";
        default:
          return "plaintext";
      }
    };

    return (
      <div className="flex flex-col h-full">
        {/* Body 类型选择 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-tertiary/30">
          <Select
            value={request.bodyType || "json"}
            onChange={handleBodyTypeChange}
            options={BODY_TYPES.map((t) => ({
              value: t.value,
              label: t.label,
            }))}
            className="w-56"
            size="small"
          />
          <div className="flex items-center gap-1">
            {request.bodyType === "json" && (
              <Tooltip title="格式化">
                <Button
                  type="text"
                  size="small"
                  icon={
                    <span className="material-symbols-outlined text-sm">
                      format_align_left
                    </span>
                  }
                  onClick={handleFormatBody}
                />
              </Tooltip>
            )}
            <Tooltip title="复制内容">
              <Button
                type="text"
                size="small"
                icon={
                  <span className="material-symbols-outlined text-sm">
                    content_copy
                  </span>
                }
                onClick={handleCopyBody}
              />
            </Tooltip>
          </div>
        </div>
        {/* Body 编辑器 */}
        <div className="flex-1">
          {request.bodyType === "none" ? (
            <div className="flex items-center justify-center h-full text-text-tertiary">
              当前请求不需要 Body
            </div>
          ) : (
            <Editor
              height="100%"
              language={getBodyLanguage()}
              value={request.body || ""}
              onChange={handleBodyEditorChange}
              onMount={handleBodyEditorMount}
              theme={monacoTheme}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineNumbers: "on",
                wordWrap: "on",
                automaticLayout: true,
                formatOnPaste: true,
                formatOnType: true,
                quickSuggestions: true,
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: "on",
                tabSize: 2,
                insertSpaces: true,
                renderWhitespace: "selection",
                scrollBeyondLastLine: false,
                folding: true,
                foldingStrategy: "indentation",
                bracketPairColorization: { enabled: true },
                autoClosingBrackets: "always",
                autoClosingQuotes: "always",
                autoSurround: "brackets",
                renderValidationDecorations: "on",
                scrollbar: {
                  vertical: "auto",
                  horizontal: "auto",
                },
              }}
            />
          )}
        </div>
      </div>
    );
  };

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

  // 将 Swagger 类型转换为 TypeScript 类型
  const swaggerTypeToTypeScript = useCallback(
    (
      schema: Record<string, unknown>,
      components?: Record<string, unknown>,
      definitions?: Record<string, unknown>,
      indent = 1
    ): string => {
      const indentStr = "  ".repeat(indent);

      // 处理 $ref 引用
      if (schema.$ref) {
        const ref = schema.$ref as string;
        const refName = ref.split("/").pop();
        return refName || "unknown";
      }

      const type = schema.type as string;

      switch (type) {
        case "string":
          if (schema.enum && Array.isArray(schema.enum)) {
            return schema.enum.map((v) => `"${v}"`).join(" | ");
          }
          if (schema.format === "date" || schema.format === "date-time") {
            return "string /* Date */";
          }
          return "string";

        case "number":
        case "integer":
          return "number";

        case "boolean":
          return "boolean";

        case "array": {
          const items = schema.items as Record<string, unknown> | undefined;
          if (items) {
            const itemType = swaggerTypeToTypeScript(
              items,
              components,
              definitions,
              indent
            );
            return `${itemType}[]`;
          }
          return "unknown[]";
        }

        case "object": {
          const properties = schema.properties as
            | Record<string, Record<string, unknown>>
            | undefined;
          const required = (schema.required as string[]) || [];

          if (!properties) {
            if (schema.additionalProperties) {
              const additionalProps = schema.additionalProperties as Record<
                string,
                unknown
              >;
              const valueType = swaggerTypeToTypeScript(
                additionalProps,
                components,
                definitions,
                indent
              );
              return `Record<string, ${valueType}>`;
            }
            return "Record<string, unknown>";
          }

          const lines: string[] = ["{"];
          for (const [propName, propSchema] of Object.entries(properties)) {
            const isRequired = required.includes(propName);
            const propType = swaggerTypeToTypeScript(
              propSchema,
              components,
              definitions,
              indent + 1
            );
            const optional = isRequired ? "" : "?";
            const description =
              propSchema.description && typeof propSchema.description === "string"
                ? ` /** ${propSchema.description} */\n${indentStr}  `
                : "";
            lines.push(
              `${description}${propName}${optional}: ${propType};`
            );
          }
          lines.push(`${indentStr}}`);
          return lines.join(`\n${indentStr}`);
        }

        default:
          if (schema.properties) {
            return swaggerTypeToTypeScript(
              { ...schema, type: "object" },
              components,
              definitions,
              indent
            );
          }
          return "unknown";
      }
    },
    []
  );

  // 从 $ref 获取类型名称
  const getRefTypeName = (ref: string): string => {
    return ref.split("/").pop() || "unknown";
  };

  // 生成类型定义
  const generateTypeDefinitions = useCallback((): string => {
    const swaggerInfo = request.swaggerInfo as SwaggerRequestInfo | undefined;
    if (!swaggerInfo) {
      return "// 此接口没有 Swagger 类型信息\n// 请从 Swagger 文档导入接口以获取类型定义";
    }

    const lines: string[] = [];
    const components = swaggerInfo.components?.schemas as
      | Record<string, Record<string, unknown>>
      | undefined;
    const definitions = swaggerInfo.definitions as
      | Record<string, Record<string, unknown>>
      | undefined;

    // 生成请求参数类型
    if (swaggerInfo.parameters && swaggerInfo.parameters.length > 0) {
      lines.push("/** 请求参数 */");
      lines.push("interface RequestParams {");

      // 按 in 分组
      const queryParams = swaggerInfo.parameters.filter((p) => p.in === "query");
      const pathParams = swaggerInfo.parameters.filter((p) => p.in === "path");
      const headerParams = swaggerInfo.parameters.filter(
        (p) => p.in === "header"
      );

      if (queryParams.length > 0) {
        lines.push("  /** Query 参数 */");
        queryParams.forEach((p) => {
          const optional = p.required ? "" : "?";
          const type = p.type || "unknown";
          const desc = p.description ? ` /** ${p.description} */\n  ` : "";
          lines.push(`${desc}${p.name}${optional}: ${type};`);
        });
      }

      if (pathParams.length > 0) {
        lines.push("  /** Path 参数 */");
        pathParams.forEach((p) => {
          const optional = p.required ? "" : "?";
          const type = p.type || "unknown";
          const desc = p.description ? ` /** ${p.description} */\n  ` : "";
          lines.push(`${desc}${p.name}${optional}: ${type};`);
        });
      }

      if (headerParams.length > 0) {
        lines.push("  /** Header 参数 */");
        headerParams.forEach((p) => {
          const optional = p.required ? "" : "?";
          const type = p.type || "unknown";
          const desc = p.description ? ` /** ${p.description} */\n  ` : "";
          lines.push(`${desc}${p.name}${optional}: ${type};`);
        });
      }

      lines.push("}");
      lines.push("");
    }

    // 生成请求体类型
    if (swaggerInfo.requestBody?.content?.length) {
      const firstContent = swaggerInfo.requestBody.content[0];
      if (firstContent?.schema) {
        const schema = firstContent.schema as Record<string, unknown>;
        lines.push("/** 请求体 */");

        if (schema.$ref) {
          const typeName = getRefTypeName(schema.$ref as string);
          lines.push(`type RequestBody = ${typeName};`);
        } else {
          const typeStr = swaggerTypeToTypeScript(
            schema,
            components,
            definitions
          );
          lines.push(`type RequestBody = ${typeStr};`);
        }
        lines.push("");
      }
    }

    // 生成响应体类型
    if (swaggerInfo.responses?.length) {
      const successResponse = swaggerInfo.responses.find(
        (r) => r.statusCode === "200" || r.statusCode === "201"
      );

      if (successResponse?.content?.length) {
        const firstContent = successResponse.content[0];
        if (firstContent?.schema) {
          const schema = firstContent.schema as Record<string, unknown>;
          lines.push("/** 响应体 */");

          if (schema.$ref) {
            const typeName = getRefTypeName(schema.$ref as string);
            lines.push(`type ResponseBody = ${typeName};`);
          } else {
            const typeStr = swaggerTypeToTypeScript(
              schema,
              components,
              definitions
            );
            lines.push(`type ResponseBody = ${typeStr};`);
          }
          lines.push("");
        }
      }
    }

    // 生成引用的类型定义
    const usedRefs = new Set<string>();
    const collectRefs = (schema: Record<string, unknown>) => {
      if (schema.$ref) {
        usedRefs.add(schema.$ref as string);
      }
      if (schema.properties) {
        Object.values(schema.properties as Record<string, Record<string, unknown>>).forEach(
          collectRefs
        );
      }
      if (schema.items) {
        collectRefs(schema.items as Record<string, unknown>);
      }
    };

    // 收集所有使用的 ref
    swaggerInfo.parameters?.forEach((p) => {
      if (p.schema) collectRefs(p.schema as Record<string, unknown>);
    });
    swaggerInfo.requestBody?.content?.forEach((c) => {
      if (c.schema) collectRefs(c.schema as Record<string, unknown>);
    });
    swaggerInfo.responses?.forEach((r) => {
      r.content?.forEach((c) => {
        if (c.schema) collectRefs(c.schema as Record<string, unknown>);
      });
    });

    // 生成引用的类型定义
    if (usedRefs.size > 0) {
      lines.push("/** 相关类型定义 */");

      usedRefs.forEach((ref) => {
        const typeName = getRefTypeName(ref);
        let schemaDef: Record<string, unknown> | undefined;

        // 从 components 或 definitions 中查找
        if (components && components[typeName]) {
          schemaDef = components[typeName];
        } else if (definitions && definitions[typeName]) {
          schemaDef = definitions[typeName];
        }

        if (schemaDef) {
          const typeStr = swaggerTypeToTypeScript(
            schemaDef,
            components,
            definitions
          );
          lines.push(`interface ${typeName} ${typeStr}`);
          lines.push("");
        }
      });
    }

    return lines.length > 0
      ? lines.join("\n")
      : "// 没有可用的类型定义";
  }, [request.swaggerInfo, swaggerTypeToTypeScript]);

  // 类型定义编辑器挂载处理
  const typesEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(
    null
  );

  const handleTypesEditorMount: OnMount = (editor, monaco) => {
    typesEditorRef.current = editor;
    if (!monacoRef.current) {
      monacoRef.current = monaco;
    }

    if (!themesInitializedRef.current) {
      initMonacoThemes(monaco);
      themesInitializedRef.current = true;
    }
  };

  // 复制类型定义
  const handleCopyTypes = useCallback(() => {
    const types = generateTypeDefinitions();
    navigator.clipboard.writeText(types);
    message.success("已复制类型定义到剪贴板");
  }, [generateTypeDefinitions, message]);

  // 渲染类型定义标签页
  const renderTypesTab = () => {
    const typeDefinitions = generateTypeDefinitions();

    return (
      <div className="flex flex-col h-full">
        {/* 头部操作栏 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-tertiary/30">
          <span className="text-sm text-text-secondary">
            TypeScript 类型定义
          </span>
          <Tooltip title="复制类型定义">
            <Button
              type="text"
              size="small"
              icon={
                <span className="material-symbols-outlined text-sm">
                  content_copy
                </span>
              }
              onClick={handleCopyTypes}
            />
          </Tooltip>
        </div>
        {/* 类型定义编辑器 */}
        <div className="flex-1">
          <Editor
            height="100%"
            language="typescript"
            value={typeDefinitions}
            onMount={handleTypesEditorMount}
            theme={monacoTheme}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              lineNumbers: "on",
              wordWrap: "on",
              automaticLayout: true,
              scrollBeyondLastLine: false,
              folding: true,
              foldingStrategy: "indentation",
              bracketPairColorization: { enabled: true },
              renderValidationDecorations: "on",
              scrollbar: {
                vertical: "auto",
                horizontal: "auto",
              },
            }}
          />
        </div>
      </div>
    );
  };

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
      case "types":
        return renderTypesTab();
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
                Base URL:{" "}
                <span className="text-primary">{effectiveBaseUrl}</span>
              </span>
            )}
            {effectiveAuth && effectiveAuth.type !== "none" && (
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
      <div className="flex-1  flex flex-col">
        {/* 请求编辑区 */}
        <div className="h-[calc(100%-420px)] overflow-y-auto border-b border-border">
          {renderTabContent()}
        </div>

        {/* 响应区域 */}
        <div className="border-t border-border h-[400px] pt-4 flex flex-col">
          <div className="flex items-center justify-between mb-4 px-4">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
              响应内容
            </h3>
            {response && (
              <div className="flex items-center gap-4">
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
                    <span className="text-text-secondary">
                      {response.time}ms
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-text-tertiary">大小:</span>
                    <span className="text-text-secondary">
                      {formatSize(response.size)}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {isJsonResponse && (
                    <Tooltip title="格式化">
                      <Button
                        type="text"
                        size="small"
                        icon={
                          <span className="material-symbols-outlined text-sm">
                            format_align_left
                          </span>
                        }
                        onClick={handleFormatResponse}
                      />
                    </Tooltip>
                  )}
                  <Tooltip title="复制">
                    <Button
                      type="text"
                      size="small"
                      icon={
                        <span className="material-symbols-outlined text-sm">
                          content_copy
                        </span>
                      }
                      onClick={handleCopyResponse}
                    />
                  </Tooltip>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 px-4 pb-4 overflow-hidden">
            {responseLoading ? (
              <div className="flex items-center justify-center h-32">
                <Spin tip="请求中..." />
              </div>
            ) : response ? (
              <div className="h-full rounded-xl overflow-hidden border border-border">
                <Editor
                  height="100%"
                  language={isJsonResponse ? "json" : "plaintext"}
                  value={beautifiedResponseBody}
                  onMount={handleResponseEditorMount}
                  theme={monacoTheme}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    lineNumbers: "on",
                    wordWrap: "on",
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    folding: true,
                    foldingStrategy: "indentation",
                    bracketPairColorization: { enabled: true },
                    renderValidationDecorations: "on",
                    scrollbar: {
                      vertical: "auto",
                      horizontal: "auto",
                    },
                  }}
                />
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
