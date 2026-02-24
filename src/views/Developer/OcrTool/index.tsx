/**
 * OcrTool OCR 功能页面
 *
 * 功能：
 * 1. 图片输入：拖拽上传、点击选择、粘贴上传（Ctrl/Cmd+V）
 * 2. OCR 识别：调用 Python OCR 服务
 * 3. 结果处理：复制到剪贴板、保存到知识库
 * 4. 历史记录：最近识别记录
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { App, Upload, Modal, Input, Select, Spin } from "antd";
import type { UploadFile } from "antd";
import { KnowledgeInfo, OcrHistoryItem, OcrBlock } from "./types";

const { TextArea } = Input;

// 本地存储键名
const OCR_HISTORY_KEY = "ocr_history";
const MAX_HISTORY_COUNT = 20;

const OcrTool: React.FC = () => {
  const { message, modal } = App.useApp();
  const [imagePreview, setImagePreview] = useState<string>("");
  const [ocrResult, setOcrResult] = useState<string>("");
  const [ocrBlocks, setOcrBlocks] = useState<OcrBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [ocrAvailable, setOcrAvailable] = useState<boolean | null>(null);
  const [history, setHistory] = useState<OcrHistoryItem[]>([]);
  const [editableResult, setEditableResult] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  // 保存到知识库相关状态
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeInfo[]>([]);
  const [selectedKnowledge, setSelectedKnowledge] = useState<string>("");
  const [documentTitle, setDocumentTitle] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // 图片标注相关状态
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(
    null
  );
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // 页面加载时检查 OCR 服务状态和加载历史记录
  useEffect(() => {
    checkOcrStatus();
    loadHistory();
  }, []);

  // 检查 OCR 服务状态
  const checkOcrStatus = async () => {
    try {
      const result = await window.electronAPI.ocrStatus();
      setOcrAvailable(result.available);
      if (!result.available) {
        console.warn("[OcrTool] OCR 服务不可用:", result.message);
      }
    } catch (error) {
      console.error("[OcrTool] 检查 OCR 状态失败:", error);
      setOcrAvailable(false);
    }
  };

  // 加载历史记录
  const loadHistory = () => {
    try {
      const saved = localStorage.getItem(OCR_HISTORY_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.error("[OcrTool] 加载历史记录失败:", error);
    }
  };

  // 保存历史记录
  const saveToHistory = useCallback(
    (imageBase64: string, text: string) => {
      const newItem: OcrHistoryItem = {
        id: Date.now().toString(),
        imageBase64: imageBase64.substring(0, 1000), // 只保存前1000字符以节省空间
        text,
        timestamp: Date.now(),
      };

      const newHistory = [newItem, ...history].slice(0, MAX_HISTORY_COUNT);
      setHistory(newHistory);

      try {
        localStorage.setItem(OCR_HISTORY_KEY, JSON.stringify(newHistory));
      } catch (error) {
        console.error("[OcrTool] 保存历史记录失败:", error);
      }
    },
    [history]
  );

  // 处理图片上传
  const handleImageUpload = async (file: File) => {
    // 检查文件类型
    if (!file.type.startsWith("image/")) {
      message.error("请上传图片文件");
      return false;
    }

    // 检查 OCR 服务状态
    if (ocrAvailable === false) {
      message.warning("OCR 服务不可用，请检查 Python 服务是否正常运行");
      return false;
    }

    // 预览图片
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      setSelectedBlockIndex(null); // 重置选中状态
      performOcr(base64);
    };
    reader.readAsDataURL(file);

    setFileList([file as unknown as UploadFile]);
    return false;
  };

  // 图片加载完成时获取尺寸
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  };

  // 执行 OCR 识别
  const performOcr = async (imageBase64: string) => {
    setLoading(true);
    setOcrResult("");
    setOcrBlocks([]);
    setEditableResult("");
    setSelectedBlockIndex(null);

    try {
      console.log("[OcrTool] 开始 OCR 识别...");
      const result = await window.electronAPI.ocrRecognize(imageBase64);

      if (result.success) {
        setOcrResult(result.text);
        setEditableResult(result.text);
        setOcrBlocks(result.blocks || []);

        // 保存到历史记录
        saveToHistory(imageBase64, result.text);

        message.success(`识别成功，共 ${result.blocks?.length || 0} 个文字块`);
      } else {
        message.error(result.error || "识别失败");
        setOcrResult("");
      }
    } catch (error) {
      console.error("[OcrTool] OCR 识别失败:", error);
      message.error("OCR 识别失败，请检查服务是否正常");
    } finally {
      setLoading(false);
    }
  };

  // 点击文字块时高亮对应区域
  const handleBlockClick = (index: number) => {
    setSelectedBlockIndex(selectedBlockIndex === index ? null : index);
  };

  // 计算边界框的显示位置（相对于图片容器）
  const getBoxStyle = (
    box: number[][],
    containerWidth: number,
    containerHeight: number
  ) => {
    if (!box || box.length < 4) return null;

    // box 是四个点的坐标 [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
    // 找出边界框的左上角和右下角
    const xCoords = box.map((p) => p[0]);
    const yCoords = box.map((p) => p[1]);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    // 计算缩放比例
    const scaleX = containerWidth / imageDimensions.width;
    const scaleY = containerHeight / imageDimensions.height;

    return {
      left: minX * scaleX,
      top: minY * scaleY,
      width: (maxX - minX) * scaleX,
      height: (maxY - minY) * scaleY,
    };
  };

  // 粘贴上传
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            message.info("检测到粘贴的图片，正在识别...");
            await handleImageUpload(file);
          }
          break;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocrAvailable]);

  // 复制结果
  const handleCopy = async () => {
    const textToCopy = isEditing ? editableResult : ocrResult;
    if (!textToCopy) {
      message.warning("没有可复制的内容");
      return;
    }

    await navigator.clipboard.writeText(textToCopy);
    message.success("已复制到剪贴板");
  };

  // 清空
  const handleClear = () => {
    setImagePreview("");
    setOcrResult("");
    setOcrBlocks([]);
    setEditableResult("");
    setIsEditing(false);
    setFileList([]);
    setSelectedBlockIndex(null);
  };

  // 打开保存到知识库弹窗
  const handleOpenSaveModal = async () => {
    const textToSave = isEditing ? editableResult : ocrResult;
    if (!textToSave) {
      message.warning("没有可保存的内容");
      return;
    }

    try {
      const result = await window.electronAPI.listKnowledge();
      if (result.success && result.knowledge) {
        setKnowledgeList(result.knowledge);
        if (result.knowledge.length > 0) {
          setSelectedKnowledge(result.knowledge[0].id);
        }
      }
    } catch (error) {
      console.error("[OcrTool] 获取知识库列表失败:", error);
      message.error("获取知识库列表失败");
    }

    setDocumentTitle(`OCR识别结果_${new Date().toLocaleDateString()}`);
    setSaveModalVisible(true);
  };

  // 保存到知识库
  const handleSaveToKnowledge = async () => {
    if (!selectedKnowledge) {
      message.warning("请选择知识库");
      return;
    }

    if (!documentTitle.trim()) {
      message.warning("请输入文档标题");
      return;
    }

    const textToSave = isEditing ? editableResult : ocrResult;
    setSaving(true);

    try {
      const result = await window.electronAPI.ocrSaveToKnowledge(
        selectedKnowledge,
        documentTitle,
        textToSave
      );

      if (result.success) {
        message.success(`已保存到知识库，共 ${result.chunk_count || 0} 个分块`);
        setSaveModalVisible(false);
      } else {
        message.error(result.error || "保存失败");
      }
    } catch (error) {
      console.error("[OcrTool] 保存到知识库失败:", error);
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  // 从历史记录恢复
  const handleHistoryClick = (item: OcrHistoryItem) => {
    // 历史记录只保存了部分 base64，这里只恢复文字结果
    setOcrResult(item.text);
    setEditableResult(item.text);
    message.info("已恢复历史记录的文字内容");
  };

  // 清空历史记录
  const handleClearHistory = () => {
    modal.confirm({
      title: "确认清空",
      content: "确定要清空所有历史记录吗？",
      onOk: () => {
        setHistory([]);
        localStorage.removeItem(OCR_HISTORY_KEY);
        message.success("历史记录已清空");
      },
    });
  };

  // 切换编辑模式
  const toggleEditMode = () => {
    if (isEditing) {
      // 保存编辑
      setOcrResult(editableResult);
    }
    setIsEditing(!isEditing);
  };

  return (
    <div className="flex flex-col h-full min-h-full bg-bg-primary overflow-hidden">
      {/* 工具栏 */}
      <header className="h-14 flex-shrink-0 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={!ocrResult && !editableResult}
            className="px-3 py-1.5 text-text-secondary hover:bg-bg-tertiary rounded-lg transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">
              content_copy
            </span>
            复制结果
          </button>
          <button
            onClick={toggleEditMode}
            disabled={!ocrResult}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-sm ${
              isEditing
                ? "bg-primary text-white"
                : "text-text-secondary hover:bg-bg-tertiary"
            } disabled:opacity-50`}
          >
            <span className="material-symbols-outlined text-lg">
              {isEditing ? "check" : "edit"}
            </span>
            {isEditing ? "完成编辑" : "编辑结果"}
          </button>
          <button
            onClick={handleOpenSaveModal}
            disabled={!ocrResult && !editableResult}
            className="px-3 py-1.5 text-text-secondary hover:bg-bg-tertiary rounded-lg transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">save</span>
            保存到知识库
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-error hover:bg-error/10 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
            清空
          </button>
        </div>
        <div className="flex items-center gap-2">
          {ocrAvailable === null && (
            <span className="text-xs text-text-tertiary">检查服务状态...</span>
          )}
          {ocrAvailable === false && (
            <span className="text-xs text-error flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">warning</span>
              OCR 服务不可用
            </span>
          )}
          {ocrAvailable === true && (
            <span className="text-xs text-success flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">
                check_circle
              </span>
              OCR 服务就绪
            </span>
          )}
          <span className="text-xs text-text-tertiary">
            支持 Ctrl/Cmd+V 粘贴图片
          </span>
        </div>
      </header>

      {/* 内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：图片上传 */}
        <div className="w-1/2 flex flex-col border-r border-border">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary/50 border-b border-border">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">
              上传图片
            </span>
          </div>
          <div className="flex-1 flex flex-col p-4 overflow-auto">
            {!imagePreview ? (
              <Upload.Dragger
                fileList={fileList}
                beforeUpload={handleImageUpload}
                onRemove={() => {
                  setFileList([]);
                  setImagePreview("");
                  setOcrResult("");
                }}
                accept="image/*"
                maxCount={1}
                className="bg-bg-secondary border-border h-full flex items-center justify-center"
              >
                <p className="text-text-tertiary">
                  <span className="material-symbols-outlined text-5xl text-primary">
                    document_scanner
                  </span>
                </p>
                <p className="text-text-secondary mt-2">点击或拖拽图片到此处</p>
                <p className="text-text-tertiary text-xs mt-1">
                  支持 PNG、JPG、BMP、WEBP 格式
                </p>
                <p className="text-text-tertiary text-xs mt-1">
                  或使用 Ctrl/Cmd+V 粘贴剪贴板图片
                </p>
              </Upload.Dragger>
            ) : (
              <div
                ref={imageContainerRef}
                className="flex-1 bg-bg-secondary border border-border rounded-lg overflow-hidden flex items-center justify-center relative"
              >
                {/* 图片 */}
                <img
                  src={imagePreview}
                  alt="预览"
                  className="max-w-full max-h-full object-contain"
                  onLoad={handleImageLoad}
                />

                {/* 边界框叠加层 - 只显示选中的文字块 */}
                {imageDimensions.width > 0 &&
                  selectedBlockIndex !== null &&
                  imageContainerRef.current &&
                  ocrBlocks[selectedBlockIndex] &&
                  (() => {
                    const containerRect =
                      imageContainerRef.current?.getBoundingClientRect();
                    if (!containerRect) return null;

                    // 计算图片在容器中的实际显示区域（object-contain 模式）
                    const containerAspect =
                      containerRect.width / containerRect.height;
                    const imageAspect =
                      imageDimensions.width / imageDimensions.height;

                    let displayWidth, displayHeight, offsetX, offsetY;
                    if (imageAspect > containerAspect) {
                      // 图片宽度为约束
                      displayWidth = containerRect.width;
                      displayHeight = containerRect.width / imageAspect;
                      offsetX = 0;
                      offsetY = (containerRect.height - displayHeight) / 2;
                    } else {
                      // 图片高度为约束
                      displayHeight = containerRect.height;
                      displayWidth = containerRect.height * imageAspect;
                      offsetX = (containerRect.width - displayWidth) / 2;
                      offsetY = 0;
                    }

                    const block = ocrBlocks[selectedBlockIndex];
                    const boxStyle = getBoxStyle(
                      block.box,
                      displayWidth,
                      displayHeight
                    );
                    if (!boxStyle) return null;

                    return (
                      <div
                        key={selectedBlockIndex}
                        className="absolute inset-0 pointer-events-none"
                      >
                        <div
                          className="absolute border-2 border-primary bg-primary/20 shadow-lg shadow-primary/30 transition-all duration-200"
                          style={{
                            left: offsetX + boxStyle.left,
                            top: offsetY + boxStyle.top,
                            width: boxStyle.width,
                            height: boxStyle.height,
                          }}
                        >
                          {/* 序号标签 */}
                          <div className="absolute -top-5 left-0 text-[10px] px-1.5 rounded bg-primary text-white">
                            {selectedBlockIndex + 1}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                {/* 加载中遮罩 */}
                {loading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Spin size="large" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：识别结果 */}
        <div className="w-1/2 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary/50 border-b border-border">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">
              识别结果
            </span>
            {loading && (
              <span className="text-xs text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm animate-spin">
                  progress_activity
                </span>
                识别中...
              </span>
            )}
            {ocrBlocks.length > 0 && !loading && (
              <span className="text-xs text-text-tertiary">
                {ocrBlocks.length} 个文字块
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4">
            {ocrResult || editableResult ? (
              <div className="h-full">
                {isEditing ? (
                  <TextArea
                    value={editableResult}
                    onChange={(e) => setEditableResult(e.target.value)}
                    className="h-full resize-none"
                    placeholder="编辑识别结果..."
                  />
                ) : (
                  <div className="space-y-2">
                    {/* 显示置信度信息 */}
                    {ocrBlocks.length > 0 && (
                      <div className="mb-3 p-2 bg-bg-tertiary rounded text-xs max-h-48 overflow-auto">
                        <div className="text-text-tertiary mb-2 sticky top-0 bg-bg-tertiary">
                          识别详情（点击高亮对应区域）：
                        </div>
                        <div className="space-y-1">
                          {ocrBlocks.map((block, index) => (
                            <div
                              key={index}
                              onClick={() => handleBlockClick(index)}
                              className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                                selectedBlockIndex === index
                                  ? "bg-primary/20 border border-primary"
                                  : "hover:bg-bg-secondary border border-transparent"
                              }`}
                            >
                              <span
                                className={`w-5 h-5 flex items-center justify-center text-[10px] rounded ${
                                  selectedBlockIndex === index
                                    ? "bg-primary text-white"
                                    : "bg-success text-white"
                                }`}
                              >
                                {index + 1}
                              </span>
                              <span className="text-text-secondary flex-1 truncate">
                                {block.text.substring(0, 40)}
                                {block.text.length > 40 ? "..." : ""}
                              </span>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                                  block.confidence > 0.9
                                    ? "bg-success/20 text-success"
                                    : block.confidence > 0.7
                                    ? "bg-warning/20 text-warning"
                                    : "bg-error/20 text-error"
                                }`}
                              >
                                {(block.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* 显示完整结果 */}
                    <pre className="text-sm font-mono text-text-primary whitespace-pre-wrap bg-bg-secondary p-3 rounded-lg border border-border max-h-64 overflow-auto">
                      {ocrResult}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-text-tertiary">
                <div className="text-center">
                  <span className="material-symbols-outlined text-5xl opacity-50">
                    text_fields
                  </span>
                  <p className="mt-2">识别结果将显示在这里</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 历史记录 */}
      {history.length > 0 && (
        <div className="border-t border-border bg-bg-secondary">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs font-bold text-text-tertiary uppercase tracking-widest">
              历史记录 ({history.length})
            </span>
            <button
              onClick={handleClearHistory}
              className="text-xs text-error hover:underline"
            >
              清空历史
            </button>
          </div>
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
            {history.slice(0, 10).map((item) => (
              <button
                key={item.id}
                onClick={() => handleHistoryClick(item)}
                className="flex-shrink-0 p-2 bg-bg-tertiary hover:bg-bg-primary border border-border rounded-lg transition-colors text-left"
                style={{ minWidth: 120 }}
              >
                <div className="text-xs text-text-secondary truncate">
                  {item.text.substring(0, 30)}
                  {item.text.length > 30 ? "..." : ""}
                </div>
                <div className="text-[10px] text-text-tertiary mt-1">
                  {new Date(item.timestamp).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 保存到知识库弹窗 */}
      <Modal
        title="保存到知识库"
        open={saveModalVisible}
        onCancel={() => setSaveModalVisible(false)}
        onOk={handleSaveToKnowledge}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              选择知识库
            </label>
            <Select
              value={selectedKnowledge}
              onChange={setSelectedKnowledge}
              className="w-full"
              placeholder="请选择知识库"
            >
              {knowledgeList.map((kb) => (
                <Select.Option key={kb.id} value={kb.id}>
                  {kb.name}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              文档标题
            </label>
            <Input
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="请输入文档标题"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              内容预览
            </label>
            <div className="max-h-40 overflow-auto p-2 bg-bg-tertiary rounded border border-border text-xs">
              {(isEditing ? editableResult : ocrResult).substring(0, 500)}
              {(isEditing ? editableResult : ocrResult).length > 500 && "..."}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export { OcrTool };
export default OcrTool;
