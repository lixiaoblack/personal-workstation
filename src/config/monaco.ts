/**
 * Monaco Editor 配置
 * 配置 @monaco-editor/react 使用本地版本，避免从 CDN 加载
 * 支持 Electron 离线环境
 */
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// 导入 worker 文件（Vite 会自动处理）
// @ts-expect-error Vite worker import
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
// @ts-expect-error Vite worker import
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";

/**
 * 配置 Monaco Environment
 * 告诉 Monaco 如何加载 worker 文件
 */
self.MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    if (label === "json") {
      return new jsonWorker();
    }
    return new editorWorker();
  },
};

/**
 * 配置 @monaco-editor/react 的 loader
 * 使用本地安装的 monaco-editor，而不是从 CDN 加载
 */
loader.config({ monaco });

export { monaco };
