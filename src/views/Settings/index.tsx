/**
 * Settings 设置页面
 * 包含常规设置、个人信息、AI设置、存储管理、关于
 * 各模块独立组件，通过侧边栏导航切换
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// 导入独立的设置组件
import { GeneralSettings } from "./GeneralSettings";
import { ProfileSettings } from "./ProfileSettings";
import { StorageSettings } from "./StorageSettings";
import { AboutSettings } from "./AboutSettings";

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("general");

  // 侧边栏菜单项
  const menuItems = [
    { key: "general", icon: "settings", label: "常规设置" },
    { key: "profile", icon: "person", label: "个人信息" },
    { key: "ai", icon: "memory", label: "AI 设置" },
    { key: "storage", icon: "database", label: "存储管理" },
    { key: "about", icon: "info", label: "关于" },
  ];

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

  // 渲染当前选中区域的内容
  const renderContent = () => {
    switch (activeSection) {
      case "general":
        return <GeneralSettings />;
      case "profile":
        return <ProfileSettings />;
      case "ai":
        return renderAISettings();
      case "storage":
        return <StorageSettings />;
      case "about":
        return <AboutSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* 侧边栏 */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-bg-secondary flex flex-col">
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
