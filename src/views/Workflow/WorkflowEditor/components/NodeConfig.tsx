/**
 * 节点配置面板组件
 *
 * 右侧配置面板，用于配置选中节点的参数
 * 支持从数据库加载模型、知识库等数据
 * 支持单节点测试运行
 */

import React, { useState, useEffect } from "react";
import type { Node } from "@xyflow/react";
import { message } from "antd";

interface NodeConfigProps {
  node: Node;
  workflowId: string | null;
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onClose: () => void;
}

// 测试执行结果类型
interface NodeTestResult {
  success: boolean;
  node_id?: string;
  node_type?: string;
  status?: string;
  output?: Record<string, unknown> | string | null;
  variables?: Record<string, unknown>;
  error?: string;
  execution_time?: number;
  started_at?: string;
  completed_at?: string;
}

// 模型配置
interface ModelConfig {
  id: number;
  name: string;
  modelId: string;
}

// 知识库配置
interface KnowledgeConfig {
  id: string;
  name: string;
}

// 节点配置项定义
const nodeConfigSchemas: Record<string, ConfigField[]> = {
  llm: [
    { key: "model", label: "模型", type: "model", placeholder: "选择模型" },
    {
      key: "systemPrompt",
      label: "系统提示词",
      type: "textarea",
      placeholder: "设置模型角色和行为规范",
      default: "你是一个有帮助的助手，请用中文回复用户的问题。",
    },
    {
      key: "prompt",
      label: "用户提示词",
      type: "textarea",
      placeholder: "输入提示词模板，支持 ${变量}",
    },
    {
      key: "temperature",
      label: "温度",
      type: "number",
      default: 0.7,
      min: 0,
      max: 2,
    },
    { key: "maxTokens", label: "最大 Tokens", type: "number", default: 2048 },
    {
      key: "outputVariable",
      label: "输出变量名",
      type: "text",
      default: "llm_output",
      placeholder: "存储输出结果的变量名",
    },
  ],
  tool: [
    {
      key: "toolName",
      label: "工具名称",
      type: "select",
      options: ["web_search", "knowledge_search", "code_execute", "file_read"],
    },
    {
      key: "params",
      label: "参数",
      type: "json",
      placeholder: '{"key": "value"}',
    },
    {
      key: "outputVariable",
      label: "输出变量名",
      type: "text",
      default: "tool_output",
      placeholder: "存储输出结果的变量名",
    },
  ],
  knowledge: [
    {
      key: "knowledgeId",
      label: "知识库",
      type: "knowledge",
      placeholder: "选择知识库",
    },
    {
      key: "query",
      label: "查询内容",
      type: "text",
      placeholder: "支持 ${变量} 模板",
      default: "${input}",
    },
    { key: "topK", label: "返回条数", type: "number", default: 5 },
    {
      key: "scoreThreshold",
      label: "相似度阈值",
      type: "number",
      default: 0.5,
      min: 0,
      max: 1,
    },
    {
      key: "outputVariable",
      label: "输出变量名",
      type: "text",
      default: "knowledge_results",
      placeholder: "存储输出结果的变量名",
    },
  ],
  condition: [
    {
      key: "expression",
      label: "条件表达式",
      type: "textarea",
      placeholder: "输入条件表达式，如: ${score} > 10",
    },
  ],
  loop: [
    { key: "iterations", label: "循环次数", type: "number", default: 1 },
    {
      key: "condition",
      label: "退出条件",
      type: "text",
      placeholder: "可选，留空则按次数循环",
    },
  ],
  file_select: [
    { key: "multiple", label: "多选", type: "boolean", default: false },
    {
      key: "accept",
      label: "文件类型",
      type: "text",
      placeholder: ".pdf,.doc,.txt",
    },
    { key: "maxSize", label: "最大大小(MB)", type: "number", default: 10 },
    {
      key: "outputVariable",
      label: "输出变量名",
      type: "text",
      default: "selected_files",
      placeholder: "存储文件路径的变量名",
    },
  ],
  user_input: [
    {
      key: "inputType",
      label: "输入类型",
      type: "select",
      options: ["text", "select", "multiselect"],
      default: "text",
    },
    {
      key: "label",
      label: "标签",
      type: "text",
      placeholder: "请输入您的选择",
    },
    {
      key: "options",
      label: "选项(逗号分隔)",
      type: "text",
      placeholder: "选项1,选项2,选项3",
    },
    { key: "required", label: "必填", type: "boolean", default: true },
    {
      key: "outputVariable",
      label: "输出变量名",
      type: "text",
      default: "user_input",
      placeholder: "存储用户输入的变量名",
    },
  ],
  human_review: [
    {
      key: "message",
      label: "提示信息",
      type: "textarea",
      placeholder: "请审核以下内容...",
    },
    { key: "timeout", label: "超时时间(分钟)", type: "number", default: 60 },
  ],
  message: [
    {
      key: "content",
      label: "消息内容",
      type: "textarea",
      placeholder: "输入要发送给用户的消息，支持 ${变量}",
    },
  ],
  webhook: [
    {
      key: "url",
      label: "Webhook URL",
      type: "text",
      placeholder: "https://api.example.com/webhook",
    },
    {
      key: "method",
      label: "请求方法",
      type: "select",
      options: ["GET", "POST", "PUT", "DELETE"],
      default: "POST",
    },
    {
      key: "headers",
      label: "请求头",
      type: "json",
      placeholder: '{"Authorization": "Bearer xxx"}',
    },
    {
      key: "outputVariable",
      label: "输出变量名",
      type: "text",
      default: "webhook_response",
      placeholder: "存储响应结果的变量名",
    },
  ],
};

interface ConfigField {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  default?: unknown;
  options?: string[];
  min?: number;
  max?: number;
}

// 节点类型标签
const nodeTypeLabels: Record<string, string> = {
  start: "开始节点",
  end: "结束节点",
  llm: "LLM 调用",
  tool: "工具调用",
  knowledge: "知识检索",
  condition: "条件分支",
  loop: "循环",
  file_select: "文件选择",
  user_input: "用户输入",
  human_review: "人工审核",
  message: "消息输出",
  webhook: "Webhook",
};

// 节点颜色
const nodeColors: Record<string, string> = {
  start: "#10B981",
  end: "#EF4444",
  llm: "#3B82F6",
  tool: "#8B5CF6",
  knowledge: "#F59E0B",
  condition: "#EC4899",
  loop: "#06B6D4",
  file_select: "#84CC16",
  user_input: "#F97316",
  human_review: "#6366F1",
  message: "#14B8A6",
  webhook: "#A855F7",
};

export const NodeConfig: React.FC<NodeConfigProps> = ({
  node,
  workflowId,
  onUpdate,
  onDelete,
  onClose,
}) => {
  const [localData, setLocalData] = useState<Record<string, unknown>>(
    node.data as Record<string, unknown>
  );

  // 数据库数据
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeConfig[]>([]);
  const [loading, setLoading] = useState(false);

  // 测试相关状态
  const [testing, setTesting] = useState(false);
  const [testInput, setTestInput] = useState("{\n  \n}");
  const [testResult, setTestResult] = useState<NodeTestResult | null>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);

  // 加载模型和知识库数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 加载模型配置
        const modelConfigs = await window.electronAPI.getEnabledModelConfigs();
        const chatModels = modelConfigs.filter((c) => c.usageType === "llm");
        setModels(
          chatModels.map((m) => ({
            id: m.id,
            name: m.name,
            modelId: m.modelId,
          }))
        );

        // 加载知识库列表
        const kbResult = await window.electronAPI.listKnowledge();
        if (kbResult.success && kbResult.knowledge) {
          setKnowledgeBases(
            kbResult.knowledge.map((kb: { id: string; name: string }) => ({
              id: kb.id,
              name: kb.name,
            }))
          );
        }
      } catch (error) {
        console.error("加载配置数据失败:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const nodeType = node.type || "llm";
  const schema = nodeConfigSchemas[nodeType] || [];

  // 更新字段值
  const handleFieldChange = (key: string, value: unknown) => {
    const newData = { ...localData, [key]: value };
    setLocalData(newData);
    onUpdate(newData);
  };

  // 执行节点测试
  const handleTestNode = async () => {
    if (!workflowId) {
      message.warning("请先保存工作流后再测试节点");
      return;
    }

    // 解析测试输入
    let inputVariables: Record<string, unknown> = {};
    try {
      if (testInput.trim()) {
        inputVariables = JSON.parse(testInput);
      }
    } catch {
      message.error("测试输入 JSON 格式错误");
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await window.electronAPI.workflowExecuteNode(
        workflowId,
        node.id,
        inputVariables
      );
      // 类型断言，将 unknown 转换为具体类型
      const typedResult: NodeTestResult = {
        ...result,
        output: result.output as
          | Record<string, unknown>
          | string
          | null
          | undefined,
      };
      setTestResult(typedResult);

      if (result.success) {
        message.success(`节点执行成功 (${result.execution_time?.toFixed(2)}s)`);
      } else {
        message.error("节点执行失败: " + (result.error || "未知错误"));
      }
    } catch (error) {
      const errorResult: NodeTestResult = {
        success: false,
        error: String(error),
      };
      setTestResult(errorResult);
      message.error("节点执行失败: " + String(error));
    } finally {
      setTesting(false);
    }
  };

  // 判断节点是否支持测试
  const canTestNode = !["start", "end"].includes(nodeType);

  // 渲染配置字段
  const renderField = (field: ConfigField) => {
    const value = localData[field.key] ?? field.default ?? "";

    switch (field.type) {
      case "text":
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        );

      case "textarea":
        return (
          <textarea
            value={value as string}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={value as number}
            onChange={(e) =>
              handleFieldChange(field.key, Number(e.target.value))
            }
            min={field.min}
            max={field.max}
            className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        );

      case "boolean":
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={(e) => handleFieldChange(field.key, e.target.checked)}
              className="w-4 h-4 rounded border-border bg-bg-primary text-primary focus:ring-primary/50"
            />
            <span className="text-sm text-text-secondary">启用</span>
          </label>
        );

      case "select":
        return (
          <select
            value={value as string}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case "json":
        return (
          <textarea
            value={
              typeof value === "object"
                ? JSON.stringify(value, null, 2)
                : (value as string)
            }
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleFieldChange(field.key, parsed);
              } catch {
                handleFieldChange(field.key, e.target.value);
              }
            }}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        );

      case "model":
        return (
          <select
            value={value as string}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={loading}
          >
            <option value="">{loading ? "加载中..." : "选择模型"}</option>
            {models.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.name} ({m.modelId})
              </option>
            ))}
          </select>
        );

      case "knowledge":
        return (
          <select
            value={value as string}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={loading}
          >
            <option value="">{loading ? "加载中..." : "选择知识库"}</option>
            {knowledgeBases.map((kb) => (
              <option key={kb.id} value={kb.id}>
                {kb.name}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-72 bg-bg-secondary border-l border-border flex flex-col">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">节点配置</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-bg-tertiary rounded transition-colors"
        >
          <svg
            className="w-4 h-4 text-text-secondary"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      {/* 节点信息 */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: nodeColors[nodeType] || "#64748B" }}
          >
            <span className="text-white text-xs">N</span>
          </div>
          <span className="text-sm font-medium text-text-primary">
            {nodeTypeLabels[nodeType] || nodeType}
          </span>
        </div>
        <div className="mt-2 text-xs text-text-tertiary">ID: {node.id}</div>
      </div>

      {/* 配置表单 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : schema.length === 0 ? (
          <div className="text-sm text-text-tertiary text-center py-8">
            此节点无需配置
          </div>
        ) : (
          schema.map((field) => (
            <div key={field.key}>
              <label className="block text-sm text-text-secondary mb-1">
                {field.label}
              </label>
              {renderField(field)}
            </div>
          ))
        )}
      </div>

      {/* 操作按钮 */}
      <div className="p-4 border-t border-border space-y-2">
        {/* 测试按钮 */}
        {canTestNode && (
          <button
            onClick={() => setShowTestPanel(!showTestPanel)}
            className="w-full px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            {showTestPanel ? "收起测试" : "测试此节点"}
          </button>
        )}

        {/* 删除按钮 */}
        <button
          onClick={onDelete}
          className="w-full px-4 py-2 bg-error/10 text-error rounded-lg hover:bg-error/20 transition-colors text-sm"
        >
          删除节点
        </button>
      </div>

      {/* 测试面板 */}
      {showTestPanel && canTestNode && (
        <div className="border-t border-border p-4 space-y-3">
          <h4 className="text-sm font-medium text-text-primary">
            测试输入参数
          </h4>
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder='{"input": "测试内容"}'
            rows={4}
            className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
          <button
            onClick={handleTestNode}
            disabled={testing || !workflowId}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {testing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                执行中...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                运行测试
              </>
            )}
          </button>

          {/* 测试结果 */}
          {testResult && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-text-primary">
                测试结果
                {testResult.execution_time && (
                  <span className="ml-2 text-xs text-text-tertiary">
                    耗时 {testResult.execution_time.toFixed(2)}s
                  </span>
                )}
              </h4>
              <div
                className={`p-3 rounded-lg text-sm ${
                  testResult.success
                    ? "bg-success/10 border border-success/20"
                    : "bg-error/10 border border-error/20"
                }`}
              >
                {testResult.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-success">
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                      执行成功
                    </div>
                    {testResult.output && (
                      <div>
                        <div className="text-text-secondary text-xs mb-1">
                          输出:
                        </div>
                        <pre className="bg-bg-primary/50 p-2 rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(testResult.output, null, 2) as string}
                        </pre>
                      </div>
                    )}
                    {testResult.variables &&
                      Object.keys(testResult.variables).length > 0 && (
                        <div>
                          <div className="text-text-secondary text-xs mb-1">
                            变量:
                          </div>
                          <pre className="bg-bg-primary/50 p-2 rounded text-xs overflow-auto max-h-32">
                            {
                              JSON.stringify(
                                testResult.variables,
                                null,
                                2
                              ) as string
                            }
                          </pre>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-error">
                    <svg
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    <div>
                      <div className="font-medium">执行失败</div>
                      <div className="text-error/80 text-xs mt-1">
                        {testResult.error || "未知错误"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
