/**
 * 知识库管理页面
 *
 * 功能：
 * 1. 创建/删除知识库
 * 2. 添加/删除文档（支持拖拽上传）
 * 3. 搜索知识库
 * 4. 文件预览
 */
import React, { useState, useEffect, useCallback } from "react";
import { Empty, message } from "antd";
import type { KnowledgeInfo, ModelConfigListItem } from "@/types/electron";
import { KNOWLEDGE_CONFIG } from "./config";
import {
  KnowledgeSidebar,
  KnowledgeHeader,
  KnowledgeUpload,
  KnowledgeDocumentList,
  KnowledgeSearchResult,
  CreateKnowledgeModal,
  type DocumentDisplayInfo,
} from "./components";
import WFilePreview from "@/components/WFilePreview";

// 默认 TopK
const DEFAULT_TOP_K = KNOWLEDGE_CONFIG.defaultTopK;

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

  // 上传状态
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 搜索
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ content: string; score: number; metadata: Record<string, unknown> }>
  >([]);
  const [searching, setSearching] = useState(false);

  // 文件预览
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    path: string;
    name: string;
    type: string;
  } | null>(null);

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
            status: "ready" as const,
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

  // 上传文件 - 使用 Electron 原生文件选择对话框
  const handleUpload = async () => {
    if (!selectedKnowledge) return false;

    setUploading(true);
    setUploadProgress(0);

    try {
      // 使用 selectAndSaveKnowledgeFiles 接口弹出原生选择框
      const result = await window.electronAPI.selectAndSaveKnowledgeFiles(
        selectedKnowledge.id
      );

      if (!result.success || !result.files || result.files.length === 0) {
        setUploading(false);
        return false;
      }

      setUploadProgress(50);

      // 文件已经保存，现在需要添加到知识库（向量化）
      const uploadResult = await window.electronAPI.addKnowledgeDocument(
        selectedKnowledge.id,
        result.files[0].path
      );

      setUploadProgress(100);

      if (uploadResult.success) {
        // 如果有警告信息，显示警告但仍算成功
        if (uploadResult.warning) {
          message.warning(uploadResult.warning);
        } else {
          message.success("文档上传成功");
        }
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

  // 拖拽上传 - 直接使用文件路径
  const handleDropFile = async (filePath: string) => {
    if (!selectedKnowledge) return false;

    setUploading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(30);

      // 先保存文件到知识库目录
      const saveResult = await window.electronAPI.saveFileToKnowledge(
        selectedKnowledge.id,
        filePath
      );

      if (!saveResult.success || !saveResult.file) {
        message.error(saveResult.error || "文件保存失败");
        setUploading(false);
        return false;
      }

      setUploadProgress(60);

      // 添加到知识库（向量化）
      const uploadResult = await window.electronAPI.addKnowledgeDocument(
        selectedKnowledge.id,
        saveResult.file.path
      );

      setUploadProgress(100);

      if (uploadResult.success) {
        // 如果有警告信息，显示警告但仍算成功
        if (uploadResult.warning) {
          message.warning(uploadResult.warning);
        } else {
          message.success("文档上传成功");
        }
        loadDocuments(selectedKnowledge.id);
        loadKnowledgeList();
      } else {
        message.error(uploadResult.error || "上传失败");
      }
    } catch (error) {
      console.error("拖拽上传失败:", error);
      message.error("拖拽上传失败");
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

  // 预览文件
  const handlePreview = (document: DocumentDisplayInfo) => {
    setPreviewFile({
      path: document.filePath,
      name: document.fileName,
      type: document.fileType,
    });
    setPreviewVisible(true);
  };

  // 关闭预览
  const handleClosePreview = () => {
    setPreviewVisible(false);
    setPreviewFile(null);
  };

  return (
    <div className="flex h-full bg-bg-primary">
      {/* 左侧：知识库列表 */}
      <KnowledgeSidebar
        knowledgeList={knowledgeList}
        selectedKnowledge={selectedKnowledge}
        loading={loading}
        onSelect={handleSelectKnowledge}
        onDelete={handleDeleteKnowledge}
        onCreate={() => setCreateModalVisible(true)}
      />

      {/* 右侧：主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedKnowledge ? (
          <>
            {/* 头部 */}
            <KnowledgeHeader
              knowledge={selectedKnowledge}
              searchQuery={searchQuery}
              searching={searching}
              onSearchChange={setSearchQuery}
              onSearch={handleSearch}
            />

            {/* 内容区域 */}
            <section className="flex-1 p-6 overflow-y-auto">
              {/* 上传区域 */}
              <KnowledgeUpload
                uploading={uploading}
                uploadProgress={uploadProgress}
                onUpload={handleUpload}
                onDropFile={handleDropFile}
              />

              {/* 搜索结果 */}
              <KnowledgeSearchResult results={searchResults} />

              {/* 文档列表 */}
              <KnowledgeDocumentList
                documents={documents}
                loading={docsLoading}
                onDelete={handleDeleteDocument}
                onPreview={handlePreview}
              />
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
      <CreateKnowledgeModal
        visible={createModalVisible}
        embeddingModels={embeddingModels}
        embeddingModelsLoading={embeddingModelsLoading}
        onCancel={() => setCreateModalVisible(false)}
        onSubmit={handleCreateKnowledge}
      />

      {/* 文件预览 */}
      {previewFile && (
        <WFilePreview
          visible={previewVisible}
          filePath={previewFile.path}
          fileName={previewFile.name}
          fileType={previewFile.type}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
};

export default KnowledgePage;
