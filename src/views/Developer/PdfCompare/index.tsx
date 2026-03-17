/**
 * PdfCompare PDF 识别对比页面
 *
 * 功能：
 * 1. 上传 PDF 文件
 * 2. 左侧显示结构化数据（标题、内容、页码）
 * 3. 右侧显示 PDF 预览
 * 4. 点击左侧内容，右侧自动滚动并高亮对应区域
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { App, Upload, Spin, Empty, Switch, Tooltip } from "antd";
import type { UploadFile } from "antd";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { PdfBlock, PdfParseResult, PdfServiceStatus } from "./types";

// 设置 PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PdfCompare: React.FC = () => {
  const { message } = App.useApp();

  // PDF 文件状态
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string>("");
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 解析结果
  const [parseResult, setParseResult] = useState<PdfParseResult | null>(null);
  const [loading, setLoading] = useState(false);

  // PDF 预览状态
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.0);

  // 高亮状态
  const [highlightBlock, setHighlightBlock] = useState<PdfBlock | null>(null);

  // OCR 模式
  const [useOcr, setUseOcr] = useState(false);

  // 服务状态
  const [serviceStatus, setServiceStatus] = useState<PdfServiceStatus | null>(
    null,
  );

  // Refs
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // 检查服务状态
  useEffect(() => {
    checkServiceStatus();
  }, []);

  const checkServiceStatus = async () => {
    try {
      const result = await window.electronAPI.pdfStatus();
      if (result.success && result.data) {
        setServiceStatus(result.data);
      }
    } catch (error) {
      console.error("[PdfCompare] 检查服务状态失败:", error);
    }
  };

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      message.error("请上传 PDF 格式的文件");
      return false;
    }

    // 读取文件为 Base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPdfFile(file);
      setPdfBase64(base64);
      setParseResult(null);
      setHighlightBlock(null);

      // 自动解析
      await parsePdf(base64);
    };
    reader.readAsDataURL(file);

    setFileList([file as unknown as UploadFile]);
    return false;
  };

  // 解析 PDF
  const parsePdf = async (base64: string) => {
    setLoading(true);
    try {
      const result = await window.electronAPI.pdfParse(base64, useOcr);
      if (result.success && result.data) {
        setParseResult(result.data);
        if (result.data.error) {
          message.error(result.data.error);
        } else {
          message.success(`解析成功，共 ${result.data.totalPages} 页`);
        }
      } else {
        message.error(result.error || "解析失败");
      }
    } catch (error) {
      console.error("[PdfCompare] 解析失败:", error);
      message.error("PDF 解析失败，请检查服务是否正常");
    } finally {
      setLoading(false);
    }
  };

  // PDF 加载成功
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  // 点击块，高亮并滚动
  const handleBlockClick = useCallback((block: PdfBlock) => {
    setHighlightBlock(block);

    // 滚动到对应页面
    const pageContainer = pageRefs.current.get(block.pageNumber);
    if (pageContainer) {
      pageContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // 清空
  const handleClear = () => {
    setPdfFile(null);
    setPdfBase64("");
    setParseResult(null);
    setFileList([]);
    setHighlightBlock(null);
    setNumPages(0);
  };

  // 缩放控制
  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));

  // 获取块类型显示名称
  const getBlockTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      title: "标题",
      heading1: "一级标题",
      heading2: "二级标题",
      paragraph: "段落",
      list: "列表",
    };
    return typeMap[type] || "文本";
  };

  // 获取块类型样式类
  const getBlockTypeClass = (type: string) => {
    const classMap: Record<string, string> = {
      title: "text-lg font-bold text-primary",
      heading1: "text-base font-bold text-text-primary",
      heading2: "text-sm font-semibold text-text-primary",
      paragraph: "text-sm text-text-secondary",
      list: "text-sm text-text-secondary",
    };
    return classMap[type] || "text-sm text-text-secondary";
  };

  return (
    <div className="flex flex-col h-full min-h-full bg-bg-primary overflow-hidden">
      {/* 工具栏 */}
      <header className="h-14 flex-shrink-0 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Upload
            accept=".pdf"
            fileList={fileList}
            beforeUpload={handleFileUpload}
            onRemove={handleClear}
            maxCount={1}
            showUploadList={false}
          >
            <button className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1.5 text-sm">
              <span className="material-symbols-outlined text-lg">
                upload_file
              </span>
              上传 PDF
            </button>
          </Upload>

          {pdfFile && (
            <>
              <button
                onClick={() => parsePdf(pdfBase64)}
                disabled={loading}
                className="px-3 py-1.5 text-text-secondary hover:bg-bg-tertiary rounded-lg transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">
                  refresh
                </span>
                重新解析
              </button>
              <button
                onClick={handleClear}
                className="px-3 py-1.5 text-error hover:bg-error/10 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
              >
                <span className="material-symbols-outlined text-lg">
                  delete
                </span>
                清空
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* OCR 模式开关 */}
          <div className="flex items-center gap-2">
            <Tooltip title="扫描版 PDF 或图片型 PDF 需要开启 OCR 模式">
              <span className="text-sm text-text-secondary">OCR 模式</span>
            </Tooltip>
            <Switch checked={useOcr} onChange={setUseOcr} size="small" />
          </div>

          {/* 缩放控制 */}
          {pdfFile && (
            <div className="flex items-center gap-1 border-l border-border pl-4">
              <button
                onClick={handleZoomOut}
                className="p-1 text-text-secondary hover:bg-bg-tertiary rounded transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  remove
                </span>
              </button>
              <span className="text-xs text-text-tertiary w-12 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 text-text-secondary hover:bg-bg-tertiary rounded transition-colors"
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </button>
            </div>
          )}

          {/* 服务状态 */}
          {serviceStatus && (
            <span
              className={`text-xs flex items-center gap-1 ${serviceStatus.available ? "text-success" : "text-error"}`}
            >
              <span className="material-symbols-outlined text-sm">
                {serviceStatus.available ? "check_circle" : "warning"}
              </span>
              {serviceStatus.available ? "PDF 服务就绪" : "PDF 服务不可用"}
            </span>
          )}
        </div>
      </header>

      {/* 内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：结构化数据 */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r border-border bg-bg-secondary">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary/50 border-b border-border">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">
              结构化数据
            </span>
            {parseResult && (
              <span className="text-xs text-text-tertiary">
                {parseResult.totalPages} 页 ·{" "}
                {parseResult.pages.reduce((acc, p) => acc + p.blocks.length, 0)}{" "}
                个块
              </span>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Spin tip="解析中..." />
              </div>
            ) : parseResult ? (
              <div className="p-2">
                {parseResult.pages.map((page) => (
                  <div key={page.pageNumber} className="mb-4">
                    {/* 页码标题 */}
                    <div className="sticky top-0 bg-bg-secondary z-10 px-2 py-1 text-xs font-bold text-primary border-b border-border mb-2">
                      第 {page.pageNumber} 页
                    </div>

                    {/* 块列表 */}
                    <div className="space-y-1">
                      {page.blocks.map((block) => (
                        <div
                          key={block.id}
                          onClick={() => handleBlockClick(block)}
                          className={`p-2 rounded-lg cursor-pointer transition-all border ${
                            highlightBlock?.id === block.id
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-bg-tertiary border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                block.type === "title"
                                  ? "bg-primary text-white"
                                  : block.type === "heading1"
                                    ? "bg-primary/80 text-white"
                                    : block.type === "heading2"
                                      ? "bg-primary/60 text-white"
                                      : "bg-bg-tertiary text-text-tertiary"
                              }`}
                            >
                              {getBlockTypeName(block.type)}
                            </span>
                            {block.confidence !== undefined &&
                              block.confidence > 0 && (
                                <span
                                  className={`text-[10px] ${
                                    block.confidence > 0.9
                                      ? "text-success"
                                      : block.confidence > 0.7
                                        ? "text-warning"
                                        : "text-error"
                                  }`}
                                >
                                  {(block.confidence * 100).toFixed(0)}%
                                </span>
                              )}
                          </div>
                          <div
                            className={`line-clamp-2 ${getBlockTypeClass(block.type)}`}
                          >
                            {block.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-text-tertiary">
                <Empty
                  description="请上传 PDF 文件"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            )}
          </div>
        </div>

        {/* 右侧：PDF 预览 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary/50 border-b border-border">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">
              PDF 预览
            </span>
            {pdfFile && (
              <span className="text-xs text-text-tertiary truncate max-w-xs">
                {pdfFile.name}
              </span>
            )}
          </div>

          <div
            ref={containerRef}
            className="flex-1 overflow-auto bg-bg-tertiary p-4"
          >
            {!pdfFile ? (
              <div className="flex items-center justify-center h-full text-text-tertiary">
                <div className="text-center">
                  <span className="material-symbols-outlined text-6xl opacity-30">
                    picture_as_pdf
                  </span>
                  <p className="mt-2">PDF 预览将显示在这里</p>
                </div>
              </div>
            ) : (
              <Document
                file={pdfBase64}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<Spin tip="加载 PDF..." />}
                error={<Empty description="PDF 加载失败" />}
              >
                <div className="flex flex-col items-center gap-4">
                  {Array.from(new Array(numPages), (_, index) => {
                    const pageNumber = index + 1;
                    const isHighlightPage =
                      highlightBlock?.pageNumber === pageNumber;

                    return (
                      <div
                        key={`page_${pageNumber}`}
                        ref={(el) => {
                          if (el) pageRefs.current.set(pageNumber, el);
                        }}
                        className="relative bg-white shadow-lg"
                        style={{ width: `${scale * 100}%`, maxWidth: "800px" }}
                      >
                        <Page
                          pageNumber={pageNumber}
                          scale={scale}
                          loading={<Spin />}
                          className="relative"
                        />

                        {/* 高亮层 */}
                        {isHighlightPage && highlightBlock && (
                          <HighlightOverlay
                            block={highlightBlock}
                            scale={scale}
                          />
                        )}

                        {/* 页码标签 */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-400 bg-white/80 px-2 py-0.5 rounded">
                          {pageNumber} / {numPages}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Document>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 高亮层组件
const HighlightOverlay: React.FC<{ block: PdfBlock; scale: number }> = ({
  block,
  scale,
}) => {
  const [x0, y0, x1, y1] = block.bbox;

  // 计算高亮框位置
  // PDF 坐标原点在左下角，需要转换为浏览器坐标系（原点左上角）
  // 注意：这里需要根据实际 PDF 页面高度进行转换
  // 暂时使用简化版本，后续可以优化
  const style: React.CSSProperties = {
    position: "absolute",
    left: x0 * scale,
    top: y0 * scale,
    width: (x1 - x0) * scale,
    height: (y1 - y0) * scale,
    backgroundColor: "rgba(60, 131, 246, 0.25)",
    border: "2px solid #3c83f6",
    borderRadius: "2px",
    pointerEvents: "none",
    transition: "all 0.3s ease",
    zIndex: 10,
    boxShadow: "0 0 8px rgba(60, 131, 246, 0.4)",
  };

  return <div style={style} />;
};

export { PdfCompare };
export default PdfCompare;
