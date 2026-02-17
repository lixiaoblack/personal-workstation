/**
 * 知识库管理页面
 *
 * 功能：
 * 1. 创建/删除知识库
 * 2. 添加/删除文档（支持拖拽上传）
 * 3. 搜索知识库
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Card,
  Input,
  List,
  Modal,
  Form,
  Select,
  Space,
  Typography,
  Empty,
  Spin,
  message,
  Popconfirm,
  Tag,
  Table,
  Upload,
  Progress,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  FileAddOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  SettingOutlined,
  CloudUploadOutlined,
  FilePdfOutlined,
  CodeOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";
import type {
  KnowledgeInfo,
  KnowledgeDocumentInfo,
  ModelConfigListItem,
} from "@/types/electron";
import { formatFileSize, KNOWLEDGE_CONFIG } from "./config";

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

// 文档状态类型
type DocStatus = "ready" | "processing" | "error";

// 文档展示信息（扩展状态）
interface DocumentDisplayInfo extends KnowledgeDocumentInfo {
  status?: DocStatus;
}

// 默认 TopK
const DEFAULT_TOP_K = 5;

// 获取文件图标
const getFileIcon = (fileType: string) => {
  switch (fileType.toLowerCase()) {
    case ".pdf":
      return <FilePdfOutlined className="text-red-400 text-lg" />;
    case ".md":
      return <FileTextOutlined className="text-blue-400 text-lg" />;
    case ".txt":
      return <FileTextOutlined className="text-slate-400 text-lg" />;
    case ".json":
    case ".html":
      return <CodeOutlined className="text-green-400 text-lg" />;
    default:
      return <FileTextOutlined className="text-slate-400 text-lg" />;
  }
};

// 状态标签
const StatusTag: React.FC<{ status: DocStatus }> = ({ status }) => {
  switch (status) {
    case "ready":
      return (
        <Tag
          icon={<CheckCircleOutlined />}
          className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
        >
          已就绪
        </Tag>
      );
    case "processing":
      return (
        <Tag
          icon={<LoadingOutlined spin />}
          className="bg-primary/10 text-primary border-primary/20"
        >
          处理中
        </Tag>
      );
    case "error":
      return (
        <Tag
          icon={<ExclamationCircleOutlined />}
          className="bg-red-500/10 text-red-500 border-red-500/20"
        >
          处理失败
        </Tag>
      );
    default:
      return null;
  }
};

const KnowledgePage: React.FC = () => {
  // 状态
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeInfo[]>([]);
  const [selectedKnowledge, setSelectedKnowledge] =
    useState<KnowledgeInfo | null>(null);
  const [documents, setDocuments] = useState<DocumentDisplayInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);

  // 嵌入模型配置
  const [embeddingModels, setEmbeddingModels] = useState<ModelConfigListItem[]>(
    []
  );
  const [embeddingModelsLoading, setEmbeddingModelsLoading] = useState(false);

  // 创建知识库弹窗
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();

  // 上传状态
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 搜索
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ content: string; score: number; metadata: Record<string, unknown> }>
  >([]);
  const [searching, setSearching] = useState(false);

  // 加载嵌入模型配置
  const loadEmbeddingModels = useCallback(async () => {
    setEmbeddingModelsLoading(true);
    try {
      const configs = await window.electronAPI.getModelConfigs();
      const embeddingConfigs = configs.filter(
        (c) => c.usageType === "embedding" && c.enabled
      );
      setEmbeddingModels(embeddingConfigs);
    } catch (error) {
      console.error("加载嵌入模型配置失败:", error);
    } finally {
      setEmbeddingModelsLoading(false);
    }
  }, []);

  // 加载知识库列表
  const loadKnowledgeList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.listKnowledge();
      if (result.success) {
        setKnowledgeList(result.knowledge);
      } else {
        message.error(result.error || "加载知识库失败");
      }
    } catch (error) {
      console.error("加载知识库失败:", error);
      message.error("加载知识库失败");
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载文档列表
  const loadDocuments = useCallback(async (knowledgeId: string) => {
    setDocsLoading(true);
    try {
      const result = await window.electronAPI.listKnowledgeDocuments(
        knowledgeId
      );
      if (result.success) {
        // 默认已处理的文档状态为 ready
        setDocuments(
          result.documents.map((doc) => ({
            ...doc,
            status: "ready" as DocStatus,
          }))
        );
      }
    } catch (error) {
      console.error("加载文档列表失败:", error);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  // 初始化
  useEffect(() => {
    loadKnowledgeList();
    loadEmbeddingModels();
  }, [loadKnowledgeList, loadEmbeddingModels]);

  // 选择知识库
  const handleSelectKnowledge = (knowledge: KnowledgeInfo) => {
    setSelectedKnowledge(knowledge);
    setSearchResults([]);
    setSearchQuery("");
    loadDocuments(knowledge.id);
  };

  // 创建知识库
  const handleCreateKnowledge = async (values: {
    name: string;
    description?: string;
    embeddingModelConfigId: number;
  }) => {
    const selectedModel = embeddingModels.find(
      (m) => m.id === values.embeddingModelConfigId
    );
    if (!selectedModel) {
      message.error("请选择有效的嵌入模型");
      return;
    }

    try {
      const result = await window.electronAPI.createKnowledge({
        name: values.name,
        description: values.description,
        embeddingModel:
          selectedModel.provider === "ollama" ? "ollama" : "openai",
        embeddingModelName: selectedModel.modelId,
      });

      if (result.success) {
        message.success("知识库创建成功");
        setCreateModalVisible(false);
        createForm.resetFields();
        loadKnowledgeList();
      } else {
        message.error(result.error || "创建知识库失败");
      }
    } catch (error) {
      console.error("创建知识库失败:", error);
      message.error("创建知识库失败");
    }
  };

  // 删除知识库
  const handleDeleteKnowledge = async (knowledgeId: string) => {
    try {
      const result = await window.electronAPI.deleteKnowledge(knowledgeId);
      if (result.success) {
        message.success("知识库已删除");
        if (selectedKnowledge?.id === knowledgeId) {
          setSelectedKnowledge(null);
          setDocuments([]);
        }
        loadKnowledgeList();
      } else {
        message.error(result.error || "删除失败");
      }
    } catch (error) {
      console.error("删除知识库失败:", error);
      message.error("删除知识库失败");
    }
  };

  // 上传文件
  const handleUpload = async (file: File) => {
    if (!selectedKnowledge) return false;

    setUploading(true);
    setUploadProgress(0);

    try {
      // 获取文件路径（Electron 需要通过 dialog 选择）
      const result = await window.electronAPI.selectKnowledgeFiles();
      if (result.canceled || result.filePaths.length === 0) {
        setUploading(false);
        return false;
      }

      setUploadProgress(30);

      const uploadResult = await window.electronAPI.addKnowledgeDocument(
        selectedKnowledge.id,
        result.filePaths[0]
      );

      setUploadProgress(100);

      if (uploadResult.success) {
        message.success("文档上传成功");
        loadDocuments(selectedKnowledge.id);
        loadKnowledgeList();
      } else {
        message.error(uploadResult.error || "上传失败");
      }
    } catch (error) {
      console.error("上传文档失败:", error);
      message.error("上传文档失败");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }

    return false;
  };

  // 删除文档
  const handleDeleteDocument = async (documentId: string) => {
    if (!selectedKnowledge) return;

    try {
      const result = await window.electronAPI.removeKnowledgeDocument(
        selectedKnowledge.id,
        documentId
      );
      if (result.success) {
        message.success("文档已删除");
        loadDocuments(selectedKnowledge.id);
        loadKnowledgeList();
      } else {
        message.error(result.error || "删除失败");
      }
    } catch (error) {
      console.error("删除文档失败:", error);
      message.error("删除文档失败");
    }
  };

  // 搜索知识库
  const handleSearch = async () => {
    if (!selectedKnowledge || !searchQuery.trim()) return;

    setSearching(true);
    try {
      const result = await window.electronAPI.searchKnowledge(
        selectedKnowledge.id,
        searchQuery,
        DEFAULT_TOP_K
      );

      if (result.success) {
        setSearchResults(result.results);
      } else {
        message.error(result.error || "搜索失败");
      }
    } catch (error) {
      console.error("搜索失败:", error);
      message.error("搜索失败");
    } finally {
      setSearching(false);
    }
  };

  // 文档表格列定义
  const docColumns = [
    {
      title: "文件名称",
      dataIndex: "fileName",
      key: "fileName",
      render: (name: string, record: DocumentDisplayInfo) => (
        <div className="flex items-center gap-3">
          {getFileIcon(record.fileType)}
          <div>
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-text-tertiary">
              {formatFileSize(record.fileSize)}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "类型",
      dataIndex: "fileType",
      key: "fileType",
      width: 120,
      render: (type: string) => (
        <span className="text-sm text-text-secondary italic">
          {type.toUpperCase().replace(".", "")} 文档
        </span>
      ),
    },
    {
      title: "分块数",
      dataIndex: "chunkCount",
      key: "chunkCount",
      width: 100,
      render: (count: number) => (
        <span className="text-sm text-text-secondary">{count} 个</span>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: DocStatus) => <StatusTag status={status} />,
    },
    {
      title: "上传日期",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (time: number) => (
        <span className="text-sm text-text-tertiary">
          {new Date(time).toLocaleDateString()}
        </span>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 80,
      render: (_: unknown, record: DocumentDisplayInfo) => (
        <Popconfirm
          title="确定删除此文档？"
          onConfirm={() => handleDeleteDocument(record.id)}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            className="opacity-0 group-hover:opacity-100"
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="flex h-full bg-bg-primary">
      {/* 左侧：知识库列表 */}
      <aside className="w-64 border-r border-border flex flex-col bg-bg-secondary">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <DatabaseOutlined className="text-primary" />
            知识库
          </h2>
        </div>

        <Spin spinning={loading}>
          <div className="flex-1 p-4 overflow-y-auto">
            {knowledgeList.length === 0 ? (
              <Empty description="暂无知识库" className="mt-8" />
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3 px-2">
                  全部知识库
                </p>
                {knowledgeList.map((item) => (
                  <div
                    key={item.id}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                      selectedKnowledge?.id === item.id
                        ? "bg-primary/10 text-primary"
                        : "text-text-secondary hover:bg-bg-tertiary"
                    }`}
                    onClick={() => handleSelectKnowledge(item)}
                  >
                    <DatabaseOutlined className="text-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {item.documentCount} 个文档
                      </p>
                    </div>
                    <Popconfirm
                      title="确定删除此知识库？"
                      description="删除后数据无法恢复"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDeleteKnowledge(item.id);
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                    >
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        className="opacity-0 hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Spin>

        <div className="p-4 border-t border-border">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="w-full"
            onClick={() => setCreateModalVisible(true)}
          >
            新建知识库
          </Button>
        </div>
      </aside>

      {/* 右侧：主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedKnowledge ? (
          <>
            {/* 头部 */}
            <header className="p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold">
                    {selectedKnowledge.name}
                  </h1>
                  {selectedKnowledge.description && (
                    <p className="text-text-secondary text-sm mt-1">
                      {selectedKnowledge.description}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Tag>{selectedKnowledge.embeddingModelName}</Tag>
                    <Tag className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      {selectedKnowledge.documentCount} 个文档
                    </Tag>
                  </div>
                </div>
              </div>

              {/* 搜索栏 */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <Input
                    className="pl-10"
                    placeholder="搜索知识库内容..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onPressEnter={handleSearch}
                  />
                </div>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  loading={searching}
                  onClick={handleSearch}
                >
                  搜索
                </Button>
              </div>
            </header>

            {/* 内容区域 */}
            <section className="flex-1 p-6 overflow-y-auto">
              {/* 上传区域 */}
              <div className="mb-8">
                <Dragger
                  accept=".md,.txt,.pdf,.json,.html"
                  showUploadList={false}
                  beforeUpload={handleUpload}
                  className="bg-bg-secondary border-dashed border-border hover:border-primary/50 transition-colors"
                >
                  {uploading ? (
                    <div className="py-4">
                      <Progress
                        percent={uploadProgress}
                        status="active"
                        className="max-w-xs mx-auto"
                      />
                      <p className="mt-2 text-text-secondary">
                        正在处理文档...
                      </p>
                    </div>
                  ) : (
                    <div className="py-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
                        <CloudUploadOutlined className="text-2xl" />
                      </div>
                      <p className="font-medium">点击或拖拽文件到此处上传</p>
                      <p className="text-sm text-text-tertiary mt-1">
                        支持 PDF, Markdown, TXT, JSON, HTML
                      </p>
                    </div>
                  )}
                </Dragger>
              </div>

              {/* 搜索结果 */}
              {searchResults.length > 0 && (
                <div className="mb-8">
                  <p className="text-sm font-semibold text-text-secondary mb-4">
                    搜索结果 ({searchResults.length})
                  </p>
                  <div className="space-y-3">
                    {searchResults.map((result, index) => (
                      <Card
                        key={index}
                        size="small"
                        className="bg-primary/5 border-primary/20"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <FileTextOutlined className="text-primary text-sm" />
                          <span className="text-xs font-medium text-primary">
                            相关度: {(result.score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Paragraph
                          ellipsis={{ rows: 3, expandable: true }}
                          className="m-0 text-sm text-text-secondary leading-relaxed"
                        >
                          {result.content}
                        </Paragraph>
                        {(() => {
                          const fileName = result.metadata.file_name;
                          return fileName && typeof fileName === "string" ? (
                            <Text
                              type="secondary"
                              className="text-xs mt-2 block"
                            >
                              来源: {fileName}
                            </Text>
                          ) : null;
                        })()}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* 文档列表 */}
              <div>
                <p className="text-sm font-semibold text-text-secondary mb-4">
                  文档列表
                </p>
                <Spin spinning={docsLoading}>
                  {documents.length === 0 ? (
                    <Empty description="暂无文档，拖拽文件上传" />
                  ) : (
                    <Table
                      dataSource={documents}
                      columns={docColumns}
                      rowKey="id"
                      pagination={false}
                      size="middle"
                      className="document-table"
                      rowClassName={() => "group hover:bg-bg-tertiary"}
                    />
                  )}
                </Spin>
              </div>
            </section>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Empty
              description="请选择或创建知识库"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        )}
      </main>

      {/* 创建知识库弹窗 */}
      <Modal
        title="创建知识库"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateKnowledge}
        >
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
                    onClick={() => {
                      setCreateModalVisible(false);
                      window.location.href = "/settings/ai";
                    }}
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
              <Button onClick={() => setCreateModalVisible(false)}>取消</Button>
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
    </div>
  );
};

export default KnowledgePage;
