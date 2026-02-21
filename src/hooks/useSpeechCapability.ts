/**
 * useSpeechCapability - 语音能力检测 Hook
 * 检测系统是否支持 Web Speech API 和麦克风权限
 * 
 * 支持平台：macOS、Windows（Electron Chromium 内核）
 */
import { useState, useEffect, useCallback } from "react";

export interface SpeechCapability {
  /** 是否支持语音识别 */
  isSupported: boolean;
  /** 是否有麦克风权限 */
  hasPermission: boolean | null;
  /** 是否正在请求权限 */
  isRequestingPermission: boolean;
  /** 请求麦克风权限 */
  requestPermission: () => Promise<boolean>;
  /** 错误信息 */
  error: string | null;
}

/**
 * 检测 Web Speech API 是否可用
 */
const checkSpeechSupport = (): boolean => {
  // 检测浏览器是否支持 SpeechRecognition API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

  return !!SpeechRecognition;
};

/**
 * 使用 Electron API 获取麦克风权限状态
 */
const getElectronMicrophoneStatus = async (): Promise<string> => {
  if (window.electronAPI?.getMicrophoneAccessStatus) {
    try {
      return await window.electronAPI.getMicrophoneAccessStatus();
    } catch (error) {
      console.error("[SpeechCapability] 获取 Electron 麦克风权限状态失败:", error);
      return "unknown";
    }
  }
  return "unknown";
};

/**
 * 使用 Electron API 请求麦克风权限
 */
const askElectronMicrophoneAccess = async (): Promise<boolean> => {
  if (window.electronAPI?.askMicrophoneAccess) {
    try {
      console.log("[SpeechCapability] 通过 Electron API 请求麦克风权限");
      return await window.electronAPI.askMicrophoneAccess();
    } catch (error) {
      console.error("[SpeechCapability] Electron API 请求麦克风权限失败:", error);
      return false;
    }
  }
  return false;
};

/**
 * 语音能力检测 Hook
 * @returns SpeechCapability 语音能力状态和方法
 */
export const useSpeechCapability = (): SpeechCapability => {
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初始化检测
  useEffect(() => {
    const supported = checkSpeechSupport();
    setIsSupported(supported);
    console.log("[SpeechCapability] Web Speech API 支持:", supported);

    if (supported) {
      // 检测麦克风权限（优先使用 Electron API）
      getElectronMicrophoneStatus().then((status) => {
        console.log("[SpeechCapability] Electron 麦克风权限状态:", status);
        if (status === "granted") {
          setHasPermission(true);
        } else if (status === "denied" || status === "restricted") {
          setHasPermission(false);
        } else {
          // not-determined 或 unknown，尝试通过浏览器 API 检测
          checkBrowserMicrophonePermission().then(setHasPermission);
        }
      });
    }
  }, []);

  /**
   * 请求麦克风权限
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("当前环境不支持语音识别");
      return false;
    }

    setIsRequestingPermission(true);
    setError(null);
    console.log("[SpeechCapability] 开始请求麦克风权限...");

    try {
      // 首先尝试使用 Electron API（macOS）
      const electronGranted = await askElectronMicrophoneAccess();
      console.log("[SpeechCapability] Electron API 权限结果:", electronGranted);
      
      if (electronGranted) {
        setHasPermission(true);
        setIsRequestingPermission(false);
        return true;
      }

      // 如果 Electron API 不可用或失败，尝试浏览器 API
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 权限获取成功，立即释放媒体流
      stream.getTracks().forEach((track) => track.stop());
      
      setHasPermission(true);
      setIsRequestingPermission(false);
      console.log("[SpeechCapability] 浏览器 API 权限获取成功");
      return true;
    } catch (err) {
      setIsRequestingPermission(false);
      
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setError("麦克风权限被拒绝，请在系统设置中允许访问麦克风");
          setHasPermission(false);
        } else if (err.name === "NotFoundError") {
          setError("未检测到麦克风设备");
          setHasPermission(false);
        } else {
          setError(`获取麦克风权限失败: ${err.message}`);
        }
      } else {
        setError("获取麦克风权限失败");
      }
      
      console.error("[SpeechCapability] 权限请求失败:", err);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    hasPermission,
    isRequestingPermission,
    requestPermission,
    error,
  };
};

/**
 * 检测浏览器麦克风权限状态
 */
const checkBrowserMicrophonePermission = async (): Promise<boolean | null> => {
  // 尝试使用 Permissions API 查询权限状态
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (result.state === "granted") {
        return true;
      } else if (result.state === "denied") {
        return false;
      }
      // prompt 状态返回 null，表示需要请求权限
      return null;
    } catch {
      // Permissions API 不支持 microphone 查询，返回 null
      return null;
    }
  }
  return null;
};

export default useSpeechCapability;
