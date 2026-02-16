/**
 * 模型状态管理 Store
 * 使用 MobX 管理模型配置状态，实现跨组件状态同步
 */
import { makeAutoObservable, runInAction } from "mobx";
import type { ModelConfig } from "@/types/electron";

class ModelStore {
  // 已启用的模型列表
  models: ModelConfig[] = [];

  // 当前选中的模型
  currentModel: ModelConfig | null = null;

  // 加载状态
  loading: boolean = false;

  // 最后更新时间
  lastUpdated: number = 0;

  constructor() {
    makeAutoObservable(this);
  }

  /**
   * 设置模型列表
   */
  setModels = (models: ModelConfig[]): void => {
    this.models = models;
    this.lastUpdated = Date.now();

    // 如果当前模型不在列表中，重新选择
    if (this.currentModel) {
      const stillExists = models.find((m) => m.id === this.currentModel?.id);
      if (!stillExists) {
        this.currentModel = this.getDefaultModel(models);
      }
    } else {
      this.currentModel = this.getDefaultModel(models);
    }
  };

  /**
   * 设置当前模型
   */
  setCurrentModel = (model: ModelConfig | null): void => {
    this.currentModel = model;
  };

  /**
   * 设置加载状态
   */
  setLoading = (loading: boolean): void => {
    this.loading = loading;
  };

  /**
   * 从数据库加载模型列表
   */
  loadModels = async (): Promise<void> => {
    this.loading = true;
    try {
      const enabledModels = await window.electronAPI.getEnabledModelConfigs();
      runInAction(() => {
        this.setModels(enabledModels);
      });
    } catch (error) {
      console.error("加载模型配置失败:", error);
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  };

  /**
   * 获取默认模型
   */
  private getDefaultModel = (models: ModelConfig[]): ModelConfig | null => {
    const defaultModel = models.find((m) => m.isDefault);
    if (defaultModel) {
      return defaultModel;
    }
    return models.length > 0 ? models[0] : null;
  };

  /**
   * 根据 ID 获取模型
   */
  getModelById = (id: number): ModelConfig | undefined => {
    return this.models.find((m) => m.id === id);
  };

  /**
   * 清空状态
   */
  clear = (): void => {
    this.models = [];
    this.currentModel = null;
    this.lastUpdated = 0;
  };
}

// 导出单例实例
export const modelStore = new ModelStore();
