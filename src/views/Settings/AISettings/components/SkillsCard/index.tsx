/**
 * SkillsCard 技能管理卡片组件
 * 显示已注册的技能列表，支持查看详情、执行测试、重载
 */
import React, { useState, useEffect } from "react";
import { App, Spin, Tag, Switch, Button, Modal, Input, Empty } from "antd";
import type { SkillInfo } from "@/types/electron";

interface SkillsCardProps {
  skills: SkillInfo[];
  loading: boolean;
  onReload: (skillName?: string) => Promise<void>;
  onExecute: (
    skillName: string,
    parameters: Record<string, unknown>
  ) => Promise<string | null>;
}

const { TextArea } = Input;

const SkillsCard: React.FC<SkillsCardProps> = ({
  skills,
  loading,
  onReload,
  onExecute,
}) => {
  const { message } = App.useApp();
  const [reloading, setReloading] = useState(false);
  const [executeModalOpen, setExecuteModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillInfo | null>(null);
  const [parametersInput, setParametersInput] = useState("{}");
  const [executing, setExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<string | null>(null);
  const [enabledSkills, setEnabledSkills] = useState<Set<string>>(new Set());

  // 初始化启用状态
  useEffect(() => {
    const enabled = new Set<string>();
    skills.forEach((skill) => {
      if (skill.enabled) {
        enabled.add(skill.name);
      }
    });
    setEnabledSkills(enabled);
  }, [skills]);

  // 获取技能类型标签颜色
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      builtin: "blue",
      custom: "green",
      composite: "purple",
    };
    return colors[type] || "default";
  };

  // 获取触发方式标签颜色
  const getTriggerColor = (trigger: string) => {
    const colors: Record<string, string> = {
      manual: "orange",
      keyword: "cyan",
      intent: "magenta",
    };
    return colors[trigger] || "default";
  };

  // 获取触发方式显示名称
  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      manual: "手动",
      keyword: "关键词",
      intent: "意图",
    };
    return labels[trigger] || trigger;
  };

  // 重载技能
  const handleReload = async (skillName?: string) => {
    setReloading(true);
    try {
      await onReload(skillName);
      message.success(
        skillName ? `技能 ${skillName} 重载成功` : "所有技能重载成功"
      );
    } catch (error) {
      message.error("重载失败");
    } finally {
      setReloading(false);
    }
  };

  // 打开执行弹窗
  const handleOpenExecute = (skill: SkillInfo) => {
    setSelectedSkill(skill);
    setParametersInput("{}");
    setExecuteResult(null);
    setExecuteModalOpen(true);
  };

  // 执行技能
  const handleExecute = async () => {
    if (!selectedSkill) return;

    // 解析参数
    let parameters: Record<string, unknown> = {};
    try {
      parameters = JSON.parse(parametersInput);
    } catch {
      message.error("参数格式错误，请输入有效的 JSON");
      return;
    }

    setExecuting(true);
    try {
      const result = await onExecute(selectedSkill.name, parameters);
      setExecuteResult(result);
      if (result) {
        message.success("技能执行成功");
      }
    } catch (error) {
      message.error("技能执行失败");
    } finally {
      setExecuting(false);
    }
  };

  // 切换技能启用状态
  const handleToggleEnabled = (skillName: string, enabled: boolean) => {
    const newEnabled = new Set(enabledSkills);
    if (enabled) {
      newEnabled.add(skillName);
    } else {
      newEnabled.delete(skillName);
    }
    setEnabledSkills(newEnabled);
    message.info(
      `技能 ${skillName} ${enabled ? "已启用" : "已禁用"}（功能开发中）`
    );
  };

  return (
    <div className="p-6 bg-bg-secondary border border-border rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-purple-500">
              extension
            </span>
          </div>
          <div>
            <h3 className="font-bold text-text-primary">技能管理</h3>
            <p className="text-xs text-text-tertiary">管理和执行智能体技能</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">
            共 {skills.length} 个技能
          </span>
          <Button
            size="small"
            icon={
              <span className="material-symbols-outlined text-sm">refresh</span>
            }
            onClick={() => handleReload()}
            loading={reloading}
          >
            重载全部
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spin />
          <span className="ml-3 text-text-tertiary">加载技能列表...</span>
        </div>
      ) : skills.length === 0 ? (
        <Empty
          description="暂无注册技能"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <div className="space-y-3">
          {skills.map((skill) => (
            <div
              key={skill.name}
              className="flex items-center gap-4 p-4 bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-colors"
            >
              {/* 图标 */}
              <div className="text-2xl">{skill.icon || "⚡"}</div>

              {/* 信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary truncate">
                    {skill.displayName}
                  </span>
                  <Tag color={getTypeColor(skill.type)} className="text-xs">
                    {skill.type === "builtin"
                      ? "内置"
                      : skill.type === "custom"
                      ? "自定义"
                      : "组合"}
                  </Tag>
                  <Tag
                    color={getTriggerColor(skill.trigger)}
                    className="text-xs"
                  >
                    {getTriggerLabel(skill.trigger)}
                  </Tag>
                </div>
                <p className="text-xs text-text-tertiary truncate mt-1">
                  {skill.description}
                </p>
                {skill.tags.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    {skill.tags.slice(0, 3).map((tag: string) => (
                      <Tag key={tag} className="text-xs">
                        {tag}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>

              {/* 作者和版本 */}
              <div className="hidden md:flex flex-col items-end text-xs text-text-tertiary">
                <span>v{skill.version}</span>
                <span>{skill.author}</span>
              </div>

              {/* 操作 */}
              <div className="flex items-center gap-2">
                <Switch
                  size="small"
                  checked={enabledSkills.has(skill.name)}
                  onChange={(checked) =>
                    handleToggleEnabled(skill.name, checked)
                  }
                />
                <Button
                  size="small"
                  type="primary"
                  ghost
                  onClick={() => handleOpenExecute(skill)}
                >
                  执行
                </Button>
                <Button
                  size="small"
                  onClick={() => handleReload(skill.name)}
                  loading={reloading}
                >
                  重载
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 执行弹窗 */}
      <Modal
        title={`执行技能: ${selectedSkill?.displayName || ""}`}
        open={executeModalOpen}
        onCancel={() => setExecuteModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setExecuteModalOpen(false)}>
            关闭
          </Button>,
          <Button
            key="execute"
            type="primary"
            onClick={handleExecute}
            loading={executing}
          >
            执行
          </Button>,
        ]}
        width={600}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-tertiary mb-2 block">
              技能名称
            </label>
            <Input value={selectedSkill?.name} disabled />
          </div>

          <div>
            <label className="text-sm text-text-tertiary mb-2 block">
              技能描述
            </label>
            <p className="text-sm text-text-primary">
              {selectedSkill?.description}
            </p>
          </div>

          <div>
            <label className="text-sm text-text-tertiary mb-2 block">
              参数（JSON 格式）
            </label>
            <TextArea
              value={parametersInput}
              onChange={(e) => setParametersInput(e.target.value)}
              placeholder='{"param": "value"}'
              rows={4}
              className="font-mono"
            />
          </div>

          {executeResult && (
            <div>
              <label className="text-sm text-text-tertiary mb-2 block">
                执行结果
              </label>
              <div className="p-3 bg-bg-tertiary rounded-lg font-mono text-sm text-text-primary whitespace-pre-wrap max-h-48 overflow-auto">
                {executeResult}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export { SkillsCard };
