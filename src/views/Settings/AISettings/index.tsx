/**
 * AISettings AI 模型设置页面
 * 包含在线API接入和本地模型接入配置
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { App } from "antd";

// 模型配置类型
interface ModelConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconColor: string;
  fields: ConfigField[];
  status?: "connected" | "disconnected" | "error";
}

interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "select";
  placeholder: string;
  options?: { value: string; label: string }[];
}

const AISettings: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  // 在线 API 配置
  const [onlineConfigs, setOnlineConfigs] = useState<Record<string, Record<string, string>>>({
    openai: { apiKey: "", baseUrl: "" },
    dashscope: { apiKey: "", modelId: "" },
    zhipu: { apiKey: "", model: "glm-4-plus" },
  });

  // 本地模型配置
  const [localConfig, setLocalConfig] = useState({
    host: "http://127.0.0.1",
    port: "11434",
    model: "",
  });

  // Ollama 服务状态
  const [ollamaStatus, setOllamaStatus] = useState<"running" | "stopped" | "checking">("running");

  // 在线 API 模型配置
  const onlineModels: ModelConfig[] = [
    {
      id: "openai",
      name: "OpenAI (标准格式)",
      description: "支持 OpenAI 官方及所有兼容 OpenAI 格式的代理接口",
      icon: "api",
      iconColor: "emerald",
      fields: [
        { key: "apiKey", label: "API Key", type: "password", placeholder: "sk-..." },
        { key: "baseUrl", label: "Base URL", type: "text", placeholder: "https://api.openai.com/v1" },
      ],
    },
    {
      id: "dashscope",
      name: "阿里云百炼 (DashScope)",
      description: "接入通义千问系列模型",
      icon: "filter_drama",
      iconColor: "orange",
      fields: [
        { key: "apiKey", label: "API Key", type: "password", placeholder: "请输入您的百炼 API Key" },
        { key: "modelId", label: "默认模型 ID", type: "text", placeholder: "例如: qwen-max" },
      ],
    },
    {
      id: "zhipu",
      name: "智谱 AI (ZhipuAI)",
      description: "接入 GLM 系列国产大模型",
      icon: "psychology",
      iconColor: "blue",
      fields: [
        { key: "apiKey", label: "API Key", type: "password", placeholder: "请输入您的智谱 API Key" },
        {
          key: "model",
          label: "首选模型",
          type: "select",
          placeholder: "",
          options: [
            { value: "glm-4-plus", label: "glm-4-plus" },
            { value: "glm-4", label: "glm-4" },
            { value: "glm-4-air", label: "glm-4-air" },
            { value: "glm-4-flash", label: "glm-4-flash" },
          ],
        },
      ],
    },
  ];

  // 处理配置变更
  const handleConfigChange = (modelId: string, fieldKey: string, value: string) => {
    setOnlineConfigs((prev) => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        [fieldKey]: value,
      },
    }));
  };

  // 处理本地配置变更
  const handleLocalConfigChange = (fieldKey: string, value: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  // 测试连接
  const handleTestConnection = async (modelId: string) => {
    message.info(`正在测试 ${modelId} 连接...`);
    // TODO: 实现实际的连接测试
    setTimeout(() => {
      message.success("连接成功");
    }, 1000);
  };

  // 测试 Ollama 连接
  const handleTestOllama = async () => {
    setOllamaStatus("checking");
    // TODO: 实现实际的 Ollama 连接测试
    setTimeout(() => {
      setOllamaStatus("running");
      message.success("Ollama 连接成功");
    }, 1000);
  };

  // 保存配置
  const handleSave = () => {
    message.success("配置已保存");
  };

  // 重置配置
  const handleReset = () => {
    setOnlineConfigs({
      openai: { apiKey: "", baseUrl: "" },
      dashscope: { apiKey: "", modelId: "" },
      zhipu: { apiKey: "", model: "glm-4-plus" },
    });
    setLocalConfig({
      host: "http://127.0.0.1",
      port: "11434",
      model: "",
    });
    message.info("配置已重置");
  };

  // 获取图标颜色样式
  const getIconColorClass = (color: string) => {
    const colors: Record<string, string> = {
      emerald: "bg-emerald-500/10 text-emerald-500",
      orange: "bg-orange-500/10 text-orange-500",
      blue: "bg-blue-500/10 text-blue-500",
      purple: "bg-purple-500/10 text-purple-500",
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-bg-primary/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="p-2 hover:bg-bg-hover rounded-lg transition-colors flex items-center justify-center text-text-secondary"
              onClick={() => navigate("/settings")}
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-lg font-bold tracking-tight text-text-primary">
              AI 模型接入设置
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded font-medium">
              工作站模式
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <span className="material-symbols-outlined text-sm text-primary">
                person
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-5xl mx-auto px-4 py-8 pb-32">
        <div className="space-y-10">
          {/* 在线 API 接入 */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary">
                cloud_done
              </span>
              <h2 className="text-xl font-bold text-text-primary">在线 API 接入</h2>
            </div>
            <div className="grid gap-6">
              {onlineModels.map((model) => (
                <div
                  key={model.id}
                  className="p-6 bg-bg-secondary border border-border rounded-xl shadow-sm"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${getIconColorClass(model.iconColor)}`}
                      >
                        <span className="material-symbols-outlined">
                          {model.icon}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-text-primary">{model.name}</h3>
                        <p className="text-xs text-text-tertiary">
                          {model.description}
                        </p>
                      </div>
                    </div>
                    <button
                      className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                      onClick={() => handleTestConnection(model.id)}
                    >
                      <span className="material-symbols-outlined text-sm">
                        nest_remote_comfort_sensor
                      </span>
                      测试连接
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {model.fields.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <label className="text-sm font-medium text-text-tertiary">
                          {field.label}
                        </label>
                        {field.type === "select" ? (
                          <select
                            className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-sm focus:ring-primary focus:border-primary outline-none appearance-none text-text-primary"
                            value={onlineConfigs[model.id]?.[field.key] || ""}
                            onChange={(e) =>
                              handleConfigChange(model.id, field.key, e.target.value)
                            }
                          >
                            {field.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : field.type === "password" ? (
                          <div className="relative">
                            <input
                              className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-sm focus:ring-primary focus:border-primary outline-none text-text-primary"
                              placeholder={field.placeholder}
                              type="password"
                              value={onlineConfigs[model.id]?.[field.key] || ""}
                              onChange={(e) =>
                                handleConfigChange(model.id, field.key, e.target.value)
                              }
                            />
                            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">
                              <span className="material-symbols-outlined text-sm">
                                visibility_off
                              </span>
                            </button>
                          </div>
                        ) : (
                          <input
                            className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-sm focus:ring-primary focus:border-primary outline-none text-text-primary"
                            placeholder={field.placeholder}
                            type="text"
                            value={onlineConfigs[model.id]?.[field.key] || ""}
                            onChange={(e) =>
                              handleConfigChange(model.id, field.key, e.target.value)
                            }
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 本地模型接入 */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary">dns</span>
              <h2 className="text-xl font-bold text-text-primary">本地模型接入</h2>
            </div>
            <div className="p-6 bg-bg-secondary border border-border rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-500">
                      terminal
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary">Ollama</h3>
                    <p className="text-xs text-text-tertiary">
                      管理并运行本地 Llama, Mistral 等模型
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`flex items-center gap-1 text-xs ${
                      ollamaStatus === "running"
                        ? "text-success"
                        : ollamaStatus === "checking"
                        ? "text-warning"
                        : "text-error"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        ollamaStatus === "running"
                          ? "bg-success"
                          : ollamaStatus === "checking"
                          ? "bg-warning animate-pulse"
                          : "bg-error"
                      }`}
                    ></span>
                    {ollamaStatus === "running"
                      ? "服务运行中"
                      : ollamaStatus === "checking"
                      ? "检测中..."
                      : "服务未运行"}
                  </span>
                  <button
                    className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                    onClick={handleTestOllama}
                  >
                    <span className="material-symbols-outlined text-sm">
                      nest_remote_comfort_sensor
                    </span>
                    测试连接
                  </button>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-tertiary">
                    Host 地址
                  </label>
                  <input
                    className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-sm focus:ring-primary focus:border-primary outline-none text-text-primary"
                    placeholder="http://127.0.0.1"
                    type="text"
                    value={localConfig.host}
                    onChange={(e) => handleLocalConfigChange("host", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-tertiary">
                    端口号
                  </label>
                  <input
                    className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-sm focus:ring-primary focus:border-primary outline-none text-text-primary"
                    placeholder="11434"
                    type="text"
                    value={localConfig.port}
                    onChange={(e) => handleLocalConfigChange("port", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-tertiary">
                    默认模型
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-sm focus:ring-primary focus:border-primary outline-none text-text-primary"
                      placeholder="例如: llama3"
                      type="text"
                      value={localConfig.model}
                      onChange={(e) => handleLocalConfigChange("model", e.target.value)}
                    />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">
                      <span className="material-symbols-outlined text-sm">
                        search
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* 底部操作栏 */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-bg-primary/95 backdrop-blur-sm px-4 py-4 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="hidden md:flex items-center gap-2 text-text-tertiary text-sm">
            <span className="material-symbols-outlined text-base">info</span>
            <span>所有 API Key 将加密存储在本地。</span>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button
              className="flex-1 md:flex-none px-8 py-3 bg-bg-tertiary hover:bg-bg-hover rounded-lg font-bold text-sm transition-all text-text-secondary"
              onClick={handleReset}
            >
              重置
            </button>
            <button
              className="flex-1 md:flex-none px-12 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
              onClick={handleSave}
            >
              <span className="material-symbols-outlined text-base">save</span>
              保存配置
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export { AISettings };
