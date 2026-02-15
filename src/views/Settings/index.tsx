/**
 * Settings 设置页面
 * 包含常规设置、个人信息、AI设置、存储管理、关于
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts";

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState("general");

  // 侧边栏菜单项
  const menuItems = [
    { key: "general", icon: "settings", label: "常规设置" },
    { key: "profile", icon: "person", label: "个人信息" },
    { key: "ai", icon: "memory", label: "AI 设置" },
    { key: "storage", icon: "database", label: "存储管理" },
    { key: "about", icon: "info", label: "关于" },
  ];

  // 渲染常规设置
  const renderGeneralSettings = () => (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">常规设置</h2>
        <p className="text-text-tertiary text-sm">
          自定义您的工作站基础偏好
        </p>
      </div>
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined">dark_mode</span>
            </div>
            <div>
              <h3 className="font-medium text-text-primary">外观模式</h3>
              <p className="text-xs text-text-tertiary">
                在深色模式和浅色模式之间切换
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              className="sr-only peer"
              type="checkbox"
              checked={resolvedTheme === "dark"}
              onChange={toggleTheme}
            />
            <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>
    </section>
  );

  // 渲染个人信息
  const renderProfileSettings = () => (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">个人信息</h2>
        <p className="text-text-tertiary text-sm">
          管理您的个人资料和账户连接
        </p>
      </div>
      <div className="bg-bg-secondary border border-border rounded-xl p-6 space-y-8">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="size-20 rounded-full border-2 border-border bg-bg-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-text-tertiary">
                person
              </span>
            </div>
            <button className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-white text-xl">
                edit
              </span>
            </button>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-text-primary">个人头像</h3>
            <p className="text-sm text-text-tertiary mb-2">
              建议使用 400x400px 以上的 PNG 或 JPG 图片
            </p>
            <button className="text-xs font-bold text-primary hover:underline">
              更换图片
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
              用户名
            </label>
            <input
              className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all text-text-primary"
              type="text"
              defaultValue="Developer Admin"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
              邮箱绑定
            </label>
            <div className="relative">
              <input
                className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all text-text-primary"
                type="email"
                defaultValue="admin@workstation.pro"
              />
              <span className="absolute right-3 top-2.5 text-[10px] font-bold bg-success/10 text-success px-2 py-1 rounded">
                已验证
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  // 渲染 AI 设置入口
  const renderAISettings = () => (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">AI 设置</h2>
        <p className="text-text-tertiary text-sm">
          配置大语言模型和智能化工作流
        </p>
      </div>
      <button
        className="group w-full text-left bg-bg-secondary border border-border rounded-xl p-6 hover:border-primary/50 transition-all"
        onClick={() => navigate("/settings/ai")}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <span className="material-symbols-outlined">smart_toy</span>
            </div>
            <div>
              <h3 className="font-semibold group-hover:text-primary transition-colors text-text-primary">
                前往高级 AI 配置
              </h3>
              <p className="text-xs text-text-tertiary">
                管理 API 密钥、模型参数和上下文窗口设置
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-text-tertiary group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </div>
      </button>
    </section>
  );

  // 渲染存储管理
  const renderStorageSettings = () => (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">存储管理</h2>
        <p className="text-text-tertiary text-sm">
          监控和清理应用占用的磁盘空间
        </p>
      </div>
      <div className="bg-bg-secondary border border-border rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs font-bold text-text-tertiary uppercase">
                  当前软件缓存
                </p>
                <p className="text-3xl font-black text-text-primary">
                  256
                  <span className="text-lg font-medium text-text-tertiary">
                    MB
                  </span>
                </p>
              </div>
              <p className="text-xs text-text-tertiary">总空间占用: 1.2 GB</p>
            </div>
            <div className="w-full bg-bg-tertiary h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full w-[20%]"
                style={{ boxShadow: "0 0 10px rgba(60, 131, 246, 0.5)" }}
              ></div>
            </div>
          </div>
          <button className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-8 rounded-lg text-sm transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">
              cleaning_services
            </span>
            一键清理
          </button>
        </div>
      </div>
    </section>
  );

  // 渲染关于
  const renderAboutSettings = () => (
    <section className="pb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">关于</h2>
        <p className="text-text-tertiary text-sm">软件版本信息与更新</p>
      </div>
      <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="size-20 bg-bg-tertiary rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-primary">
              terminal
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-1 text-text-primary">
              个人工作站 Pro
            </h3>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
              <span className="px-2 py-0.5 bg-bg-tertiary rounded text-xs font-mono text-text-tertiary tracking-wider">
                v2.4.0
              </span>
              <span className="px-2 py-0.5 bg-primary/10 rounded text-[10px] font-bold text-primary uppercase">
                Latest Stable
              </span>
            </div>
            <p className="text-sm text-text-tertiary leading-relaxed max-w-md">
              下一代开发者生产力工具。集成 AI
              协作、多端同步、自动化工作流，为您打造极致的开发环境。
            </p>
          </div>
          <button className="shrink-0 border border-border hover:border-primary hover:text-primary px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 text-text-secondary">
            <span className="material-symbols-outlined text-lg">update</span>
            检查更新
          </button>
        </div>
      </div>
      <div className="mt-8 text-center">
        <p className="text-[10px] text-text-tertiary font-medium tracking-widest uppercase">
          © 2024 WORKSTATION PRO TEAM • ALL RIGHTS RESERVED
        </p>
      </div>
    </section>
  );

  // 渲染当前选中区域的内容
  const renderContent = () => {
    switch (activeSection) {
      case "general":
        return renderGeneralSettings();
      case "profile":
        return renderProfileSettings();
      case "ai":
        return renderAISettings();
      case "storage":
        return renderStorageSettings();
      case "about":
        return renderAboutSettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* 侧边栏 */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-bg-secondary flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="size-8 bg-primary rounded flex items-center justify-center text-white">
            <span className="material-symbols-outlined">terminal</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-text-primary">
            个人工作站 Pro
          </h1>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.key}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group w-full text-left
                ${
                  activeSection === item.key
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}
              onClick={() => setActiveSection(item.key)}
            >
              <span className="material-symbols-outlined text-[22px]">
                {item.icon}
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto bg-bg-primary p-8 lg:p-12">
        <div className="max-w-3xl mx-auto space-y-12">{renderContent()}</div>
      </main>
    </div>
  );
};

export { Settings };
