/**
 * API 文档生成弹窗组件
 * 使用 LLM 根据请求/响应数据生成 Markdown 格式的 API 文档
 */
import React, { useState, useCallback, useEffect, useRef } from "react";
import { Modal, Button, Select, Spin, message } from "antd";
import Editor, { OnMount, BeforeMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useTheme } from "@/contexts";
import {
  initMonacoThemes,
  getMonacoThemeName,
} from "@/styles/themes/monaco-theme";
import { modelStore } from "@/stores";
import { generateApiDoc, ApiDocInput } from "../../services/llmService";

interface Props {
  visible: boolean;
  apiData: ApiDocInput;
  onClose: () => void;
}

const ApiDocModal: React.FC<Props> = ({ visible, apiData, onClose }) => {
  const { resolvedTheme } = useTheme();
  const monacoTheme = getMonacoThemeName(resolvedTheme);

  // 状态
  const [generatedDoc, setGeneratedDoc] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const themesInitializedRef = useRef(false);
  const hasGeneratedRef = useRef(false); // 防止重复生成

  // 模型状态
  const { models, currentModel, setCurrentModel } = modelStore;
  const llmModels = models.filter((m) => m.usageType === "llm" || !m.usageType);

  // 初始化加载模型
  useEffect(() => {
    if (models.length === 0) {
      modelStore.loadModels();
    }
  }, [models.length]);

  // 生成文档
  const handleGenerate = useCallback(async () => {
    const modelToUse = currentModel || llmModels[0];
    if (!modelToUse) {
      message.warning("请先配置 LLM 模型");
      return;
    }

    setIsGenerating(true);
    setGeneratedDoc("");

    try {
      const result = await generateApiDoc(modelToUse, apiData);
      if (result.success && result.content) {
        setGeneratedDoc(result.content);
      } else {
        setGeneratedDoc(`生成失败: ${result.error || "未知错误"}`);
      }
    } catch (error) {
      setGeneratedDoc(
        `生成失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      setIsGenerating(false);
    }
  }, [currentModel, llmModels, apiData]);

  // 弹窗打开时自动生成（只执行一次）
  useEffect(() => {
    if (visible && apiData && !hasGeneratedRef.current) {
      hasGeneratedRef.current = true;
      handleGenerate();
    }
    if (!visible) {
      // 弹窗关闭时重置标记
      hasGeneratedRef.current = false;
    }
  }, [visible, apiData, handleGenerate]);

  // 编辑器挂载前处理 - 初始化主题
  const handleBeforeMount: BeforeMount = (monaco) => {
    // 在编辑器创建前初始化主题，确保主题已注册
    if (!themesInitializedRef.current) {
      initMonacoThemes(monaco);
      themesInitializedRef.current = true;
    }
  };

  // 编辑器挂载
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    if (!monacoRef.current) {
      monacoRef.current = monaco;
    }
  };

  // 复制
  const handleCopy = useCallback(() => {
    if (generatedDoc) {
      navigator.clipboard.writeText(generatedDoc);
      message.success("已复制到剪贴板");
    }
  }, [generatedDoc]);

  // 内容变化
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setGeneratedDoc(value);
    }
  }, []);

  return (
    <Modal
      title="API 文档生成"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      centered
    >
      <div className="space-y-4">
        {/* 模型选择 */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-secondary">使用模型:</span>
          <Select
            value={currentModel?.id}
            onChange={(id) => {
              const model = llmModels.find((m) => m.id === id);
              if (model) setCurrentModel(model);
            }}
            options={llmModels.map((m) => ({
              value: m.id,
              label: m.name,
            }))}
            className="w-48"
            size="small"
            placeholder="选择模型"
          />
          <Button
            size="small"
            onClick={handleGenerate}
            loading={isGenerating}
            disabled={!currentModel && llmModels.length === 0}
          >
            重新生成
          </Button>
        </div>

        {/* 文档编辑器 */}
        <div className="h-[450px] rounded-lg overflow-hidden border border-border">
          {isGenerating ? (
            <div className="flex items-center justify-center h-full">
              <Spin tip="正在生成 API 文档..." />
            </div>
          ) : (
            <Editor
              height="100%"
              language="markdown"
              value={generatedDoc}
              onChange={handleEditorChange}
              beforeMount={handleBeforeMount}
              onMount={handleEditorMount}
              theme={monacoTheme}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineNumbers: "on",
                wordWrap: "on",
                automaticLayout: true,
                scrollBeyondLastLine: false,
                folding: true,
                foldingStrategy: "indentation",
                bracketPairColorization: { enabled: true },
                scrollbar: {
                  vertical: "auto",
                  horizontal: "auto",
                },
              }}
            />
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              icon={
                <span className="material-symbols-outlined !text-sm">
                  content_copy
                </span>
              }
              onClick={handleCopy}
              disabled={isGenerating || !generatedDoc}
            >
              复制文档
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onClose}>关闭</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ApiDocModal;
