/**
 * AIChatInput - 输入区域组件
 * 使用 Ant Design X Sender 组件
 * 包含工具栏、输入框、发送按钮、知识库标签选择器、语音输入
 * 支持粘贴文件、URL 检测、'/','@','#' 快捷选择
 */
import React, {
  memo,
  useCallback,
  useState,
  useRef,
  useEffect,
} from "react";
import { Switch, Tooltip, message } from "antd";
import { Sender, Suggestion } from "@ant-design/x";
import type { SuggestionItem } from "@ant-design/x/es/suggestion";
import { CloseOutlined, FolderOutlined } from "@ant-design/icons";
import type {
  ModelConfig,
  KnowledgeInfo,
  KnowledgeDocumentInfo,
} from "@/types/electron";
import { ConnectionState } from "@/types/electron";
import type { StreamState } from "../../config";
import { useSpeechCapability } from "@/hooks/useSpeechCapability";

// SpeechRecognition 类型定义
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

/** 标签项类型 */
export interface TagItem {
  id: string;
  label: string;
  type: "knowledge" | "document" | "topic" | "mention";
  trigger: string;
  data?: Record<string, unknown>;
}

interface AIChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  currentModel: ModelConfig | null;
  connectionState: ConnectionState;
  streamState: StreamState;
  agentMode: boolean;
  onAgentModeChange: (checked: boolean) => void;
  onSend: () => void;
  onCancel?: () => void;
  // 知识库相关
  knowledgeList: KnowledgeInfo[];
  selectedTags: TagItem[];
  onTagsChange: (tags: TagItem[]) => void;
  knowledgeDocuments?: Record<string, KnowledgeDocumentInfo[]>;
  // 附件相关
  onPasteFile?: (file: {
    path: string;
    name: string;
    size: number;
    mimeType: string;
  }) => void;
  onPasteImage?: (file: {
    path: string;
    name: string;
    size: number;
    mimeType: string;
    thumbnail?: string;
  }) => void;
  onDetectUrl?: (url: string) => void;
}

// URL 正则表达式
const URL_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;

const AIChatInput: React.FC<AIChatInputProps> = memo(
  ({
    inputValue,
    onInputChange,
    currentModel,
    connectionState,
    streamState,
    agentMode,
    onAgentModeChange,
    onSend,
    onCancel,
    knowledgeList,
    selectedTags,
    onTagsChange,
    onPasteFile,
    onPasteImage,
    onDetectUrl,
  }) => {
    // 判断是否可以发送
    const canSend =
      inputValue.trim() &&
      connectionState === ConnectionState.CONNECTED &&
      streamState.status !== "streaming" &&
      currentModel;

    // 是否处于加载/流式状态
    const isLoading = streamState.status === "streaming";

    // 是否禁用输入
    const isDisabled =
      connectionState !== ConnectionState.CONNECTED || isLoading;

    // 语音能力检测
    const speechCapability = useSpeechCapability();

    // 录音状态
    const [isRecording, setIsRecording] = useState(false);

    // SpeechRecognition 实例
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);

    // 初始化 SpeechRecognition
    useEffect(() => {
      if (!speechCapability.isSupported) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any;
      const SpeechRecognition =
        win.SpeechRecognition || win.webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "zh-CN";

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          onInputChange(transcript);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          setIsRecording(false);
          if (event.error === "not-allowed") {
            message.error("麦克风权限被拒绝");
          } else if (event.error !== "no-speech") {
            message.error(`语音识别错误: ${event.error}`);
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }

      return () => {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {
            // 忽略
          }
        }
      };
    }, [speechCapability.isSupported, onInputChange]);

    // 处理录音
    const handleRecordingChange = useCallback(
      async (recording: boolean) => {
        if (recording) {
          if (speechCapability.hasPermission === false) {
            const granted = await speechCapability.requestPermission();
            if (!granted) {
              message.error("无法获取麦克风权限");
              return;
            }
          }
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start();
              setIsRecording(true);
            } catch {
              message.error("启动语音识别失败");
            }
          }
        } else {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch {
              // 忽略
            }
          }
          setIsRecording(false);
        }
      },
      [speechCapability]
    );

    // 处理提交
    const handleSubmit = useCallback(() => {
      if (canSend) {
        onSend();
      }
    }, [canSend, onSend]);

    // 处理取消
    const handleCancel = useCallback(() => {
      onCancel?.();
    }, [onCancel]);

    // 处理粘贴
    const handlePaste = useCallback(
      (e: React.ClipboardEvent) => {
        const clipboardData = e.clipboardData;
        if (!clipboardData) return;

        const files = clipboardData.files;
        if (files.length > 0) {
          for (const file of files) {
            if (file.type.startsWith("image/")) {
              const reader = new FileReader();
              reader.onload = () => {
                onPasteImage?.({
                  path: file.name,
                  name: file.name,
                  size: file.size,
                  mimeType: file.type,
                  thumbnail: reader.result as string,
                });
              };
              reader.readAsDataURL(file);
            } else {
              onPasteFile?.({
                path: file.name,
                name: file.name,
                size: file.size,
                mimeType: file.type,
              });
            }
          }
          return;
        }

        // 检查文本中的 URL
        const text = clipboardData.getData("text");
        const urlMatch = text.match(URL_REGEX);
        if (urlMatch) {
          onDetectUrl?.(urlMatch[0]);
        }
      },
      [onPasteFile, onPasteImage, onDetectUrl]
    );

    // 删除标签
    const handleRemoveTag = useCallback(
      (tagId: string, trigger: string) => {
        onTagsChange(
          selectedTags.filter((t) => !(t.id === tagId && t.trigger === trigger))
        );
      },
      [selectedTags, onTagsChange]
    );

    // 获取知识库建议项
    const getKnowledgeItems = useCallback(
      (keyword?: string): SuggestionItem[] => {
        // keyword 格式："/" 或 "/关键词"，需要去掉开头的 /
        const kw = keyword?.startsWith("/") 
          ? keyword.slice(1).toLowerCase() 
          : (keyword?.toLowerCase() || "");
        console.log("[AIChatInput] getKnowledgeItems:", { keyword, kw, knowledgeListCount: knowledgeList.length });
        const items = knowledgeList
          .filter(
            (kb) =>
              !kw ||
              kb.name.toLowerCase().includes(kw) ||
              kb.description?.toLowerCase().includes(kw)
          )
          .map((kb) => ({
            label: kb.name,
            value: `${kb.name}|::|${kb.id}`,
            icon: <FolderOutlined className="text-primary" />,
            extra: `${kb.documentCount} 个文档${
              kb.description ? ` · ${kb.description}` : ""
            }`,
          }));
        console.log("[AIChatInput] getKnowledgeItems result:", items.length, items);
        return items;
      },
      [knowledgeList]
    );

    // 处理输入变化（包含 URL 检测和触发符号处理）
    const handleInputChange = useCallback(
      (value: string) => {
        onInputChange(value);

        // 检测 URL
        const urlMatch = value.match(URL_REGEX);
        if (urlMatch) {
          onDetectUrl?.(urlMatch[0]);
        }
      },
      [onInputChange, onDetectUrl]
    );

    // 语音配置
    const allowSpeechConfig = speechCapability.isSupported
      ? {
          recording: isRecording,
          onRecordingChange: handleRecordingChange,
        }
      : false;

    // 头部工具栏
    const header = (
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border">
        {/* 已选标签 */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <span
                key={`${tag.trigger}-${tag.id}`}
                className="flex items-center gap-1 px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded-md text-xs"
              >
                <span className="opacity-70">{tag.trigger}</span>
                <span>{tag.label}</span>
                <CloseOutlined
                  className="cursor-pointer hover:text-error"
                  onClick={() => handleRemoveTag(tag.id, tag.trigger)}
                />
              </span>
            ))}
          </div>
        )}

        <div className="flex-1"></div>

        {/* Agent 模式开关 */}
        <Tooltip
          title={
            agentMode
              ? "Agent 模式：智能体将使用工具完成任务"
              : "普通模式：直接对话"
          }
        >
          <div className="flex items-center gap-2 px-2">
            <Switch
              size="small"
              checked={agentMode}
              onChange={onAgentModeChange}
              checkedChildren="🤖"
              unCheckedChildren="💬"
            />
            <span
              className={`text-xs font-medium ${
                agentMode ? "text-primary" : "text-text-tertiary"
              }`}
            >
              {agentMode ? "Agent" : "对话"}
            </span>
          </div>
        </Tooltip>
      </div>
    );

    // 底部提示
    const footer = (
      <div className="flex justify-between items-center py-2">
        <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
          <span className="material-symbols-outlined text-base">info</span>
          <span>AI 可能会产生错误，请核实重要信息</span>
        </div>
        <div className="text-[10px] text-text-tertiary font-medium">
          Enter 发送 · Shift+Enter 换行 · / 选择知识库
        </div>
      </div>
    );

    return (
      <div className="p-6 bg-transparent">
        <div className="max-w-4xl mx-auto">
          <Suggestion
            items={getKnowledgeItems}
            onSelect={(value) => {
              // 解析选择值：label|::|id
              const [label, id] = value.split("|::|");
              const newTag: TagItem = {
                id: id || label,
                label,
                type: "knowledge",
                trigger: "/",
              };
              // 检查是否已存在
              if (!selectedTags.find((t) => t.id === newTag.id && t.trigger === newTag.trigger)) {
                onTagsChange([...selectedTags, newTag]);
              }
              // 清空输入框中的触发符号
              onInputChange("");
            }}
            styles={{
              popup: { maxHeight: 280, overflow: "auto" },
            }}
            classNames={{
              popup: "bg-bg-secondary border border-border rounded-lg shadow-xl",
            }}
          >
            {({ onTrigger, onKeyDown, open }) => {
              // 处理输入变化
              const handleChange = (val: string) => {
                handleInputChange(val);
                // 检测 '/' 触发
                if (val.includes("/")) {
                  const idx = val.lastIndexOf("/");
                  onTrigger(val.slice(idx));
                } else if (open) {
                  onTrigger(false);
                }
              };
              
              // 处理键盘事件
              const handleKeyDown = (e: React.KeyboardEvent) => {
                // 触发符号
                if (e.key === "/") {
                  onTrigger("/");
                }
                // 当下拉框打开时，回车键用于选择项目，阻止 Sender 的提交行为
                if (e.key === "Enter" && !e.shiftKey && open) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                // 调用 Suggestion 的 onKeyDown
                onKeyDown(e);
              };
              
              return (
                <Sender
                  value={inputValue}
                  onChange={handleChange}
                  onSubmit={open ? undefined : handleSubmit}
                  onCancel={isLoading ? handleCancel : undefined}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  loading={isLoading}
                  disabled={isDisabled}
                  placeholder="输入您的问题，输入 / 选择知识库"
                  submitType="enter"
                  autoSize={{ minRows: 3, maxRows: 8 }}
                  header={header}
                  footer={footer}
                  allowSpeech={allowSpeechConfig}
                  className="bg-bg-secondary border border-border rounded-2xl shadow-xl focus-within:border-primary/50 transition-all"
                  classNames={{
                    input: "text-text-primary placeholder:text-text-tertiary",
                  }}
                />
              );
            }}
          </Suggestion>
        </div>
      </div>
    );
  }
);

AIChatInput.displayName = "AIChatInput";

export default AIChatInput;
