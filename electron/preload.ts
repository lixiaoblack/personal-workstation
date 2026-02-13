import { contextBridge, ipcRenderer } from 'electron';

// 通过 contextBridge 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 示例：发送消息到主进程
  send: (channel: string, data: unknown) => {
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  // 示例：接收主进程消息
  receive: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },
});

// 类型声明
export interface ElectronAPI {
  send: (channel: string, data: unknown) => void;
  receive: (channel: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
