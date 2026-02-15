/**
 * AboutSettings 关于页面设置组件
 * 包含软件版本信息和更新检查
 */
import React from "react";

const AboutSettings: React.FC = () => {
  // 从 package.json 获取版本号（实际项目中可以通过 electron API 获取）
  const version = "0.4.5";

  return (
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
                v{version}
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
};

export { AboutSettings };
