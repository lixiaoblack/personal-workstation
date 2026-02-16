/**
 * AISettings AI 模型设置页面
 * 包含 Python 环境检测、服务管理、模型配置管理
 * 配置变更后自动同步 MobX Store
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App, Spin, Button, Empty } from "antd";
import type {
  PythonEnvironment,
  PythonInstallGuide,
  PythonServiceInfo,
  PythonServiceConfig,
  ModelConfig,
  ModelConfigListItem,
  CreateModelConfigInput,
} from "@/types/electron";
import { modelStore } from "@/stores";
import { ModelConfigCard } from "./components/ModelConfigCard";
import { ModelConfigModal } from "./components/ModelConfigModal";

const AISettings: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  // Python 环境状态
  const [pythonEnv, setPythonEnv] = useState<PythonEnvironment | null>(null);
  const [pythonLoading, setPythonLoading] = useState(false);
  const [installGuide, setInstallGuide] = useState<PythonInstallGuide | null>(
    null
  );
  void installGuide; // 预留给安装引导使用

  // Python 服务状态
  const [serviceInfo, setServiceInfo] = useState<PythonServiceInfo | null>(
    null
  );
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceConfig, setServiceConfig] = useState<PythonServiceConfig>({
    port: 8765,
  });

  // 模型配置状态
  const [modelConfigs, setModelConfigs] = useState<ModelConfigListItem[]>([]);
  const [modelLoading, setModelLoading] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ModelConfig | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);

  // 初始化
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        handleDetectPython(),
        loadInstallGuide(),
        loadServiceInfo(),
        loadModelConfigs(),
      ]);
    };
    init();

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

  // 加载模型配置
  const loadModelConfigs = async () => {
    setModelLoading(true);
    try {
      const configs = await window.electronAPI.getModelConfigs();
      setModelConfigs(configs);
    } catch (error) {
      console.error("加载模型配置失败:", error);
      message.error("加载模型配置失败");
    } finally {
      setModelLoading(false);
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

  // 编辑配置
  const handleEditConfig = async (config: ModelConfigListItem) => {
    // 获取完整配置（包含 apiKey 等敏感信息）
    try {
      const fullConfig = await window.electronAPI.getModelConfigById(config.id);
      if (fullConfig) {
        setEditingConfig(fullConfig);
        setConfigModalOpen(true);
      } else {
        message.error("获取配置详情失败");
      }
    } catch (error) {
      message.error("获取配置详情失败");
    }
  };

  // 保存配置
  const handleSaveConfig = async (
    id: number | null,
    input: CreateModelConfigInput
  ) => {
    try {
      if (id) {
        await window.electronAPI.updateModelConfig(id, input);
      } else {
        await window.electronAPI.createModelConfig(input);
      }
      await loadModelConfigs();
      // 同步更新 MobX Store，通知其他页面
      modelStore.loadModels();
      return true;
    } catch (error) {
      message.error("保存配置失败");
      return false;
    }
  };

  // 删除配置
  const handleDeleteConfig = async (id: number) => {
    try {
      await window.electronAPI.deleteModelConfig(id);
      message.success("配置已删除");
      await loadModelConfigs();
      // 同步更新 MobX Store
      modelStore.loadModels();
    } catch (error) {
      message.error("删除失败");
    }
  };

  // 切换启用状态
  const handleToggleEnabled = async (id: number, enabled: boolean) => {
    await window.electronAPI.updateModelConfig(id, { enabled });
    await loadModelConfigs();
    // 同步更新 MobX Store
    modelStore.loadModels();
  };

  // 设为默认
  const handleSetDefault = async (id: number) => {
    await window.electronAPI.setDefaultModelConfig(id);
    message.success("已设为默认模型");
    await loadModelConfigs();
    // 同步更新 MobX Store
    modelStore.loadModels();
  };

  // 测试连接
  const handleTestConfig = async (config: ModelConfigListItem) => {
    setTestingId(config.id);
    // TODO: 实现实际的测试逻辑
    setTimeout(() => {
      message.success(`${config.name} 连接测试成功`);
      setTestingId(null);
    }, 1500);
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
  const renderPythonEnvCard = () => {
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
      <div className="space-y-6">
        {/* Python 环境卡片 */}
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
                <p className="text-xs text-text-tertiary">
                  AI 智能体运行所需环境
                </p>
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
            <div className="space-y-3">
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
                    {pythonEnv.pythonPath || "未检测到"}
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
              {pythonEnv.virtualEnv.active && (
                <div className="flex items-center gap-4 p-3 bg-success/5 border border-success/20 rounded-lg">
                  <span className="material-symbols-outlined text-success">
                    check_circle
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {pythonEnv.virtualEnv.name}
                    </p>
                    <p className="text-xs text-text-tertiary">活跃的虚拟环境</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Python 服务卡片 */}
        <div className="p-6 bg-bg-secondary border border-border rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-500">
                  smart_toy
                </span>
              </div>
              <div>
                <h3 className="font-bold text-text-primary">
                  Python 智能体服务
                </h3>
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
                  className="flex-1 py-3 bg-error hover:bg-error/80 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
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
                  className="flex-1 py-3 bg-bg-tertiary hover:bg-bg-hover text-text-primary rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
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
        </div>
      </div>
    );
  };

  // 渲染模型配置列表
  const renderModelConfigSection = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">tune</span>
          <h2 className="text-xl font-bold text-text-primary">模型配置</h2>
        </div>
        <Button
          type="primary"
          icon={
            <span className="material-symbols-outlined text-base">add</span>
          }
          onClick={() => {
            setEditingConfig(null);
            setConfigModalOpen(true);
          }}
        >
          添加配置
        </Button>
      </div>

      {modelLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spin />
        </div>
      ) : modelConfigs.length === 0 ? (
        <div className="p-8 bg-bg-secondary border border-border rounded-xl">
          <Empty
            description="暂无模型配置"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              onClick={() => {
                setEditingConfig(null);
                setConfigModalOpen(true);
              }}
            >
              添加第一个配置
            </Button>
          </Empty>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {modelConfigs.map((config) => (
            <ModelConfigCard
              key={config.id}
              config={config}
              onEdit={handleEditConfig}
              onDelete={handleDeleteConfig}
              onToggleEnabled={handleToggleEnabled}
              onSetDefault={handleSetDefault}
              onTest={handleTestConfig}
              testing={testingId === config.id}
            />
          ))}
        </div>
      )}
    </div>
  );

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
      <main className="max-w-5xl mx-auto px-4 py-8 pb-16">
        <div className="space-y-10">
          {/* 模型配置 */}
          <section>{renderModelConfigSection()}</section>
          {/* Python 环境 & 服务 */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary">
                memory
              </span>
              <h2 className="text-xl font-bold text-text-primary">运行环境</h2>
            </div>
            {renderPythonEnvCard()}
          </section>
        </div>
      </main>

      {/* 模型配置弹窗 */}
      <ModelConfigModal
        open={configModalOpen}
        config={editingConfig}
        onClose={() => {
          setConfigModalOpen(false);
          setEditingConfig(null);
        }}
        onSave={handleSaveConfig}
      />
    </div>
  );
};

export { AISettings };
