/**
 * 工作流编辑器页面
 *
 * n8n 风格的可视化工作流编排界面
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { message, Modal, Input } from "antd";
import { useSearchParams, useNavigate } from "react-router-dom";

import { NodePanel } from "./components/NodePanel";
import { NodeConfig } from "./components/NodeConfig";
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeType,
} from "@/types/workflow";

// 导入节点组件
import { StartNode } from "./nodes/StartNode";
import { EndNode } from "./nodes/EndNode";
import { LLMNode } from "./nodes/LLMNode";
import { ToolNode } from "./nodes/ToolNode";
import { KnowledgeNode } from "./nodes/KnowledgeNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { LoopNode } from "./nodes/LoopNode";
import { FileSelectNode } from "./nodes/FileSelectNode";
import { UserInputNode } from "./nodes/UserInputNode";
import { HumanReviewNode } from "./nodes/HumanReviewNode";
import { MessageNode } from "./nodes/MessageNode";
import { WebhookNode } from "./nodes/WebhookNode";

// 节点类型映射
const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  llm: LLMNode,
  tool: ToolNode,
  knowledge: KnowledgeNode,
  condition: ConditionNode,
  loop: LoopNode,
  file_select: FileSelectNode,
  user_input: UserInputNode,
  human_review: HumanReviewNode,
  message: MessageNode,
  webhook: WebhookNode,
};

// 初始节点
const initialNodes: Node[] = [
  {
    id: "start-1",
    type: "start",
    position: { x: 100, y: 200 },
    data: { label: "开始" },
  },
];

// 初始边
const initialEdges: Edge[] = [];

// 转换 ReactFlow Node 到 WorkflowNode
function convertToWorkflowNodes(nodes: Node[]): WorkflowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: (node.type || "start") as WorkflowNodeType,
    position: { x: node.position.x, y: node.position.y },
    data: (node.data as Record<string, unknown>) || {},
  }));
}

// 转换 ReactFlow Edge 到 WorkflowEdge
function convertToWorkflowEdges(edges: Edge[]): WorkflowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || undefined,
    targetHandle: edge.targetHandle || undefined,
    label: edge.label ? String(edge.label) : undefined,
    data: (edge.data as Record<string, unknown>) || undefined,
  }));
}

/**
 * 工作流编辑器组件
 */
const WorkflowEditor: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const workflowId = searchParams.get("id");

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workflowName, setWorkflowName] = useState("未命名工作流");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");

  // 加载工作流数据（编辑模式）
  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    }
  }, [workflowId]);

  // 加载工作流
  const loadWorkflow = async (id: string) => {
    setLoading(true);
    try {
      const result = await window.electronAPI.workflowGet(id);
      if (result.success && result.data) {
        const workflow = result.data;
        setWorkflowName(workflow.name);
        setWorkflowDescription(workflow.description || "");
        // 转换为 ReactFlow 格式
        setNodes((workflow.nodes || []) as Node[]);
        setEdges((workflow.edges || []) as Edge[]);
      } else {
        message.error("加载工作流失败: " + (result.error || "未知错误"));
      }
    } catch (error) {
      message.error("加载工作流失败: " + String(error));
    } finally {
      setLoading(false);
    }
  };

  // 连接节点
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // 节点点击
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // 画布点击（取消选中）
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // 添加节点
  const onAddNode = useCallback(
    (type: string) => {
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position: {
          x: Math.random() * 400 + 200,
          y: Math.random() * 300 + 100,
        },
        data: { label: getDefaultLabel(type) },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  // 更新节点数据
  const onUpdateNode = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...data } }
            : node
        )
      );
    },
    [setNodes]
  );

  // 删除节点
  const onDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
      }
    },
    [setNodes, setEdges, selectedNode]
  );

  // 保存工作流
  const handleSave = useCallback(async () => {
    // 如果是新工作流（没有 ID），显示创建对话框
    if (!workflowId) {
      setNewWorkflowName(workflowName);
      setIsCreateModalOpen(true);
      return;
    }

    // 更新现有工作流
    setSaving(true);
    try {
      const result = await window.electronAPI.workflowUpdate(workflowId, {
        name: workflowName,
        description: workflowDescription,
        nodes: convertToWorkflowNodes(nodes),
        edges: convertToWorkflowEdges(edges),
      });

      if (result.success) {
        message.success("工作流保存成功");
      } else {
        message.error("保存失败: " + (result.error || "未知错误"));
      }
    } catch (error) {
      message.error("保存失败: " + String(error));
    } finally {
      setSaving(false);
    }
  }, [workflowId, workflowName, workflowDescription, nodes, edges]);

  // 创建新工作流
  const handleCreate = useCallback(async () => {
    if (!newWorkflowName.trim()) {
      message.warning("请输入工作流名称");
      return;
    }

    setSaving(true);
    try {
      const result = await window.electronAPI.workflowCreate({
        name: newWorkflowName.trim(),
        description: workflowDescription,
        nodes: convertToWorkflowNodes(nodes),
        edges: convertToWorkflowEdges(edges),
        variables: {},
      });

      if (result.success && result.data) {
        message.success("工作流创建成功");
        setIsCreateModalOpen(false);
        // 跳转到编辑模式
        navigate(`/workflow/edit?id=${result.data.id}`, { replace: true });
      } else {
        message.error("创建失败: " + (result.error || "未知错误"));
      }
    } catch (error) {
      message.error("创建失败: " + String(error));
    } finally {
      setSaving(false);
    }
  }, [newWorkflowName, workflowDescription, nodes, edges, navigate]);

  // 测试运行工作流
  const handleTest = useCallback(async () => {
    // 先检查是否有 start 节点
    const hasStart = nodes.some((n) => n.type === "start");
    if (!hasStart) {
      message.warning("工作流必须包含开始节点");
      return;
    }

    // 如果是新工作流，先提示保存
    if (!workflowId) {
      message.warning("请先保存工作流后再测试");
      return;
    }

    // 如果有未保存的更改，先保存
    setSaving(true);
    try {
      await window.electronAPI.workflowUpdate(workflowId, {
        nodes: convertToWorkflowNodes(nodes),
        edges: convertToWorkflowEdges(edges),
      });
    } catch (error) {
      console.error("自动保存失败:", error);
    } finally {
      setSaving(false);
    }

    // 执行工作流
    try {
      const result = await window.electronAPI.workflowExecute(workflowId, {
        input: "测试输入",
      });

      if (result.success) {
        if (result.status === "waiting") {
          message.info(`工作流等待用户输入: ${result.waiting_for}`);
        } else {
          message.success("工作流执行成功");
          console.log("执行结果:", result.variables);
        }
      } else {
        message.error("执行失败: " + (result.error || "未知错误"));
      }
    } catch (error) {
      message.error("执行失败: " + String(error));
    }
  }, [workflowId, nodes, edges]);

  // 发布工作流
  const handlePublish = useCallback(async () => {
    if (!workflowId) {
      message.warning("请先保存工作流后再发布");
      return;
    }

    try {
      const result = await window.electronAPI.workflowPublish(workflowId);
      if (result.success) {
        message.success("工作流已发布，现在可以在智能体中绑定使用");
      } else {
        message.error("发布失败: " + (result.error || "未知错误"));
      }
    } catch (error) {
      message.error("发布失败: " + String(error));
    }
  }, [workflowId]);

  return (
    <div className="workflow-editor h-full flex">
      {/* 左侧节点面板 */}
      <NodePanel onAddNode={onAddNode} />

      {/* 中间画布区域 */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 bg-bg-primary/50 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          className="bg-bg-primary"
        >
          <Background color="var(--color-border)" gap={15} />
          <Controls className="!bg-bg-secondary !border-border" />
          <MiniMap
            className="!bg-bg-secondary !border-border"
            nodeColor={(node) => getNodeColor(node.type)}
          />

          {/* 顶部工具栏 */}
          <Panel position="top-center" className="flex gap-2 items-center">
            <div className="flex items-center gap-2 mr-4 bg-bg-secondary px-3 py-1.5 rounded-lg border border-border">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="bg-transparent text-text-primary text-sm w-32 focus:outline-none"
                placeholder="工作流名称"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={handleTest}
              disabled={saving || loading}
              className="px-4 py-2 bg-bg-tertiary text-text-primary rounded-lg hover:bg-bg-hover transition-colors disabled:opacity-50"
            >
              测试运行
            </button>
            {workflowId && (
              <button
                onClick={handlePublish}
                className="px-4 py-2 bg-success text-white rounded-lg hover:opacity-90 transition-colors"
              >
                发布
              </button>
            )}
          </Panel>
        </ReactFlow>
      </div>

      {/* 右侧配置面板 */}
      {selectedNode && (
        <NodeConfig
          node={selectedNode}
          workflowId={workflowId}
          onUpdate={(data) => onUpdateNode(selectedNode.id, data)}
          onDelete={() => onDeleteNode(selectedNode.id)}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* 创建工作流对话框 */}
      <Modal
        title="创建新工作流"
        open={isCreateModalOpen}
        onOk={handleCreate}
        onCancel={() => setIsCreateModalOpen(false)}
        confirmLoading={saving}
        okText="创建"
        cancelText="取消"
      >
        <div className="py-4">
          <label className="block text-sm text-text-secondary mb-2">
            工作流名称
          </label>
          <Input
            value={newWorkflowName}
            onChange={(e) => setNewWorkflowName(e.target.value)}
            placeholder="请输入工作流名称"
            onPressEnter={handleCreate}
          />
        </div>
        <div className="pb-4">
          <label className="block text-sm text-text-secondary mb-2">
            描述（可选）
          </label>
          <Input.TextArea
            value={workflowDescription}
            onChange={(e) => setWorkflowDescription(e.target.value)}
            placeholder="请输入工作流描述"
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
};

// 获取节点默认标签
function getDefaultLabel(type: string): string {
  const labels: Record<string, string> = {
    start: "开始",
    end: "结束",
    llm: "LLM 调用",
    tool: "工具调用",
    knowledge: "知识检索",
    condition: "条件分支",
    loop: "循环",
    file_select: "文件选择",
    user_input: "用户输入",
    human_review: "人工审核",
    message: "消息输出",
    webhook: "Webhook",
  };
  return labels[type] || type;
}

// 获取节点颜色（用于 MiniMap）
function getNodeColor(type?: string): string {
  const colors: Record<string, string> = {
    start: "#10B981",
    end: "#EF4444",
    llm: "#3B82F6",
    tool: "#8B5CF6",
    knowledge: "#F59E0B",
    condition: "#EC4899",
    loop: "#06B6D4",
    file_select: "#84CC16",
    user_input: "#F97316",
    human_review: "#6366F1",
    message: "#14B8A6",
    webhook: "#A855F7",
  };
  return colors[type || ""] || "#64748B";
}

export default WorkflowEditor;
