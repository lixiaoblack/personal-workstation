/**
 * 智能体创建/编辑页面
 *
 * 功能：
 * 1. 基础配置（名称、描述、头像、模型）
 * 2. 提示词编辑
 * 3. 工具选择
 * 4. 知识库绑定
 * 5. 高级参数配置
 */
import React, { useState, useEffect, useCallback } from "react";
import { Button, message, Spin, Tabs } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { useAgents } from "@/hooks/useAgents";
import type { CreateAgentInput, UpdateAgentInput } from "@/types/agent";
import { DEFAULT_AGENT_PARAMETERS } from "../config";
import {
  BasicConfig,
  PromptEditor,
  ToolSelector,
  KnowledgeBinder,
  AdvancedConfig,
  WorkflowSelector,
} from "./components";
import type { BasicConfigValue } from "./components/BasicConfig";
import type { PromptEditorValue } from "./components/PromptEditor";
import type { ToolSelectorValue } from "./components/ToolSelector";
import type { KnowledgeBinderValue } from "./components/KnowledgeBinder";
import type { AdvancedConfigValue } from "./components/AdvancedConfig";
import type { WorkflowSelectorValue } from "./components/WorkflowSelector";
import "./AgentBuilder.sass";

const AgentBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getAgent, createAgent, updateAgent } = useAgents();

  // 是否为编辑模式
  const isEditMode = Boolean(id);

  // 加载状态
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 表单数据
  const [formData, setFormData] = useState<CreateAgentInput>({
    name: "",
    description: "",
    avatar: "🤖",
    model_id: undefined,
    model_name: undefined,
    system_prompt: "",
    tools: [],
    knowledge_ids: [],
    skills: [],
    parameters: DEFAULT_AGENT_PARAMETERS,
    workflow_id: undefined,
  });

  // 可用模型列表
  const [models, setModels] = useState<
    Array<{ id: number; name: string; modelId: string }>
  >([]);

  // 加载智能体数据（编辑模式）
  const loadAgentData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const agent = await getAgent(id);
      if (agent) {
        setFormData({
          name: agent.name,
          description: agent.description || "",
          avatar: agent.avatar || "🤖",
          model_id: agent.model_id ?? undefined,
          model_name: agent.model_name ?? undefined,
          system_prompt: agent.system_prompt || "",
          tools: agent.tools || [],
          knowledge_ids: agent.knowledge_ids || [],
          skills: agent.skills || [],
          parameters: agent.parameters || DEFAULT_AGENT_PARAMETERS,
          workflow_id: agent.workflow_id ?? undefined,
        });
      } else {
        message.error("智能体不存在");
        navigate("/agents");
      }
    } catch (error) {
      console.error("加载智能体失败:", error);
      message.error("加载智能体失败");
      navigate("/agents");
    } finally {
      setLoading(false);
    }
  }, [id, getAgent, navigate]);

  // 加载模型列表
  const loadModels = useCallback(async () => {
    try {
      const configs = await window.electronAPI.getEnabledModelConfigs();
      const chatModels = configs.filter((c) => c.usageType === "llm");
      setModels(
        chatModels.map((m) => ({
          id: m.id,
          name: m.name,
          modelId: m.modelId,
        }))
      );
    } catch (error) {
      console.error("加载模型列表失败:", error);
    }
  }, []);

  // 初始化
  useEffect(() => {
    loadModels();
    if (isEditMode) {
      loadAgentData();
    }
  }, [isEditMode, loadAgentData, loadModels]);

  // 更新基础配置
  const handleBasicConfigChange = (value: BasicConfigValue) => {
    setFormData((prev) => ({
      ...prev,
      name: value.name,
      description: value.description,
      avatar: value.avatar,
      model_id: value.model_id,
      model_name: value.model_name,
    }));
  };

  // 更新提示词
  const handlePromptEditorChange = (value: PromptEditorValue) => {
    setFormData((prev) => ({
      ...prev,
      system_prompt: value.system_prompt,
    }));
  };

  // 更新工具选择
  const handleToolSelectorChange = (value: ToolSelectorValue) => {
    setFormData((prev) => ({
      ...prev,
      tools: value.tools,
    }));
  };

  // 更新知识库绑定
  const handleKnowledgeBinderChange = (value: KnowledgeBinderValue) => {
    setFormData((prev) => ({
      ...prev,
      knowledge_ids: value.knowledge_ids,
    }));
  };

  // 更新工作流选择
  const handleWorkflowSelectorChange = (value: WorkflowSelectorValue) => {
    setFormData((prev) => ({
      ...prev,
      workflow_id: value.workflow_id || undefined,
    }));
  };

  // 更新高级配置
  const handleAdvancedConfigChange = (value: AdvancedConfigValue) => {
    setFormData((prev) => ({
      ...prev,
      parameters: {
        ...value.parameters,
        opening_message: value.opening_message,
      },
    }));
  };

  // 保存智能体
  const handleSave = async () => {
    // 验证
    if (!formData.name.trim()) {
      message.error("请输入智能体名称");
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && id) {
        // 编辑模式
        const updateInput: UpdateAgentInput = {
          name: formData.name,
          description: formData.description,
          avatar: formData.avatar,
          model_id: formData.model_id,
          model_name: formData.model_name,
          system_prompt: formData.system_prompt,
          tools: formData.tools,
          knowledge_ids: formData.knowledge_ids,
          skills: formData.skills,
          parameters: formData.parameters,
          workflow_id: formData.workflow_id,
        };
        const result = await updateAgent(id, updateInput);
        if (result) {
          message.success("保存成功");
          navigate("/agents");
        } else {
          message.error("保存失败");
        }
      } else {
        // 创建模式
        const result = await createAgent(formData);
        if (result) {
          message.success("创建成功");
          navigate("/agents");
        } else {
          message.error("创建失败");
        }
      }
    } catch (error) {
      console.error("保存智能体失败:", error);
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  // 返回列表
  const handleBack = () => {
    navigate("/agents");
  };

  // Tab 配置
  const tabItems = [
    {
      key: "basic",
      label: (
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">tune</span>
          基础配置
        </span>
      ),
      children: (
        <div className="space-y-4">
          <BasicConfig
            value={{
              name: formData.name,
              description: formData.description || "",
              avatar: formData.avatar || "🤖",
              model_id: formData.model_id,
              model_name: formData.model_name,
            }}
            onChange={handleBasicConfigChange}
            models={models}
          />
          <PromptEditor
            value={{ system_prompt: formData.system_prompt || "" }}
            onChange={handlePromptEditorChange}
          />
        </div>
      ),
    },
    {
      key: "tools",
      label: (
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">build</span>
          工具与知识库
        </span>
      ),
      children: (
        <div className="space-y-4">
          <WorkflowSelector
            value={{ workflow_id: formData.workflow_id || null }}
            onChange={handleWorkflowSelectorChange}
          />
          <ToolSelector
            value={{ tools: formData.tools || [] }}
            onChange={handleToolSelectorChange}
          />
          <KnowledgeBinder
            value={{ knowledge_ids: formData.knowledge_ids || [] }}
            onChange={handleKnowledgeBinderChange}
          />
        </div>
      ),
    },
    {
      key: "advanced",
      label: (
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">settings</span>
          高级配置
        </span>
      ),
      children: (
        <AdvancedConfig
          value={{
            parameters: {
              temperature: (formData.parameters?.temperature as number) ?? 0.7,
              max_tokens: (formData.parameters?.max_tokens as number) ?? 4096,
              top_p: (formData.parameters?.top_p as number) ?? 1,
            },
            opening_message:
              (formData.parameters?.opening_message as string) || "",
          }}
          onChange={handleAdvancedConfigChange}
        />
      ),
    },
  ];

  return (
    <div className="agent-builder h-full flex flex-col">
      {/* 头部 */}
      <div className="agent-builder-header flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Button
            type="text"
            icon={<span className="material-symbols-outlined">arrow_back</span>}
            onClick={handleBack}
          >
            返回
          </Button>
          <h1 className="text-lg font-bold text-text-primary">
            {isEditMode ? "编辑智能体" : "创建智能体"}
          </h1>
        </div>

        <Button type="primary" loading={saving} onClick={handleSave}>
          保存
        </Button>
      </div>

      {/* 内容区域 */}
      <div className="agent-builder-content flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spin size="large" />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <Tabs
              defaultActiveKey="basic"
              items={tabItems}
              className="agent-builder-tabs"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentBuilder;
