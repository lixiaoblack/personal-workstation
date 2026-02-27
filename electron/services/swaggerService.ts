/**
 * Swagger 解析服务
 * 支持 Swagger 2.0 和 OpenAPI 3.0 格式
 */
import { createRequire } from "module";
import yaml from "js-yaml";
import path from "path";
import fs from "fs";

// 使用 require 加载 ESM 不兼容的 swagger-parser
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SwaggerParser = require("@apidevtools/swagger-parser");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiDocument = any;

// 解析后的 API 信息
export interface ParsedApiInfo {
  title: string;
  version: string;
  description?: string;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  basePath?: string; // Swagger 2.0
  host?: string; // Swagger 2.0
}

// 解析后的参数
export interface ParsedParameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required: boolean;
  type?: string;
  format?: string;
  schema?: Record<string, unknown>;
  example?: unknown;
  defaultValue?: unknown;
  enum?: unknown[];
}

// 解析后的请求体
export interface ParsedRequestBody {
  description?: string;
  required?: boolean;
  content: Array<{
    contentType: string;
    schema?: Record<string, unknown>;
    example?: unknown;
    generatedExample?: Record<string, unknown>; // 根据 schema 生成的示例
  }>;
}

// 解析后的响应
export interface ParsedResponse {
  statusCode: string;
  description?: string;
  content?: Array<{
    contentType: string;
    schema?: Record<string, unknown>;
    example?: unknown;
  }>;
}

// 解析后的端点
export interface ParsedEndpoint {
  path: string;
  method: string; // GET, POST, PUT, DELETE, PATCH, etc.
  summary?: string;
  description?: string;
  operationId?: string;
  tags: string[];
  deprecated: boolean;
  parameters: ParsedParameter[];
  requestBody?: ParsedRequestBody;
  responses: ParsedResponse[];
  security?: Array<Record<string, unknown>>;
  servers?: Array<{ url: string; description?: string }>;
}

// 解析后的安全定义
export interface ParsedSecurityScheme {
  type: string;
  name?: string;
  in?: string;
  description?: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: Record<string, unknown>;
}

// 完整的解析结果
export interface SwaggerParseResult {
  success: boolean;
  error?: string;
  source?: {
    type: "url" | "file";
    location: string;
  };
  specVersion?: "2.0" | "3.0" | "3.1";
  info?: ParsedApiInfo;
  endpoints?: ParsedEndpoint[];
  tags?: Array<{
    name: string;
    description?: string;
  }>;
  securitySchemes?: Record<string, ParsedSecurityScheme>;
  components?: {
    schemas?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    responses?: Record<string, unknown>;
  };
  definitions?: Record<string, unknown>; // Swagger 2.0
}

/**
 * 从 URL 解析 Swagger 文档
 */
export async function parseSwaggerFromUrl(
  url: string
): Promise<SwaggerParseResult> {
  try {
    console.log("[Swagger] 开始解析 URL:", url);
    // 使用 swagger-parser 解析和验证
    const api = await SwaggerParser.validate(url);
    console.log("[Swagger] swagger-parser 验证成功, 开始解析文档");
    const result = parseApiDocument(api, "url", url);
    console.log("[Swagger] 文档解析完成, 成功:", result.success);
    return result;
  } catch (error) {
    console.error("[Swagger] URL 解析错误:", error);
    // 打印更详细的错误信息
    if (error instanceof Error) {
      console.error("[Swagger] 错误消息:", error.message);
      console.error("[Swagger] 错误堆栈:", error.stack);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "解析失败",
      source: { type: "url", location: url },
    };
  }
}

/**
 * 从文件路径解析 Swagger 文档
 */
export async function parseSwaggerFromFile(
  filePath: string
): Promise<SwaggerParseResult> {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: "文件不存在",
        source: { type: "file", location: filePath },
      };
    }

    // 读取文件内容
    const content = fs.readFileSync(filePath, "utf-8");
    const ext = path.extname(filePath).toLowerCase();

    let jsonContent: string;

    if (ext === ".yaml" || ext === ".yml") {
      // YAML 转 JSON
      const yamlObj = yaml.load(content);
      jsonContent = JSON.stringify(yamlObj);
    } else {
      jsonContent = content;
    }

    // 使用 swagger-parser 解析和验证
    const api = await SwaggerParser.validate(JSON.parse(jsonContent));
    return parseApiDocument(api, "file", filePath);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "解析失败",
      source: { type: "file", location: filePath },
    };
  }
}

/**
 * 从内容字符串解析 Swagger 文档
 */
export async function parseSwaggerFromContent(
  content: string,
  format: "json" | "yaml" = "json"
): Promise<SwaggerParseResult> {
  try {
    let jsonContent: string;

    if (format === "yaml") {
      const yamlObj = yaml.load(content);
      jsonContent = JSON.stringify(yamlObj);
    } else {
      jsonContent = content;
    }

    const api = await SwaggerParser.validate(JSON.parse(jsonContent));
    return parseApiDocument(api, "file", "content");
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "解析失败",
    };
  }
}

/**
 * 解析 API 文档对象
 */
function parseApiDocument(
  api: ApiDocument,
  sourceType: "url" | "file",
  sourceLocation: string
): SwaggerParseResult {
  try {
    console.log("[Swagger] parseApiDocument 开始");
    // 判断 OpenAPI 版本
    const isOpenAPI3 = api.openapi && api.openapi.startsWith("3");
    const specVersion = isOpenAPI3
      ? api.openapi.startsWith("3.1")
        ? "3.1"
        : "3.0"
      : "2.0";
    console.log("[Swagger] 检测到版本:", specVersion, "isOpenAPI3:", isOpenAPI3);

    // 解析基本信息
    const info: ParsedApiInfo = {
      title: api.info?.title || "Unknown API",
      version: api.info?.version || "1.0.0",
      description: api.info?.description,
      contact: api.info?.contact as ParsedApiInfo["contact"],
      license: api.info?.license as ParsedApiInfo["license"],
    };

    // 解析服务器信息
    if (isOpenAPI3) {
      info.servers = api.servers?.map(
        (s: { url: string; description?: string }) => ({
          url: s.url,
          description: s.description,
        })
      );
    } else {
      // Swagger 2.0
      info.host = api.host;
      info.basePath = api.basePath;
    }

    // 解析端点
    const endpoints: ParsedEndpoint[] = [];
    const paths = api.paths || {};
    console.log("[Swagger] 开始解析 paths, 共", Object.keys(paths).length, "个路径");

    for (const [path, pathItem] of Object.entries(paths)) {
      const methods = [
        "get",
        "post",
        "put",
        "delete",
        "patch",
        "head",
        "options",
        "trace",
      ];

      for (const method of methods) {
        const operation = (pathItem as Record<string, unknown>)[method] as
          | Record<string, unknown>
          | undefined;

        if (!operation) continue;

        try {
          const endpoint: ParsedEndpoint = {
            path,
            method: method.toUpperCase(),
            summary: operation.summary as string,
            description: operation.description as string,
            operationId: operation.operationId as string,
            tags: (operation.tags as string[]) || [],
            deprecated: (operation.deprecated as boolean) || false,
            parameters: parseParameters(operation.parameters, pathItem),
            responses: parseResponses(
              operation.responses as Record<string, unknown>
            ),
            security: operation.security as Array<Record<string, unknown>>,
          };

          // OpenAPI 3.x requestBody
          if (isOpenAPI3 && operation.requestBody) {
            endpoint.requestBody = parseRequestBody(
              operation.requestBody as Record<string, unknown>,
              api
            );
          }

          // Swagger 2.0 body parameter
          if (!isOpenAPI3) {
            const bodyParam = (operation.parameters as unknown[])?.find(
              (p) => (p as Record<string, unknown>).in === "body"
            );
            if (bodyParam) {
              endpoint.requestBody = parseSwagger2BodyParameter(
                bodyParam as Record<string, unknown>
              );
            }
          }

          endpoints.push(endpoint);
        } catch (endpointError) {
          console.error(
            `[Swagger] 解析端点失败: ${method.toUpperCase()} ${path}`,
            endpointError
          );
          // 继续解析其他端点
        }
      }
    }
    console.log("[Swagger] 端点解析完成, 共", endpoints.length, "个端点");

    // 解析标签
    const tags = api.tags?.map((t: { name: string; description?: string }) => ({
      name: t.name,
      description: t.description,
    }));

    // 解析安全定义
    const securitySchemes = parseSecuritySchemes(api);

    // 解析组件/定义
    const components = isOpenAPI3
      ? {
          schemas: api.components?.schemas,
          parameters: api.components?.parameters,
          responses: api.components?.responses,
        }
      : {
          definitions: api.definitions,
        };

    return {
      success: true,
      source: { type: sourceType, location: sourceLocation },
      specVersion,
      info,
      endpoints,
      tags,
      securitySchemes,
      components,
    };
  } catch (error) {
    console.error("[Swagger] parseApiDocument 错误:", error);
    if (error instanceof Error) {
      console.error("[Swagger] 错误消息:", error.message);
      console.error("[Swagger] 错误堆栈:", error.stack);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "解析失败",
      source: { type: sourceType, location: sourceLocation },
    };
  }
}

/**
 * 解析参数
 * 注意：Swagger 2.0 的 body 和 formData 参数由专门的 requestBody 处理，这里过滤掉
 */
function parseParameters(
  operationParams: unknown,
  pathItem: unknown
): ParsedParameter[] {
  const parameters: ParsedParameter[] = [];
  const pathParams =
    ((pathItem as Record<string, unknown>)?.parameters as unknown[]) || [];
  const opParams = (operationParams as unknown[]) || [];
  const allParams = [...pathParams, ...opParams] as Array<
    Record<string, unknown>
  >;

  for (const param of allParams) {
    // 跳过 Swagger 2.0 的 body 和 formData 参数，这些由 requestBody 处理
    const paramIn = param.in as string;
    if (paramIn === "body" || paramIn === "formData") {
      continue;
    }

    parameters.push({
      name: param.name as string,
      in: paramIn as ParsedParameter["in"],
      description: param.description as string,
      required: param.required as boolean,
      type:
        (param.type as string) ||
        ((param.schema as Record<string, unknown>)?.type as string),
      format: param.format as string,
      schema: param.schema as Record<string, unknown>,
      example: param.example,
      defaultValue: param.default,
      enum: param.enum as unknown[],
    });
  }

  return parameters;
}

/**
 * 解析 $ref 引用，获取实际定义
 */
function resolveRef(
  ref: string,
  api: ApiDocument
): Record<string, unknown> | undefined {
  if (!ref || !ref.startsWith("#/")) {
    console.warn("[Swagger] 无效的 $ref 引用:", ref);
    return undefined;
  }

  const parts = ref.slice(2).split("/");
  let current: unknown = api;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      console.warn(
        "[Swagger] $ref 引用解析失败:",
        ref,
        "- 找不到路径部分:",
        part,
        "可用键:",
        current && typeof current === "object" ? Object.keys(current) : "N/A"
      );
      return undefined;
    }
  }

  return current as Record<string, unknown>;
}

/**
 * 根据 schema 生成示例数据
 */
function generateExampleFromSchema(
  schema: Record<string, unknown>,
  api: ApiDocument,
  depth = 0
): unknown {
  // 防止循环引用导致的无限递归
  if (depth > 10) {
    console.warn("[Swagger] generateExampleFromSchema 深度超过 10, 停止递归");
    return {};
  }

  try {
    // 如果有 $ref，先解析引用
    if (schema.$ref) {
      const resolved = resolveRef(schema.$ref as string, api);
      if (resolved) {
        return generateExampleFromSchema(resolved, api, depth + 1);
      }
      console.warn(
        "[Swagger] 无法解析 $ref:",
        schema.$ref,
        "返回空对象"
      );
      return {};
    }

  // 如果有 example，直接使用
  if (schema.example !== undefined) {
    return schema.example;
  }

  // 如果有 default，使用默认值
  if (schema.default !== undefined) {
    return schema.default;
  }

  const type = schema.type as string;

  switch (type) {
    case "string":
      if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
        return schema.enum[0];
      }
      if (schema.format === "date") return "2024-01-01";
      if (schema.format === "date-time") return "2024-01-01T00:00:00Z";
      if (schema.format === "email") return "user@example.com";
      if (schema.format === "uri" || schema.format === "url")
        return "https://example.com";
      if (schema.format === "uuid")
        return "00000000-0000-0000-0000-000000000000";
      if (schema.format === "password") return "********";
      return schema.description ? `示例: ${schema.description}` : "string";

    case "number":
    case "integer":
      if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
        return schema.enum[0];
      }
      if (schema.minimum !== undefined) {
        return schema.maximum !== undefined
          ? Math.min((schema.minimum as number) + 1, schema.maximum as number)
          : (schema.minimum as number) + 1;
      }
      return 0;

    case "boolean":
      return false;

    case "array": {
      const items = schema.items as Record<string, unknown> | undefined;
      if (items) {
        const exampleItem = generateExampleFromSchema(items, api, depth + 1);
        return [exampleItem];
      }
      return [];
    }

    case "object": {
      const result: Record<string, unknown> = {};
      const properties = schema.properties as
        | Record<string, Record<string, unknown>>
        | undefined;

      if (properties) {
        for (const [propName, propSchema] of Object.entries(properties)) {
          // 检查是否是必填字段
          const required =
            Array.isArray(schema.required) &&
            schema.required.includes(propName);
          // 只为必填字段生成示例，可选字段可以留空
          if (required || depth < 2) {
            result[propName] = generateExampleFromSchema(
              propSchema,
              api,
              depth + 1
            );
          }
        }
      }

      // 处理 additionalProperties
      if (
        schema.additionalProperties &&
        typeof schema.additionalProperties === "object"
      ) {
        // 如果对象没有固定属性，添加一个示例属性
        if (Object.keys(result).length === 0) {
          result["additionalProperty"] = generateExampleFromSchema(
            schema.additionalProperties as Record<string, unknown>,
            api,
            depth + 1
          );
        }
      }

      return result;
    }

    default:
      // 如果没有 type，但有 properties，当作 object 处理
      if (schema.properties) {
        return generateExampleFromSchema(
          { ...schema, type: "object" },
          api,
          depth
        );
      }
      return null;
  }
  } catch (error) {
    console.error("[Swagger] generateExampleFromSchema 错误:", error, "schema:", schema);
    return null;
  }
}

/**
 * 解析请求体 (OpenAPI 3.x)
 */
function parseRequestBody(
  reqBody: Record<string, unknown>,
  api: ApiDocument
): ParsedRequestBody {
  const content: ParsedRequestBody["content"] = [];

  if (reqBody.content) {
    for (const [contentType, mediaType] of Object.entries(
      reqBody.content as Record<string, unknown>
    )) {
      const mt = mediaType as Record<string, unknown>;
      const schema = mt.schema as Record<string, unknown> | undefined;

      // 生成示例数据
      let generatedExample: Record<string, unknown> | undefined;
      if (schema) {
        const example = generateExampleFromSchema(schema, api);
        generatedExample = example as Record<string, unknown>;
      }

      content.push({
        contentType,
        schema,
        example: mt.example,
        generatedExample,
      });
    }
  }

  return {
    description: reqBody.description as string,
    required: reqBody.required as boolean,
    content,
  };
}

/**
 * 解析 Swagger 2.0 body 参数
 */
function parseSwagger2BodyParameter(
  param: Record<string, unknown>
): ParsedRequestBody {
  return {
    description: param.description as string,
    required: param.required as boolean,
    content: [
      {
        contentType: "application/json",
        schema: param.schema as Record<string, unknown>,
      },
    ],
  };
}

/**
 * 解析响应
 */
function parseResponses(
  responses: Record<string, unknown> = {}
): ParsedResponse[] {
  const result: ParsedResponse[] = [];

  for (const [statusCode, response] of Object.entries(responses)) {
    const resp = response as Record<string, unknown>;
    const parsed: ParsedResponse = {
      statusCode,
      description: resp.description as string,
    };

    if (resp.content) {
      parsed.content = [];
      for (const [contentType, mediaType] of Object.entries(
        resp.content as Record<string, unknown>
      )) {
        const mt = mediaType as Record<string, unknown>;
        parsed.content.push({
          contentType,
          schema: mt.schema as Record<string, unknown>,
          example: mt.example,
        });
      }
    }

    // Swagger 2.0 schema
    if (resp.schema) {
      parsed.content = [
        {
          contentType: "application/json",
          schema: resp.schema as Record<string, unknown>,
        },
      ];
    }

    result.push(parsed);
  }

  return result;
}

/**
 * 解析安全定义
 */
function parseSecuritySchemes(
  api: ApiDocument
): Record<string, ParsedSecurityScheme> | undefined {
  const result: Record<string, ParsedSecurityScheme> = {};

  // OpenAPI 3.x
  if (api.components?.securitySchemes) {
    for (const [name, scheme] of Object.entries(
      api.components.securitySchemes as Record<string, Record<string, unknown>>
    )) {
      result[name] = {
        type: scheme.type as string,
        name: scheme.name as string,
        in: scheme.in as string,
        description: scheme.description as string,
        scheme: scheme.scheme as string,
        bearerFormat: scheme.bearerFormat as string,
        flows: scheme.flows as Record<string, unknown>,
      };
    }
  }

  // Swagger 2.0
  if (api.securityDefinitions) {
    for (const [name, scheme] of Object.entries(
      api.securityDefinitions as Record<string, Record<string, unknown>>
    )) {
      result[name] = {
        type: scheme.type as string,
        name: scheme.name as string,
        in: scheme.in as string,
        description: scheme.description as string,
      };
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * 选择 Swagger 文件
 */
export async function selectSwaggerFile(): Promise<{
  canceled: boolean;
  filePaths: string[];
}> {
  const { dialog } = await import("electron");
  const result = await dialog.showOpenDialog({
    title: "选择 Swagger/OpenAPI 文件",
    filters: [
      { name: "Swagger/OpenAPI", extensions: ["json", "yaml", "yml"] },
      { name: "JSON", extensions: ["json"] },
      { name: "YAML", extensions: ["yaml", "yml"] },
    ],
    properties: ["openFile"],
  });

  return {
    canceled: result.canceled,
    filePaths: result.filePaths,
  };
}
