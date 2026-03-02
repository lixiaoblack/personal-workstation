/**
 * 智能体管理页面
 *
 * 功能：
 * 1. 展示智能体列表
 * 2. 创建/编辑/删除/复制智能体
 * 3. 快速开始对话
 */
import React, { useState, useCallback } from "react";
import { Button, Empty, Spin, Input, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAgents } from "@/hooks/useAgents";
import { AgentCard } from "./components";
import type { AgentConfig } from "@/types/agent";
import "./index.sass";

const AgentsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    agents,
    loading,
    error,
    fetchAgents,
    deleteAgent,
    duplicateAgent,
  } = useAgents();

  // 搜索关键词
  const [searchKeyword, setSearchKeyword] = useState("");

  // 过滤智能体列表
  const filteredAgents = agents.filter(
    (agent) =>
      !searchKeyword ||
      agent.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (agent.description?.toLowerCase().includes(searchKeyword.toLowerCase()))
  );

  // 点击智能体卡片 - 进入对话
  const handleClickAgent = useCallback(
    (agent: AgentConfig) => {
      navigate(`/agents/${agent.id}/chat`);
    },
    [navigate]
  );

  // 编辑智能体
  const handleEditAgent = useCallback(
    (agent: AgentConfig) => {
      navigate(`/agents/${agent.id}/edit`);
    },
    [navigate]
  );

  // 删除智能体
  const handleDeleteAgent = useCallback(
    async (agent: AgentConfig) => {
      const success = await deleteAgent(agent.id);
      if (success) {
        message.success("智能体已删除");
      } else {
        message.error("删除失败");
      }
    },
    [deleteAgent]
  );

  // 复制智能体
  const handleDuplicateAgent = useCallback(
    async (agent: AgentConfig) => {
      const result = await duplicateAgent(agent.id);
      if (result) {
        message.success("智能体已复制");
      } else {
        message.error("复制失败");
      }
    },
    [duplicateAgent]
  );

  // 创建新智能体
  const handleCreateAgent = useCallback(() => {
    navigate("/agents/create");
  }, [navigate]);

  // 刷新列表
  const handleRefresh = useCallback(() => {
    fetchAgents();
  }, [fetchAgents]);

  return (
    <div className="agents-page h-full flex flex-col">
      {/* 头部 */}
      <div className="agents-header flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-text-primary">智能体</h1>
          <span className="text-sm text-text-tertiary">
            共 {agents.length} 个
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* 搜索框 */}
          <Input
            placeholder="搜索智能体..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-48"
            allowClear
          />

          {/* 刷新按钮 */}
          <Button
            icon={<span className="material-symbols-outlined text-sm">refresh</span>}
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>

          {/* 创建按钮 */}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateAgent}
          >
            创建智能体
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="agents-content flex-1 overflow-auto p-6">
        {/* 加载状态 */}
        {loading && agents.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <Spin size="large" />
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <span className="text-error">{error}</span>
            <Button onClick={handleRefresh}>重试</Button>
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && filteredAgents.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <Empty
              description={
                searchKeyword ? "未找到匹配的智能体" : "暂无智能体，点击创建"
              }
            >
              {!searchKeyword && (
                <Button type="primary" onClick={handleCreateAgent}>
                  创建智能体
                </Button>
              )}
            </Empty>
          </div>
        )}

        {/* 智能体列表 */}
        {filteredAgents.length > 0 && (
          <div className="agents-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onClick={handleClickAgent}
                onEdit={handleEditAgent}
                onDelete={handleDeleteAgent}
                onDuplicate={handleDuplicateAgent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentsPage;
