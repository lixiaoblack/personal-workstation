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
import { Button, Input, Select, message, Spin } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { useAgents } from "@/hooks/useAgents";
import type { CreateAgentInput, UpdateAgentInput } from "@/types/agent";
import { AGENT_AVATARS } from "@/types/agent";
import { AVAILABLE_TOOLS, DEFAULT_AGENT_PARAMETERS } from "../config";
import "./AgentBuilder.sass";

const { TextArea } = Input;

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
  });

  // 可用模型列表
  const [models, setModels] = useState<Array<{ id: number; name: string; modelId: string }>>([]);

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

  // 更新表单字段
  const updateField = <K extends keyof CreateAgentInput>(
    field: K,
    value: CreateAgentInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  // 切换工具选择
  const toggleTool = (toolId: string) => {
    const currentTools = formData.tools || [];
    const newTools = currentTools.includes(toolId)
      ? currentTools.filter((t) => t !== toolId)
      : [...currentTools, toolId];
    updateField("tools", newTools);
  };

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
          <div className="max-w-3xl mx-auto space-y-6">
            {/* 基础配置 */}
            <div className="bg-bg-secondary rounded-xl p-6 border border-border">
              <h3 className="text-base font-medium text-text-primary mb-4">基础配置</h3>

              {/* 头像选择 */}
              <div className="mb-4">
                <label className="block text-sm text-text-secondary mb-2">头像</label>
                <div className="flex gap-2 flex-wrap">
                  {AGENT_AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                        formData.avatar === avatar
                          ? "bg-primary/20 ring-2 ring-primary"
                          : "bg-bg-tertiary hover:bg-bg-hover"
                      }`}
                      onClick={() => updateField("avatar", avatar)}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>

              {/* 名称 */}
              <div className="mb-4">
                <label className="block text-sm text-text-secondary mb-2">
                  名称 <span className="text-error">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="给智能体起个名字"
                  maxLength={50}
                />
              </div>

              {/* 描述 */}
              <div className="mb-4">
                <label className="block text-sm text-text-secondary mb-2">描述</label>
                <TextArea
                  value={formData.description || ""}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="描述这个智能体的功能和用途"
                  rows={2}
                  maxLength={200}
                  showCount
                />
              </div>

              {/* 模型选择 */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">模型</label>
                <Select
                  value={formData.model_id}
                  onChange={(value) => {
                    const selectedModel = models.find((m) => m.id === value);
                    updateField("model_id", value);
                    updateField("model_name", selectedModel?.modelId);
                  }}
                  placeholder="选择模型"
                  className="w-full"
                  allowClear
                  options={models.map((m) => ({
                    value: m.id,
                    label: m.name,
                  }))}
                />
              </div>
            </div>

            {/* 提示词 */}
            <div className="bg-bg-secondary rounded-xl p-6 border border-border">
              <h3 className="text-base font-medium text-text-primary mb-4">系统提示词</h3>
              <TextArea
                value={formData.system_prompt || ""}
                onChange={(e) => updateField("system_prompt", e.target.value)}
                placeholder="定义智能体的角色、行为和能力..."
                rows={6}
                showCount
              />
            </div>

            {/* 工具选择 */}
            <div className="bg-bg-secondary rounded-xl p-6 border border-border">
              <h3 className="text-base font-medium text-text-primary mb-4">可用工具</h3>
              <div className="space-y-2">
                {AVAILABLE_TOOLS.map((tool) => (
                  <div
                    key={tool.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                      formData.tools?.includes(tool.id)
                        ? "bg-primary/10 border border-primary/50"
                        : "bg-bg-tertiary border border-transparent hover:border-border"
                    }`}
                    onClick={() => toggleTool(tool.id)}
                  >
                    <div>
                      <div className="text-sm font-medium text-text-primary">{tool.name}</div>
                      <div className="text-xs text-text-tertiary">{tool.description}</div>
                    </div>
                    <span className="material-symbols-outlined text-primary">
                      {formData.tools?.includes(tool.id) ? "check_box" : "check_box_outline_blank"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 高级参数 */}
            <div className="bg-bg-secondary rounded-xl p-6 border border-border">
              <h3 className="text-base font-medium text-text-primary mb-4">高级参数</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">温度 (Temperature)</label>
                  <Input
                    type="number"
                    value={(formData.parameters?.temperature as number) ?? 0.7}
                    onChange={(e) =>
                      updateField("parameters", {
                        ...formData.parameters,
                        temperature: parseFloat(e.target.value) || 0.7,
                      } as Record<string, unknown>)
                    }
                    min={0}
                    max={2}
                    step={0.1}
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">最大令牌数</label>
                  <Input
                    type="number"
                    value={(formData.parameters?.max_tokens as number) ?? 4096}
                    onChange={(e) =>
                      updateField("parameters", {
                        ...formData.parameters,
                        max_tokens: parseInt(e.target.value) || 4096,
                      } as Record<string, unknown>)
                    }
                    min={1}
                    max={32000}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentBuilder;
