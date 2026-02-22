/**
 * 创建知识库弹窗组件
 */
import React from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Space,
  Button,
  Typography,
  Tag,
} from "antd";
import { SettingOutlined } from "@ant-design/icons";
import type { ModelConfigListItem } from "@/types/electron";

const { Text } = Typography;

interface CreateKnowledgeModalProps {
  visible: boolean;
  embeddingModels: ModelConfigListItem[];
  embeddingModelsLoading: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    name: string;
    description?: string;
    embeddingModelConfigId: number;
  }) => void;
}

const CreateKnowledgeModal: React.FC<CreateKnowledgeModalProps> = ({
  visible,
  embeddingModels,
  embeddingModelsLoading,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm();

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const goToSettings = () => {
    onCancel();
    window.location.href = "/settings/ai";
  };

  return (
    <Modal
      title="创建知识库"
      open={visible}
      onCancel={handleCancel}
      footer={null}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="name"
          label="知识库名称"
          rules={[{ required: true, message: "请输入知识库名称" }]}
        >
          <Input placeholder="输入知识库名称" />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <Input.TextArea placeholder="可选：输入知识库描述" rows={3} />
        </Form.Item>

        <Form.Item
          name="embeddingModelConfigId"
          label="嵌入模型"
          rules={[{ required: true, message: "请选择嵌入模型" }]}
          extra={
            embeddingModels.length === 0 && !embeddingModelsLoading ? (
              <div className="flex items-center gap-2 mt-2">
                <Text type="warning">
                  暂无已启用的嵌入模型配置，请先在 AI 设置中配置嵌入模型
                </Text>
                <Button
                  type="link"
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={goToSettings}
                >
                  去配置
                </Button>
              </div>
            ) : null
          }
        >
          <Select
            placeholder="选择嵌入模型"
            loading={embeddingModelsLoading}
            disabled={embeddingModels.length === 0}
          >
            {embeddingModels.map((model) => (
              <Select.Option key={model.id} value={model.id}>
                <div className="flex items-center justify-between">
                  <span>{model.name}</span>
                  <Tag className="ml-2">
                    {model.provider === "ollama" ? "本地" : "在线"}
                  </Tag>
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {embeddingModels.length > 0 && (
          <div className="p-3 bg-bg-tertiary rounded-lg mb-4">
            <Text type="secondary" className="text-xs">
              提示：嵌入模型用于将文档转换为向量，以便进行语义搜索。
              不同嵌入模型生成的向量不兼容，创建后不可更改。
            </Text>
          </div>
        )}

        <Form.Item>
          <Space className="w-full justify-end">
            <Button onClick={handleCancel}>取消</Button>
            <Button
              type="primary"
              htmlType="submit"
              disabled={embeddingModels.length === 0}
            >
              创建
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateKnowledgeModal;
