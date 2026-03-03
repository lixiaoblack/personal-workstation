/**
 * StorageSettings 存储管理设置组件
 * 包含缓存查看和清理功能
 */
import React, { useState, useEffect } from "react";
import type { StorageInfo, ClearDataResult } from "@/types/electron";
import { Modal, message } from "antd";

const StorageSettings: React.FC = () => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [clearDataModalVisible, setClearDataModalVisible] = useState(false);

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
        message.success("缓存清理成功");
      }
    } finally {
      setIsClearing(false);
    }
  };

  // 打开数据库目录
  const handleOpenDatabaseDir = async () => {
    try {
      await window.electronAPI.openDatabaseDir();
    } catch (error) {
      console.error("打开数据库目录失败:", error);
      message.error("打开数据库目录失败");
    }
  };

  // 打开向量数据库目录
  const handleOpenVectorDbDir = async () => {
    try {
      await window.electronAPI.openVectorDbDir();
    } catch (error) {
      console.error("打开向量数据库目录失败:", error);
      message.error("打开向量数据库目录失败");
    }
  };

  // 清理所有数据（保留用户信息）
  const handleClearAllData = async () => {
    setIsClearingData(true);
    try {
      const result: ClearDataResult = await window.electronAPI.clearAllData();
      if (result.success) {
        // 刷新存储信息
        const info = await window.electronAPI.getStorageInfo();
        setStorageInfo(info);
        const clearedInfo = [];
        if (result.clearedTables.length > 0) {
          clearedInfo.push(`清理了 ${result.clearedTables.length} 个数据表`);
        }
        if (result.clearedVectorDb) {
          clearedInfo.push("向量数据库已清理");
        }
        message.success(`数据清理成功：${clearedInfo.join("，")}`);
      } else {
        message.error(result.error || "数据清理失败");
      }
    } catch (error) {
      console.error("数据清理失败:", error);
      message.error("数据清理失败");
    } finally {
      setIsClearingData(false);
      setClearDataModalVisible(false);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 数据库卡片 - 可点击打开目录 */}
            <div
              className="bg-bg-secondary border border-border rounded-xl p-4 cursor-pointer hover:border-primary transition-colors group"
              onClick={handleOpenDatabaseDir}
              title="点击打开数据库目录"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-primary">
                  database
                </span>
                <span className="text-sm font-medium text-text-primary">
                  数据库
                </span>
                <span className="material-symbols-outlined text-text-tertiary text-sm ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  open_in_new
                </span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {formatBytes(storageInfo.dataSize)}
              </p>
              <p className="text-xs text-text-tertiary mt-1">点击打开目录</p>
            </div>

            {/* 向量数据库卡片 - 可点击打开目录 */}
            <div
              className="bg-bg-secondary border border-border rounded-xl p-4 cursor-pointer hover:border-primary transition-colors group"
              onClick={handleOpenVectorDbDir}
              title="点击打开向量数据库目录"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-success">
                  hub
                </span>
                <span className="text-sm font-medium text-text-primary">
                  向量数据库
                </span>
                <span className="material-symbols-outlined text-text-tertiary text-sm ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  open_in_new
                </span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {formatBytes(storageInfo.vectorDbSize || 0)}
              </p>
              <p className="text-xs text-text-tertiary mt-1">点击打开目录</p>
            </div>

            {/* 日志卡片 */}
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

            {/* 存储路径卡片 */}
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-error">
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

        {/* 数据清洗区域 */}
        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-1">
                数据清洗
              </h3>
              <p className="text-sm text-text-tertiary">
                清除所有数据（对话记录、知识库、待办等），仅保留用户登录信息
              </p>
            </div>
            <button
              className="bg-error hover:bg-red-600 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              onClick={() => setClearDataModalVisible(true)}
              disabled={isClearingData}
            >
              {isClearingData ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">
                    progress_activity
                  </span>
                  清洗中...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">
                    delete_sweep
                  </span>
                  数据清洗
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 数据清洗确认弹窗 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-error">
              warning
            </span>
            <span>确认数据清洗</span>
          </div>
        }
        open={clearDataModalVisible}
        onCancel={() => setClearDataModalVisible(false)}
        onOk={handleClearAllData}
        confirmLoading={isClearingData}
        okText="确认清洗"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <div className="py-4">
          <p className="text-text-primary mb-4">
            此操作将清除以下数据，且
            <span className="text-error font-bold">无法恢复</span>：
          </p>
          <ul className="list-disc list-inside text-text-secondary space-y-2">
            <li>所有对话记录和消息</li>
            <li>知识库及其文档</li>
            <li>待办事项和分类</li>
            <li>笔记数据</li>
            <li>向量数据库</li>
            <li>记忆和摘要数据</li>
          </ul>
          <p className="text-text-primary mt-4">
            <span className="text-success font-bold">保留：</span>
            用户登录信息和配置
          </p>
        </div>
      </Modal>
    </section>
  );
};

export { StorageSettings };
