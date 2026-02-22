/**
 * WFilePreview - 文件预览组件
 *
 * 支持的文件类型：
 * - Markdown (.md)
 * - JSON (.json)
 * - PDF (.pdf)
 * - 图片 (.jpg, .jpeg, .png, .gif, .webp, .svg)
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
import React, { useState, useEffect, useMemo } from "react";
import { Modal, Spin, Empty, Typography } from "antd";
import {
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  CodeOutlined,
} from "@ant-design/icons";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { CodeHighlighter } from "@ant-design/x";

const { Text, Paragraph } = Typography;

// 文件类型分类
type FileCategory = "markdown" | "json" | "pdf" | "image" | "text" | "code" | "unsupported";

// 获取文件分类
const getFileCategory = (fileType: string): FileCategory => {
  const ext = fileType.toLowerCase().replace(".", "");
  
  if (["md", "markdown"].includes(ext)) return "markdown";
  if (["json"].includes(ext)) return "json";
  if (["pdf"].includes(ext)) return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext)) return "image";
  if (["txt", "log", "csv"].includes(ext)) return "text";
  if ([
    "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "h", "cs", "go", "rs",
    "css", "scss", "sass", "less", "html", "xml", "yaml", "yml", "toml",
    "sh", "bash", "zsh", "sql", "md", "json"
  ].includes(ext)) return "code";
  
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
  /** 知识库 ID，用于读取文件内容 */
  knowledgeId?: string;
  /** 文件 ID，用于读取文件内容 */
  fileId?: string;
  onClose: () => void;
  width?: number | string;
}

const WFilePreview: React.FC<WFilePreviewProps> = ({
  visible,
  filePath,
  fileName,
  fileType,
  knowledgeId,
  fileId,
  onClose,
  width = 900,
}) => {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  const category = useMemo(() => getFileCategory(fileType), [fileType]);

  // 读取文件内容
  useEffect(() => {
    if (!visible || !filePath) return;

    // 图片和 PDF 不需要读取内容，直接使用 file:// 协议
    if (category === "image" || category === "pdf") {
      setContent("");
      setLoading(false);
      return;
    }

    // 不支持的类型
    if (category === "unsupported") {
      setContent("");
      setLoading(false);
      return;
    }

    // 必须有 knowledgeId 和 fileId 才能读取文件内容
    if (!knowledgeId || !fileId) {
      setError("缺少文件标识，无法读取内容");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setTruncated(false);

    // 通过 Electron API 读取文件内容
    window.electronAPI
      .readKnowledgeFileContent(knowledgeId, fileId)
      .then((result) => {
        if (result.success && result.content) {
          setContent(result.content);
          setTruncated(result.truncated || false);
        } else {
          setError(result.error || "无法读取文件内容");
        }
      })
      .catch((err) => {
        setError(err.message || "读取文件失败");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [visible, filePath, category, knowledgeId, fileId]);
  
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
      return (
        <Empty
          description={error}
          className="py-20"
        />
      );
    }
    
    switch (category) {
      case "image":
        // 图片预览 - 使用 file:// 协议
        return (
          <div className="flex items-center justify-center p-4 bg-bg-tertiary rounded-lg min-h-[400px]">
            <img
              src={`file://${filePath}`}
              alt={fileName}
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          </div>
        );
      
      case "pdf":
        // PDF 预览 - 使用 iframe 或 embed
        return (
          <div className="w-full h-[70vh] rounded overflow-hidden bg-bg-tertiary">
            <iframe
              src={`file://${filePath}`}
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
                文件较大，仅显示前 1MB 内容
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
              <CodeHighlighter lang="json">
                {formatted}
              </CodeHighlighter>
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
                文件较大，仅显示前 1MB 内容
              </div>
            )}
            <CodeHighlighter lang={language}>
              {content}
            </CodeHighlighter>
          </div>
        );
      }
      
      case "text":
        // 纯文本预览
        return (
          <div className="p-4 bg-bg-tertiary rounded-lg max-h-[70vh] overflow-auto">
            {truncated && (
              <div className="mb-2 text-warning text-sm">
                文件较大，仅显示前 1MB 内容
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
