/**
 * LLM 类型定义弹窗组件
 * 用于展示和编辑 LLM 生成的 TypeScript 类型定义
 */
import React, { useState, useCallback, useEffect, useRef } from "react";
import { Modal, Button, Select, Spin } from "antd";
import Editor, { OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import * as prettier from "prettier/standalone";
import * as parserEstree from "prettier/plugins/estree";
import * as parserTypescript from "prettier/plugins/typescript";
import { useTheme } from "@/contexts";
import {
  initMonacoThemes,
  getMonacoThemeName,
} from "@/styles/themes/monaco-theme";
import { modelStore } from "@/stores";
import {
  generateTypeScriptTypes,
} from "../../services/llmService";

interface Props {
  visible: boolean;
  jsonData: string;
  onClose: () => void;
  onSave: (types: string) => Promise<void>;
}

const LlmTypesModal: React.FC<Props> = ({
  visible,
  jsonData,
  onClose,
  onSave,
}) => {
  const { resolvedTheme } = useTheme();
  const monacoTheme = getMonacoThemeName(resolvedTheme);

  // 状态
  const [generatedTypes, setGeneratedTypes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const themesInitializedRef = useRef(false);

  // 模型状态
  const { models, currentModel, setCurrentModel } = modelStore;
  const llmModels = models.filter(
    (m) => m.usageType === "llm" || !m.usageType
  );

  // 初始化加载模型
  useEffect(() => {
    if (models.length === 0) {
      modelStore.loadModels();
    }
  }, [models.length]);

  // 生成类型定义
  const handleGenerate = useCallback(async () => {
    const modelToUse = currentModel || llmModels[0];
    if (!modelToUse) {
      return;
    }

    setIsGenerating(true);
    setGeneratedTypes("");

    try {
      const result = await generateTypeScriptTypes(modelToUse, jsonData);
      if (result.success && result.content) {
        setGeneratedTypes(result.content);
      } else {
        setGeneratedTypes(`// 生成失败: ${result.error || "未知错误"}`);
      }
    } catch (error) {
      setGeneratedTypes(
        `// 生成失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      setIsGenerating(false);
    }
  }, [currentModel, llmModels, jsonData]);

  // 弹窗打开时自动生成
  useEffect(() => {
    if (visible && jsonData) {
      handleGenerate();
    }
  }, [visible, jsonData, handleGenerate]);

  // 编辑器挂载
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    if (!monacoRef.current) {
      monacoRef.current = monaco;
    }

    if (!themesInitializedRef.current) {
      initMonacoThemes(monaco);
      themesInitializedRef.current = true;
    }
  };

  // 复制
  const handleCopy = useCallback(() => {
    if (generatedTypes) {
      navigator.clipboard.writeText(generatedTypes);
    }
  }, [generatedTypes]);

  // 格式化
  const handleFormat = useCallback(async () => {
    if (editorRef.current) {
      try {
        const currentValue = editorRef.current.getValue();
        const formatted = await prettier.format(currentValue, {
          parser: "typescript",
          plugins: [parserTypescript, parserEstree],
          semi: true,
          singleQuote: false,
          tabWidth: 2,
          printWidth: 80,
        });
        editorRef.current.setValue(formatted);
        setGeneratedTypes(formatted);
      } catch {
        editorRef.current.getAction("editor.action.formatDocument")?.run();
      }
    }
  }, []);

  // 保存
  const handleSave = useCallback(async () => {
    if (!generatedTypes || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(generatedTypes);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }, [generatedTypes, isSaving, onSave, onClose]);

  // 内容变化
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setGeneratedTypes(value);
    }
  }, []);

  return (
    <Modal
      title="TypeScript 类型定义"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
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

        {/* 类型定义编辑器 */}
        <div className="h-[400px] rounded-lg overflow-hidden border border-border">
          {isGenerating ? (
            <div className="flex items-center justify-center h-full">
              <Spin tip="正在生成类型定义..." />
            </div>
          ) : (
            <Editor
              height="100%"
              language="typescript"
              value={generatedTypes}
              onChange={handleEditorChange}
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
                <span className="material-symbols-outlined text-sm">
                  format_align_left
                </span>
              }
              onClick={handleFormat}
              disabled={isGenerating || !generatedTypes}
            >
              格式化
            </Button>
            <Button
              icon={
                <span className="material-symbols-outlined text-sm">
                  content_copy
                </span>
              }
              onClick={handleCopy}
              disabled={isGenerating || !generatedTypes}
            >
              复制
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onClose}>取消</Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={isSaving}
              disabled={isGenerating || !generatedTypes}
            >
              保存到数据库
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default LlmTypesModal;
