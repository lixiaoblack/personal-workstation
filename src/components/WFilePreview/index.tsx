/**
 * WFilePreview - 文件预览组件
 *
 * 支持的文件类型：
 * - Markdown (.md)
 * - JSON (.json)
 * - PDF (.pdf)
 * - 图片 (.jpg, .jpeg, .png, .gif, .webp, .svg) - 支持 OCR 识别和标注
 * - 文本文件 (.txt, .log, .csv)
 * - 代码文件 (.js, .ts, .jsx, .tsx, .py, .java, .css, .html, etc.)
 * - Word 文档 (.doc, .docx) - 需要转换为其他格式或提示下载
 *
 * 使用方式：
 * ```tsx
 * <WFilePreview
 *   visible={visible}
 *   filePath="/path/to/file.pdf"
 *   fileName="document.pdf"
 *   fileType=".pdf"
 *   onClose={() => setVisible(false)}
 * />
 * ```
 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Modal, Spin, Empty, Typography, Button, Tooltip } from "antd";
import {
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  CodeOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { CodeHighlighter } from "@ant-design/x";

const { Text, Paragraph } = Typography;

// OCR 文字块类型
interface OcrBlock {
  text: string;
  confidence: number;
  box: number[][];
}

// 文件类型分类
type FileCategory =
  | "markdown"
  | "json"
  | "pdf"
  | "image"
  | "text"
  | "code"
  | "unsupported";

// 获取文件分类
const getFileCategory = (fileType: string): FileCategory => {
  const ext = fileType.toLowerCase().replace(".", "");

  if (["md", "markdown"].includes(ext)) return "markdown";
  if (["json"].includes(ext)) return "json";
  if (["pdf"].includes(ext)) return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext))
    return "image";
  if (["txt", "log", "csv"].includes(ext)) return "text";
  if (
    [
      "js",
      "jsx",
      "ts",
      "tsx",
      "py",
      "java",
      "c",
      "cpp",
      "h",
      "cs",
      "go",
      "rs",
      "css",
      "scss",
      "sass",
      "less",
      "html",
      "xml",
      "yaml",
      "yml",
      "toml",
      "sh",
      "bash",
      "zsh",
      "sql",
      "md",
      "json",
    ].includes(ext)
  )
    return "code";

  return "unsupported";
};

// 获取代码语言
const getCodeLanguage = (fileType: string): string => {
  const ext = fileType.toLowerCase().replace(".", "");
  const langMap: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    py: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    cs: "csharp",
    go: "go",
    rs: "rust",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    html: "html",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    sql: "sql",
    json: "json",
    md: "markdown",
  };
  return langMap[ext] || "text";
};

// 获取文件图标
const getFileIcon = (category: FileCategory) => {
  switch (category) {
    case "pdf":
      return <FilePdfOutlined className="text-red-400" />;
    case "image":
      return <FileImageOutlined className="text-purple-400" />;
    case "markdown":
      return <FileTextOutlined className="text-blue-400" />;
    case "code":
      return <CodeOutlined className="text-green-400" />;
    default:
      return <FileTextOutlined className="text-slate-400" />;
  }
};

interface WFilePreviewProps {
  visible: boolean;
  filePath: string;
  fileName: string;
  fileType: string;
  onClose: () => void;
  width?: number | string;
  /** 是否启用 OCR 识别（仅图片类型有效） */
  enableOcr?: boolean;
}

const WFilePreview: React.FC<WFilePreviewProps> = ({
  visible,
  filePath,
  fileName,
  fileType,
  onClose,
  width = 1100,
  enableOcr = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string>("");

  // OCR 相关状态
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrBlocks, setOcrBlocks] = useState<OcrBlock[]>([]);
  const [ocrText, setOcrText] = useState<string>("");
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(
    null
  );
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });
  const [showOcrPanel, setShowOcrPanel] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const category = useMemo(() => getFileCategory(fileType), [fileType]);

  // 读取文件内容
  useEffect(() => {
    if (!visible || !filePath) return;

    // 不支持的类型
    if (category === "unsupported") {
      setContent("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setTruncated(false);
    setContent("");
    setImageDataUrl("");

    console.log("[WFilePreview] Reading file:", filePath);

    // 图片类型：读取完整内容并转为 Base64 数据 URL
    if (category === "image") {
      window.electronAPI
        .readFileContent(filePath, 50 * 1024 * 1024) // 图片最大 50MB
        .then((result) => {
          console.log("[WFilePreview] Image read result:", result);
          if (result.success && result.content && result.mimeType) {
            // 构建 Base64 数据 URL
            const dataUrl = `data:${result.mimeType};base64,${result.content}`;
            setImageDataUrl(dataUrl);

            // 自动执行 OCR 识别
            if (enableOcr) {
              performOcr(dataUrl);
            }
          } else {
            setError(result.error || "无法读取图片内容");
          }
        })
        .catch((err) => {
          console.error("[WFilePreview] Image read error:", err);
          setError(err.message || "读取图片失败");
        })
        .finally(() => {
          setLoading(false);
        });
      return;
    }

    // PDF 类型：读取完整内容并转为 Base64 数据 URL
    if (category === "pdf") {
      window.electronAPI
        .readFileContent(filePath, 50 * 1024 * 1024) // PDF 最大 50MB
        .then((result) => {
          console.log("[WFilePreview] PDF read result:", result);
          if (result.success && result.content && result.mimeType) {
            // 构建 Base64 数据 URL
            const dataUrl = `data:${result.mimeType};base64,${result.content}`;
            setImageDataUrl(dataUrl);
          } else {
            setError(result.error || "无法读取 PDF 内容");
          }
        })
        .catch((err) => {
          console.error("[WFilePreview] PDF read error:", err);
          setError(err.message || "读取 PDF 失败");
        })
        .finally(() => {
          setLoading(false);
        });
      return;
    }

    // 文本/代码/JSON 等类型
    window.electronAPI
      .readFileContent(filePath)
      .then((result) => {
        console.log("[WFilePreview] Read result:", result);
        if (result.success && result.content) {
          setContent(result.content);
          setTruncated(result.truncated || false);
        } else {
          setError(result.error || "无法读取文件内容");
        }
      })
      .catch((err) => {
        console.error("[WFilePreview] Read error:", err);
        setError(err.message || "读取文件失败");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [visible, filePath, category, enableOcr]);

  // 执行 OCR 识别
  const performOcr = async (imageBase64: string) => {
    setOcrLoading(true);
    setOcrBlocks([]);
    setOcrText("");
    setSelectedBlockIndex(null);

    try {
      console.log("[WFilePreview] 开始 OCR 识别...");
      const result = await window.electronAPI.ocrRecognize(imageBase64);

      if (result.success) {
        setOcrText(result.text || "");
        setOcrBlocks(result.blocks || []);
        if (result.blocks && result.blocks.length > 0) {
          setShowOcrPanel(true);
        }
        console.log(
          `[WFilePreview] OCR 识别成功，共 ${
            result.blocks?.length || 0
          } 个文字块`
        );
      } else {
        console.warn("[WFilePreview] OCR 识别失败:", result.error);
      }
    } catch (error) {
      console.error("[WFilePreview] OCR 识别失败:", error);
    } finally {
      setOcrLoading(false);
    }
  };

  // 图片加载完成时获取尺寸
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  };

  // 点击文字块时高亮对应区域
  const handleBlockClick = (index: number) => {
    setSelectedBlockIndex(selectedBlockIndex === index ? null : index);
  };

  // 计算边界框的显示位置
  const getBoxStyle = (
    box: number[][],
    containerWidth: number,
    containerHeight: number
  ) => {
    if (!box || box.length < 4 || imageDimensions.width === 0) return null;

    const xCoords = box.map((p) => p[0]);
    const yCoords = box.map((p) => p[1]);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    const scaleX = containerWidth / imageDimensions.width;
    const scaleY = containerHeight / imageDimensions.height;

    return {
      left: minX * scaleX,
      top: minY * scaleY,
      width: (maxX - minX) * scaleX,
      height: (maxY - minY) * scaleY,
    };
  };

  // 复制 OCR 结果
  const handleCopyOcrText = async () => {
    if (!ocrText) return;
    await navigator.clipboard.writeText(ocrText);
  };

  // 渲染预览内容
  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Spin size="large" />
        </div>
      );
    }

    if (error) {
      return <Empty description={error} className="py-20" />;
    }

    switch (category) {
      case "image":
        // 图片预览 - 使用 Base64 数据 URL，支持 OCR 标注
        if (!imageDataUrl) {
          return <Empty description="图片加载中..." className="py-20" />;
        }
        return (
          <div className="flex gap-4 h-[70vh]">
            {/* 左侧：图片预览 */}
            <div
              ref={imageContainerRef}
              className="flex-1 bg-bg-tertiary rounded-lg overflow-hidden flex items-center justify-center relative"
            >
              <img
                src={imageDataUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain"
                onLoad={handleImageLoad}
              />

              {/* OCR 边界框叠加层 - 只显示选中的文字块 */}
              {imageDimensions.width > 0 &&
                selectedBlockIndex !== null &&
                imageContainerRef.current &&
                ocrBlocks[selectedBlockIndex] &&
                (() => {
                  const containerRect =
                    imageContainerRef.current?.getBoundingClientRect();
                  if (!containerRect) return null;

                  const containerAspect =
                    containerRect.width / containerRect.height;
                  const imageAspect =
                    imageDimensions.width / imageDimensions.height;

                  let displayWidth, displayHeight, offsetX, offsetY;
                  if (imageAspect > containerAspect) {
                    displayWidth = containerRect.width;
                    displayHeight = containerRect.width / imageAspect;
                    offsetX = 0;
                    offsetY = (containerRect.height - displayHeight) / 2;
                  } else {
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
                        <div className="absolute -top-5 left-0 text-[10px] px-1.5 rounded bg-primary text-white">
                          {selectedBlockIndex + 1}
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* OCR 加载中遮罩 */}
              {ocrLoading && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Spin size="large" tip="OCR 识别中..." />
                </div>
              )}
            </div>

            {/* 右侧：OCR 结果面板 */}
            {showOcrPanel && ocrBlocks.length > 0 && (
              <div className="w-80 flex flex-col bg-bg-secondary rounded-lg border border-border overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-bg-tertiary border-b border-border">
                  <span className="text-xs font-medium text-text-secondary">
                    OCR 结果 ({ocrBlocks.length} 个文字块)
                  </span>
                  <div className="flex items-center gap-1">
                    <Tooltip title="复制全部文字">
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={handleCopyOcrText}
                      />
                    </Tooltip>
                    <Button
                      type="text"
                      size="small"
                      onClick={() => setShowOcrPanel(false)}
                    >
                      收起
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-1">
                  {ocrBlocks.map((block, index) => (
                    <div
                      key={index}
                      onClick={() => handleBlockClick(index)}
                      className={`p-2 rounded cursor-pointer transition-colors text-xs ${
                        selectedBlockIndex === index
                          ? "bg-primary/20 border border-primary"
                          : "hover:bg-bg-tertiary border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 flex items-center justify-center text-[10px] rounded flex-shrink-0 ${
                            selectedBlockIndex === index
                              ? "bg-primary text-white"
                              : "bg-success text-white"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="text-text-secondary flex-1 truncate">
                          {block.text}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded flex-shrink-0 ${
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OCR 结果切换按钮 */}
            {!showOcrPanel && ocrBlocks.length > 0 && (
              <div className="absolute right-4 top-4">
                <Tooltip title="显示 OCR 结果">
                  <Button
                    type="primary"
                    size="small"
                    icon={<FileTextOutlined />}
                    onClick={() => setShowOcrPanel(true)}
                  >
                    OCR ({ocrBlocks.length})
                  </Button>
                </Tooltip>
              </div>
            )}
          </div>
        );

      case "pdf":
        // PDF 预览 - 使用 Base64 数据 URL
        if (!imageDataUrl) {
          return <Empty description="PDF 加载中..." className="py-20" />;
        }
        return (
          <div className="w-full h-[70vh] rounded overflow-hidden bg-bg-tertiary">
            <iframe
              src={imageDataUrl}
              className="w-full h-full border-0"
              title={fileName}
            />
          </div>
        );

      case "markdown":
        // Markdown 预览
        return (
          <div className="p-4 bg-bg-tertiary rounded-lg max-h-[70vh] overflow-auto">
            {truncated && (
              <div className="mb-2 text-warning text-sm">
                文件较大，仅显示前 50MB 内容
              </div>
            )}
            <MarkdownRenderer content={content} />
          </div>
        );

      case "json":
        // JSON 预览 - 格式化显示
        try {
          const jsonContent = JSON.parse(content);
          const formatted = JSON.stringify(jsonContent, null, 2);
          return (
            <div className="max-h-[70vh] overflow-auto rounded">
              <CodeHighlighter lang="json">{formatted}</CodeHighlighter>
            </div>
          );
        } catch {
          return (
            <div className="p-4 bg-bg-tertiary rounded-lg">
              <Text type="danger">JSON 解析失败</Text>
              <Paragraph className="mt-2 text-text-secondary font-mono text-sm">
                {content}
              </Paragraph>
            </div>
          );
        }

      case "code": {
        // 代码预览
        const language = getCodeLanguage(fileType);
        return (
          <div className="max-h-[70vh] overflow-auto rounded">
            {truncated && (
              <div className="p-2 text-warning text-sm bg-bg-tertiary">
                文件较大，仅显示前 50MB 内容
              </div>
            )}
            <CodeHighlighter lang={language}>{content}</CodeHighlighter>
          </div>
        );
      }

      case "text":
        // 纯文本预览
        return (
          <div className="p-4 bg-bg-tertiary rounded-lg max-h-[70vh] overflow-auto">
            {truncated && (
              <div className="mb-2 text-warning text-sm">
                文件较大，仅显示前 50MB 内容
              </div>
            )}
            <Paragraph className="whitespace-pre-wrap font-mono text-sm text-text-secondary">
              {content}
            </Paragraph>
          </div>
        );

      default:
        return (
          <Empty
            description="不支持预览此类型文件"
            className="py-20"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        );
    }
  };

  // 模态框标题
  const modalTitle = (
    <div className="flex items-center gap-2">
      {getFileIcon(category)}
      <span>{fileName}</span>
      {category === "image" && ocrBlocks.length > 0 && (
        <span className="text-xs text-success ml-2">
          (已识别 {ocrBlocks.length} 个文字块)
        </span>
      )}
    </div>
  );

  return (
    <Modal
      title={modalTitle}
      open={visible}
      onCancel={onClose}
      width={width}
      footer={null}
      centered
      destroyOnClose
    >
      {renderPreview()}
    </Modal>
  );
};

export default WFilePreview;
