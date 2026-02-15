/**
 * GeneralSettings 常规设置组件
 * 包含主题切换等基础设置
 */
import React from "react";
import { useTheme } from "@/contexts";

const GeneralSettings: React.FC = () => {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">常规设置</h2>
        <p className="text-text-tertiary text-sm">自定义您的工作站基础偏好</p>
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
};

export { GeneralSettings };
