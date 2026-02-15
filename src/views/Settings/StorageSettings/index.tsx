/**
 * StorageSettings 存储管理设置组件
 * 包含缓存查看和清理功能
 */
import React, { useState, useEffect } from "react";
import type { StorageInfo } from "@/types/electron";

const StorageSettings: React.FC = () => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  // 获取存储信息
  useEffect(() => {
    const fetchStorageInfo = async () => {
      try {
        const info = await window.electronAPI.getStorageInfo();
        setStorageInfo(info);
      } catch (error) {
        console.error("获取存储信息失败:", error);
      }
    };

    fetchStorageInfo();
  }, []);

  // 格式化字节大小
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 清理缓存
  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      const result = await window.electronAPI.clearCache();
      if (result.success) {
        // 刷新存储信息
        const info = await window.electronAPI.getStorageInfo();
        setStorageInfo(info);
      }
    } finally {
      setIsClearing(false);
    }
  };

  const cachePercent = storageInfo
    ? Math.min((storageInfo.cacheSize / storageInfo.totalSize) * 100, 100)
    : 0;

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">存储管理</h2>
        <p className="text-text-tertiary text-sm">
          监控和清理应用占用的磁盘空间
        </p>
      </div>
      <div className="space-y-6">
        {/* 存储概览 */}
        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs font-bold text-text-tertiary uppercase">
                    当前缓存
                  </p>
                  <p className="text-3xl font-black text-text-primary">
                    {storageInfo ? formatBytes(storageInfo.cacheSize) : "--"}
                  </p>
                </div>
                <p className="text-xs text-text-tertiary">
                  总空间占用:{" "}
                  {storageInfo ? formatBytes(storageInfo.totalSize) : "--"}
                </p>
              </div>
              <div className="w-full bg-bg-tertiary h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-500"
                  style={{
                    width: `${cachePercent}%`,
                    boxShadow:
                      cachePercent > 0
                        ? "0 0 10px rgba(60, 131, 246, 0.5)"
                        : "none",
                  }}
                ></div>
              </div>
            </div>
            <button
              className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-8 rounded-lg text-sm transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
              onClick={handleClearCache}
              disabled={
                isClearing || !storageInfo || storageInfo.cacheSize === 0
              }
            >
              {isClearing ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">
                    progress_activity
                  </span>
                  清理中...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">
                    cleaning_services
                  </span>
                  一键清理
                </>
              )}
            </button>
          </div>
        </div>

        {/* 存储详情 */}
        {storageInfo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-primary">
                  database
                </span>
                <span className="text-sm font-medium text-text-primary">
                  数据库
                </span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {formatBytes(storageInfo.dataSize)}
              </p>
            </div>
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-warning">
                  description
                </span>
                <span className="text-sm font-medium text-text-primary">
                  日志
                </span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {formatBytes(storageInfo.logsSize)}
              </p>
            </div>
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-success">
                  folder
                </span>
                <span className="text-sm font-medium text-text-primary">
                  存储路径
                </span>
              </div>
              <p
                className="text-sm text-text-secondary truncate"
                title={storageInfo.cachePath}
              >
                {storageInfo.cachePath}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export { StorageSettings };
