/**
 * AISettings AI 模型设置页面
 * 包含 Python 环境检测、服务管理、在线API接入和本地模型接入配置
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App, Spin } from "antd";
import type {
  PythonEnvironment,
  PythonInstallGuide,
  PythonServiceInfo,
  PythonServiceConfig,
} from "@/types/electron";

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

  // Python 环境状态
  const [pythonEnv, setPythonEnv] = useState<PythonEnvironment | null>(null);
  const [pythonLoading, setPythonLoading] = useState(false);
  const [installGuide, setInstallGuide] = useState<PythonInstallGuide | null>(
    null
  );

  // Python 服务状态
  const [serviceInfo, setServiceInfo] = useState<PythonServiceInfo | null>(
    null
  );
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceConfig, setServiceConfig] = useState<PythonServiceConfig>({
    port: 8765,
  });

  // 在线 API 配置
  const [onlineConfigs, setOnlineConfigs] = useState<
    Record<string, Record<string, string>>
  >({
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
  const [ollamaStatus, setOllamaStatus] = useState<
    "running" | "stopped" | "checking"
  >("running");

  // 初始化时检测 Python 环境
  useEffect(() => {
    const initPython = async () => {
      await handleDetectPython();
      await loadInstallGuide();
      await loadServiceInfo();
    };
    initPython();
    // 定时刷新服务状态
    const interval = setInterval(loadServiceInfo, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 加载安装引导
  const loadInstallGuide = async () => {
    try {
      const guide = await window.electronAPI.getPythonInstallGuide();
      setInstallGuide(guide);
    } catch (error) {
      console.error("获取安装引导失败:", error);
    }
  };

  // 检测 Python 环境
  const handleDetectPython = async () => {
    setPythonLoading(true);
    try {
      const env = await window.electronAPI.detectPython();
      setPythonEnv(env);
      if (env.pythonInstalled && env.meetsRequirements) {
        message.success(`检测到 Python ${env.pythonVersion?.raw}`);
      } else if (env.pythonInstalled && !env.meetsRequirements) {
        message.warning(`Python 版本过低，需要 3.9+`);
      } else {
        message.warning("未检测到 Python 环境");
      }
    } catch (error) {
      console.error("检测 Python 环境失败:", error);
      message.error("检测 Python 环境失败");
    } finally {
      setPythonLoading(false);
    }
  };

  // 加载服务信息
  const loadServiceInfo = async () => {
    try {
      const info = await window.electronAPI.getPythonServiceInfo();
      setServiceInfo(info);
    } catch (error) {
      console.error("获取服务信息失败:", error);
    }
  };

  // 启动服务
  const handleStartService = async () => {
    setServiceLoading(true);
    try {
      const result = await window.electronAPI.startPythonService(serviceConfig);
      if (result.success) {
        message.success(`Python 服务已启动，PID: ${result.pid}`);
        await loadServiceInfo();
      } else {
        message.error(`启动失败: ${result.error}`);
      }
    } catch (error) {
      console.error("启动服务失败:", error);
      message.error("启动服务失败");
    } finally {
      setServiceLoading(false);
    }
  };

  // 停止服务
  const handleStopService = async () => {
    setServiceLoading(true);
    try {
      const result = await window.electronAPI.stopPythonService();
      if (result.success) {
        message.success("Python 服务已停止");
        await loadServiceInfo();
      } else {
        message.error(`停止失败: ${result.error}`);
      }
    } catch (error) {
      console.error("停止服务失败:", error);
      message.error("停止服务失败");
    } finally {
      setServiceLoading(false);
    }
  };

  // 重启服务
  const handleRestartService = async () => {
    setServiceLoading(true);
    try {
      const result = await window.electronAPI.restartPythonService(
        serviceConfig
      );
      if (result.success) {
        message.success("Python 服务已重启");
        await loadServiceInfo();
      } else {
        message.error(`重启失败: ${result.error}`);
      }
    } catch (error) {
      console.error("重启服务失败:", error);
      message.error("重启服务失败");
    } finally {
      setServiceLoading(false);
    }
  };

  // 在线 API 模型配置
  const onlineModels: ModelConfig[] = [
    {
      id: "openai",
      name: "OpenAI (标准格式)",
      description: "支持 OpenAI 官方及所有兼容 OpenAI 格式的代理接口",
      icon: "api",
      iconColor: "emerald",
      fields: [
        {
          key: "apiKey",
          label: "API Key",
          type: "password",
          placeholder: "sk-...",
        },
        {
          key: "baseUrl",
          label: "Base URL",
          type: "text",
          placeholder: "https://api.openai.com/v1",
        },
      ],
    },
    {
      id: "dashscope",
      name: "阿里云百炼 (DashScope)",
      description: "接入通义千问系列模型",
      icon: "filter_drama",
      iconColor: "orange",
      fields: [
        {
          key: "apiKey",
          label: "API Key",
          type: "password",
          placeholder: "请输入您的百炼 API Key",
        },
        {
          key: "modelId",
          label: "默认模型 ID",
          type: "text",
          placeholder: "例如: qwen-max",
        },
      ],
    },
    {
      id: "zhipu",
      name: "智谱 AI (ZhipuAI)",
      description: "接入 GLM 系列国产大模型",
      icon: "psychology",
      iconColor: "blue",
      fields: [
        {
          key: "apiKey",
          label: "API Key",
          type: "password",
          placeholder: "请输入您的智谱 API Key",
        },
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
  const handleConfigChange = (
    modelId: string,
    fieldKey: string,
    value: string
  ) => {
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

  // 获取操作系统显示名称
  const getOSDisplayName = (os: string) => {
    const names: Record<string, string> = {
      darwin: "macOS",
      win32: "Windows",
      linux: "Linux",
    };
    return names[os] || os;
  };

  // 渲染 Python 环境状态卡片
  const renderPythonEnvCard = () => (
    <div className="p-6 bg-bg-secondary border border-border rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-500">
              terminal
            </span>
          </div>
          <div>
            <h3 className="font-bold text-text-primary">Python 环境</h3>
            <p className="text-xs text-text-tertiary">AI 智能体运行所需环境</p>
          </div>
        </div>
        <button
          className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          onClick={handleDetectPython}
          disabled={pythonLoading}
        >
          <span
            className={`material-symbols-outlined text-sm ${
              pythonLoading ? "animate-spin" : ""
            }`}
          >
            {pythonLoading ? "progress_activity" : "refresh"}
          </span>
          重新检测
        </button>
      </div>

      {pythonLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spin />
          <span className="ml-3 text-text-tertiary">
            正在检测 Python 环境...
          </span>
        </div>
      ) : pythonEnv ? (
        <div className="space-y-4">
          {/* 系统信息 */}
          <div className="flex items-center gap-4 p-3 bg-bg-tertiary rounded-lg">
            <span className="material-symbols-outlined text-text-tertiary">
              computer
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                {getOSDisplayName(pythonEnv.os)}{" "}
                {pythonEnv.osVersion.split(" ")[1]}
              </p>
              <p className="text-xs text-text-tertiary">操作系统</p>
            </div>
          </div>

          {/* Python 版本 */}
          <div className="flex items-center gap-4 p-3 bg-bg-tertiary rounded-lg">
            <span className="material-symbols-outlined text-text-tertiary">
              code
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                {pythonEnv.pythonInstalled
                  ? `Python ${pythonEnv.pythonVersion?.raw}`
                  : "未安装"}
              </p>
              <p className="text-xs text-text-tertiary">
                {pythonEnv.pythonPath || "未检测到 Python 路径"}
              </p>
            </div>
            {pythonEnv.pythonInstalled && (
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  pythonEnv.meetsRequirements
                    ? "bg-success/10 text-success"
                    : "bg-warning/10 text-warning"
                }`}
              >
                {pythonEnv.meetsRequirements ? "满足要求" : "版本过低"}
              </span>
            )}
          </div>

          {/* 包管理器 */}
          {pythonEnv.packageManagers.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-bg-tertiary rounded-lg">
              <span className="material-symbols-outlined text-text-tertiary">
                package
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {pythonEnv.packageManagers.map((pm) => pm.type).join(", ")}
                </p>
                <p className="text-xs text-text-tertiary">包管理器</p>
              </div>
            </div>
          )}

          {/* 虚拟环境 */}
          {pythonEnv.virtualEnv.active && (
            <div className="flex items-center gap-4 p-3 bg-success/5 border border-success/20 rounded-lg">
              <span className="material-symbols-outlined text-success">
                check_circle
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {pythonEnv.virtualEnv.name}
                </p>
                <p className="text-xs text-text-tertiary">
                  活跃的 {pythonEnv.virtualEnv.type} 虚拟环境
                </p>
              </div>
            </div>
          )}

          {/* 建议列表 */}
          {pythonEnv.recommendations.length > 0 && (
            <div className="mt-4 p-4 bg-warning/5 border border-warning/20 rounded-lg">
              <p className="text-sm font-medium text-warning mb-2">建议</p>
              <ul className="text-xs text-text-secondary space-y-1">
                {pythonEnv.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-xs text-warning mt-0.5">
                      arrow_right
                    </span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 安装引导 */}
          {!pythonEnv.pythonInstalled && installGuide && (
            <div className="mt-4 p-4 bg-bg-tertiary rounded-lg">
              <p className="text-sm font-medium text-text-primary mb-3">
                安装方式
              </p>
              <div className="space-y-2">
                {installGuide.methods.map((method, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg hover:bg-bg-hover cursor-pointer transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        method.recommended
                          ? "bg-primary/10 text-primary"
                          : "bg-bg-tertiary text-text-tertiary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        download
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {method.name}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {method.description}
                      </p>
                    </div>
                    {method.recommended && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
                        推荐
                      </span>
                    )}
                    {method.url && (
                      <span className="material-symbols-outlined text-text-tertiary">
                        open_in_new
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-8 text-text-tertiary">
          点击"重新检测"按钮检测 Python 环境
        </div>
      )}
    </div>
  );

  // 渲染 Python 服务管理卡片
  const renderPythonServiceCard = () => {
    const statusColors: Record<string, string> = {
      stopped: "bg-text-tertiary",
      starting: "bg-warning animate-pulse",
      running: "bg-success",
      stopping: "bg-warning animate-pulse",
      error: "bg-error",
    };

    const statusTexts: Record<string, string> = {
      stopped: "已停止",
      starting: "启动中",
      running: "运行中",
      stopping: "停止中",
      error: "错误",
    };

    const isRunning = serviceInfo?.status === "running";
    const isStopped =
      serviceInfo?.status === "stopped" || serviceInfo?.status === "error";

    return (
      <div className="p-6 bg-bg-secondary border border-border rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-500">
                smart_toy
              </span>
            </div>
            <div>
              <h3 className="font-bold text-text-primary">Python 智能体服务</h3>
              <p className="text-xs text-text-tertiary">
                管理 AI 智能体 Python 后端
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                statusColors[serviceInfo?.status || "stopped"]
              }`}
            ></span>
            <span className="text-xs text-text-secondary">
              {statusTexts[serviceInfo?.status || "stopped"]}
            </span>
          </div>
        </div>

        {/* 服务信息 */}
        {serviceInfo && (
          <div className="space-y-3 mb-6">
            {serviceInfo.pid && (
              <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                <span className="text-xs text-text-tertiary">进程 ID</span>
                <span className="text-sm font-medium text-text-primary">
                  {serviceInfo.pid}
                </span>
              </div>
            )}
            {serviceInfo.port && (
              <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                <span className="text-xs text-text-tertiary">服务端口</span>
                <span className="text-sm font-medium text-text-primary">
                  {serviceInfo.port}
                </span>
              </div>
            )}
            {serviceInfo.uptime !== null && (
              <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                <span className="text-xs text-text-tertiary">运行时长</span>
                <span className="text-sm font-medium text-text-primary">
                  {Math.floor(serviceInfo.uptime / 60)}分{" "}
                  {serviceInfo.uptime % 60}秒
                </span>
              </div>
            )}
            {serviceInfo.lastError && (
              <div className="p-3 bg-error/5 border border-error/20 rounded-lg">
                <p className="text-xs text-error">{serviceInfo.lastError}</p>
              </div>
            )}
          </div>
        )}

        {/* 端口配置 */}
        <div className="mb-6">
          <label className="text-xs text-text-tertiary mb-2 block">
            服务端口
          </label>
          <input
            type="number"
            className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2 text-sm text-text-primary outline-none focus:border-primary"
            value={serviceConfig.port || 8765}
            onChange={(e) =>
              setServiceConfig({
                ...serviceConfig,
                port: parseInt(e.target.value) || 8765,
              })
            }
            disabled={isRunning}
            placeholder="8765"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-3">
          {isStopped ? (
            <button
              className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              onClick={handleStartService}
              disabled={serviceLoading || !pythonEnv?.meetsRequirements}
            >
              {serviceLoading ? (
                <Spin size="small" />
              ) : (
                <span className="material-symbols-outlined text-base">
                  play_arrow
                </span>
              )}
              启动服务
            </button>
          ) : (
            <>
              <button
                className="flex-1 py-3 bg-error hover:bg-error/80 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={handleStopService}
                disabled={serviceLoading}
              >
                {serviceLoading ? (
                  <Spin size="small" />
                ) : (
                  <span className="material-symbols-outlined text-base">
                    stop
                  </span>
                )}
                停止
              </button>
              <button
                className="flex-1 py-3 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={handleRestartService}
                disabled={serviceLoading}
              >
                {serviceLoading ? (
                  <Spin size="small" />
                ) : (
                  <span className="material-symbols-outlined text-base">
                    refresh
                  </span>
                )}
                重启
              </button>
            </>
          )}
        </div>

        {/* 最近日志 */}
        {serviceInfo?.recentLogs && serviceInfo.recentLogs.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-tertiary">最近日志</span>
              <span className="text-xs text-text-tertiary">
                {serviceInfo.recentLogs.length} 条
              </span>
            </div>
            <div className="bg-bg-tertiary rounded-lg p-3 max-h-32 overflow-y-auto custom-scrollbar">
              {serviceInfo.recentLogs.slice(-5).map((log, index) => (
                <div key={index} className="text-xs mb-1 last:mb-0">
                  <span
                    className={
                      log.level === "error"
                        ? "text-error"
                        : log.level === "warn"
                        ? "text-warning"
                        : "text-text-tertiary"
                    }
                  >
                    [{log.level.toUpperCase()}]
                  </span>{" "}
                  <span className="text-text-secondary">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 提示 */}
        {!pythonEnv?.meetsRequirements && (
          <div className="mt-4 p-3 bg-warning/5 border border-warning/20 rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-warning text-sm">
              warning
            </span>
            <span className="text-xs text-warning">
              Python 环境不满足要求，请先安装 Python 3.9+
            </span>
          </div>
        )}
      </div>
    );
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
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-5xl mx-auto px-4 py-8 pb-32">
        <div className="space-y-10">
          {/* Python 环境检测 */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary">
                memory
              </span>
              <h2 className="text-xl font-bold text-text-primary">运行环境</h2>
            </div>
            {renderPythonEnvCard()}
          </section>

          {/* Python 服务管理 */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary">
                smart_toy
              </span>
              <h2 className="text-xl font-bold text-text-primary">
                智能体服务
              </h2>
            </div>
            {renderPythonServiceCard()}
          </section>

          {/* 在线 API 接入 */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary">
                cloud_done
              </span>
              <h2 className="text-xl font-bold text-text-primary">
                在线 API 接入
              </h2>
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
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${getIconColorClass(
                          model.iconColor
                        )}`}
                      >
                        <span className="material-symbols-outlined">
                          {model.icon}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-text-primary">
                          {model.name}
                        </h3>
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
                              handleConfigChange(
                                model.id,
                                field.key,
                                e.target.value
                              )
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
                                handleConfigChange(
                                  model.id,
                                  field.key,
                                  e.target.value
                                )
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
                              handleConfigChange(
                                model.id,
                                field.key,
                                e.target.value
                              )
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
              <span className="material-symbols-outlined text-primary">
                dns
              </span>
              <h2 className="text-xl font-bold text-text-primary">
                本地模型接入
              </h2>
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
                    onChange={(e) =>
                      handleLocalConfigChange("host", e.target.value)
                    }
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
                    onChange={(e) =>
                      handleLocalConfigChange("port", e.target.value)
                    }
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
                      onChange={(e) =>
                        handleLocalConfigChange("model", e.target.value)
                      }
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
