/**
 * 智能体管理 Hook
 *
 * 提供智能体的 CRUD 操作和状态管理。
 */

import { useState, useCallback, useEffect } from "react";
import type {
  AgentConfig,
  CreateAgentInput,
  UpdateAgentInput,
  AgentListResponse,
  AgentResponse,
} from "@/types/agent";

interface UseAgentsReturn {
  // 状态
  agents: AgentConfig[];
  loading: boolean;
  error: string | null;

  // 操作
  fetchAgents: () => Promise<void>;
  getAgent: (id: string) => Promise<AgentConfig | null>;
  createAgent: (input: CreateAgentInput) => Promise<AgentConfig | null>;
  updateAgent: (
    id: string,
    input: UpdateAgentInput
  ) => Promise<AgentConfig | null>;
  deleteAgent: (id: string) => Promise<boolean>;
  duplicateAgent: (id: string) => Promise<AgentConfig | null>;
}

/**
 * 智能体管理 Hook
 */
export function useAgents(): UseAgentsReturn {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取智能体列表
  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: AgentListResponse = await window.electronAPI.agentList();
      if (response.success) {
        setAgents(response.data);
      } else {
        setError(response.error || "获取智能体列表失败");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取单个智能体
  const getAgent = useCallback(
    async (id: string): Promise<AgentConfig | null> => {
      try {
        const response: AgentResponse = await window.electronAPI.agentGet(id);
        return response.success ? response.data || null : null;
      } catch (err) {
        console.error("获取智能体失败:", err);
        return null;
      }
    },
    []
  );

  // 创建智能体
  const createAgent = useCallback(
    async (input: CreateAgentInput): Promise<AgentConfig | null> => {
      setLoading(true);
      setError(null);

      try {
        const response: AgentResponse =
          await window.electronAPI.agentCreate(input);
        if (response.success && response.data) {
          // 刷新列表
          await fetchAgents();
          return response.data;
        } else {
          setError(response.error || "创建智能体失败");
          return null;
        }
      } catch (err) {
        setError(String(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchAgents]
  );

  // 更新智能体
  const updateAgent = useCallback(
    async (
      id: string,
      input: UpdateAgentInput
    ): Promise<AgentConfig | null> => {
      setLoading(true);
      setError(null);

      try {
        const response: AgentResponse = await window.electronAPI.agentUpdate(
          id,
          input
        );
        if (response.success && response.data) {
          // 更新本地状态
          setAgents((prev) =>
            prev.map((agent) => (agent.id === id ? response.data! : agent))
          );
          return response.data;
        } else {
          setError(response.error || "更新智能体失败");
          return null;
        }
      } catch (err) {
        setError(String(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 删除智能体
  const deleteAgent = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await window.electronAPI.agentDelete(id);
      if (response.success) {
        // 从本地状态移除
        setAgents((prev) => prev.filter((agent) => agent.id !== id));
        return true;
      } else {
        setError(response.error || "删除智能体失败");
        return false;
      }
    } catch (err) {
      setError(String(err));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 复制智能体
  const duplicateAgent = useCallback(
    async (id: string): Promise<AgentConfig | null> => {
      setLoading(true);
      setError(null);

      try {
        const response: AgentResponse =
          await window.electronAPI.agentDuplicate(id);
        if (response.success && response.data) {
          // 刷新列表
          await fetchAgents();
          return response.data;
        } else {
          setError(response.error || "复制智能体失败");
          return null;
        }
      } catch (err) {
        setError(String(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchAgents]
  );

  // 初始化时获取列表
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    loading,
    error,
    fetchAgents,
    getAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    duplicateAgent,
  };
}

export default useAgents;
