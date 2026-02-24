/**
 * AIChatInput - 输入区域组件
 * 使用 Ant Design X Sender 组件
 * 包含工具栏、输入框、发送按钮、知识库选择器、语音输入
 * 支持粘贴文件、URL 检测、'/' 快捷选择知识库
 */
import React, {
  memo,
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { Select, Switch, Tooltip, message } from "antd";
import { Sender } from "@ant-design/x";
import type {
  ModelConfig,
  KnowledgeInfo,
  KnowledgeDocumentInfo,
} from "@/types/electron";
import { ConnectionState } from "@/types/electron";
import type { StreamState } from "../../config";
import { useSpeechCapability } from "@/hooks/useSpeechCapability";
import KnowledgeSuggestion from "../KnowledgeSuggestion";

// SpeechRecognition 类型定义
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
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
  selectedKnowledgeId: string | null;
  onKnowledgeChange: (knowledgeId: string | null) => void;
  // 知识库文档映射（用于 '/' 快捷选择）
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
  // 快捷选择知识库回调
  onSelectKnowledgeQuick?: (knowledgeId: string, knowledgeName: string) => void;
  onSelectDocumentQuick?: (
    knowledgeId: string,
    documentId: string,
    documentName: string
  ) => void;
}

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
    selectedKnowledgeId,
    onKnowledgeChange,
    knowledgeDocuments = {},
    onPasteFile,
    onPasteImage,
    onDetectUrl,
    onSelectKnowledgeQuick,
    onSelectDocumentQuick,
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

    // 打印语音能力状态（调试用）
    useEffect(() => {
      console.log("[AIChatInput] 语音能力:", {
        isSupported: speechCapability.isSupported,
        hasPermission: speechCapability.hasPermission,
        error: speechCapability.error,
      });
    }, [
      speechCapability.isSupported,
      speechCapability.hasPermission,
      speechCapability.error,
    ]);

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
          console.log("[AIChatInput] 语音识别结果:", transcript);
          onInputChange(transcript);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error(
            "[AIChatInput] 语音识别错误:",
            event.error,
            event.message
          );
          setIsRecording(false);
          if (event.error === "not-allowed") {
            message.error("麦克风权限被拒绝，请在系统设置中允许访问麦克风");
          } else if (event.error === "no-speech") {
            message.warning("未检测到语音，请重试");
          } else {
            message.error(`语音识别错误: ${event.error}`);
          }
        };

        recognition.onend = () => {
          console.log("[AIChatInput] 语音识别结束");
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }

      return () => {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {
            // 忽略停止错误
          }
        }
      };
    }, [speechCapability.isSupported, onInputChange]);

    // 处理录音状态变化
    const handleRecordingChange = useCallback(
      async (recording: boolean) => {
        console.log("[AIChatInput] 录音状态变化:", recording);

        if (recording) {
          // 开始录音前先请求权限
          if (speechCapability.hasPermission === false) {
            const granted = await speechCapability.requestPermission();
            if (!granted) {
              message.error("无法获取麦克风权限");
              return;
            }
          }

          // 开始语音识别
          if (recognitionRef.current) {
            try {
              console.log("[AIChatInput] 开始语音识别...");
              recognitionRef.current.start();
              setIsRecording(true);
            } catch (err) {
              console.error("[AIChatInput] 启动语音识别失败:", err);
              message.error("启动语音识别失败");
            }
          }
        } else {
          // 停止语音识别
          if (recognitionRef.current) {
            try {
              console.log("[AIChatInput] 停止语音识别...");
              recognitionRef.current.stop();
            } catch {
              // 忽略停止错误
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
      if (onCancel) {
        onCancel();
      }
    }, [onCancel]);

    // 处理内容变化
    // handleChange 由 handleChangeWithUrlDetection 替代

    // ========== 粘贴文件检测 ==========

    // URL 正则表达式（移到组件外部避免依赖问题）
    // 处理粘贴事件
    const handlePaste = useCallback(
      (e: React.ClipboardEvent) => {
        const clipboardData = e.clipboardData;
        if (!clipboardData) return;

        // 检查文件
        const files = clipboardData.files;
        if (files.length > 0) {
          const file = files[0] as File & { path?: string };
          const filePath = file.path; // Electron 中可获取本地路径

          if (!filePath) {
            message.warning("无法获取文件路径，请使用其他方式上传");
            return;
          }

          const mimeType = file.type || "application/octet-stream";
          const isImage = mimeType.startsWith("image/");

          const fileInfo = {
            path: filePath,
            name: file.name,
            size: file.size,
            mimeType,
          };

          if (isImage && onPasteImage) {
            // 图片类型，生成缩略图
            const reader = new FileReader();
            reader.onload = () => {
              onPasteImage({
                ...fileInfo,
                thumbnail: reader.result as string,
              });
            };
            reader.readAsDataURL(file);
          } else if (onPasteFile) {
            onPasteFile(fileInfo);
          }

          e.preventDefault();
          return;
        }
      },
      [onPasteFile, onPasteImage]
    );

    // ========== URL 检测 ==========

    // 检测输入中的 URL
    const detectUrlInInput = useCallback(
      (value: string) => {
        if (!onDetectUrl) return;

        // 简单检测：如果输入的是一个 URL
        const trimmed = value.trim();
        if (/^https?:\/\/.+/i.test(trimmed)) {
          onDetectUrl(trimmed);
        }
      },
      [onDetectUrl]
    );

    // 包装 onChange 以检测 URL
    const handleChangeWithUrlDetection = useCallback(
      (value: string) => {
        onInputChange(value);
        // 延迟检测，避免频繁触发
        setTimeout(() => detectUrlInInput(value), 100);
      },
      [onInputChange, detectUrlInInput]
    );

    // ========== 快捷选择知识库 ==========

    // 选中的知识库显示
    const selectedKnowledgeDisplay = useMemo(() => {
      if (!selectedKnowledgeId) return null;
      const kb = knowledgeList.find((k) => k.id === selectedKnowledgeId);
      return kb ? `@${kb.name}` : null;
    }, [selectedKnowledgeId, knowledgeList]);

    // 计算 allowSpeech 配置
    // 使用受控模式，手动处理语音识别
    const allowSpeechConfig = speechCapability.isSupported
      ? {
          recording: isRecording,
          onRecordingChange: handleRecordingChange,
        }
      : false;

    // 工具栏头部
    const header = (
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/50">
        <div className="flex items-center gap-1">
          {/* 添加附件按钮 */}
          <Tooltip title="添加附件">
            <button
              className="p-2 text-text-tertiary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">
                attach_file
              </span>
            </button>
          </Tooltip>

          {/* 上传图片按钮 */}
          <Tooltip title="上传图片">
            <button
              className="p-2 text-text-tertiary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">image</span>
            </button>
          </Tooltip>

          <div className="h-4 w-[1px] bg-border mx-1"></div>

          {/* 快捷模板按钮 */}
          <Tooltip title="快捷模板">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-text-tertiary hover:text-primary hover:bg-primary/10 rounded-lg transition-all text-xs font-medium"
              type="button"
            >
              <span className="material-symbols-outlined text-base">
                temp_preferences_custom
              </span>
              <span>快捷模板</span>
            </button>
          </Tooltip>

          <div className="h-4 w-[1px] bg-border mx-1"></div>

          {/* 知识库选择器 - 仅在 Agent 模式下显示 */}
          {agentMode && knowledgeList.length > 0 && (
            <Select
              value={selectedKnowledgeId}
              onChange={onKnowledgeChange}
              placeholder="选择知识库"
              allowClear
              size="small"
              style={{ minWidth: 150 }}
              options={knowledgeList.map((kb) => ({
                value: kb.id,
                label: `${kb.name} (${kb.documentCount}文档)`,
              }))}
            />
          )}

          <div className="h-4 w-[1px] bg-border mx-1"></div>

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

        {/* 快捷键提示 */}
        <div className="text-[10px] text-text-tertiary font-medium">
          按 Enter 发送，Shift + Enter 换行
        </div>
      </div>
    );

    // 底部提示
    const footer = (
      <div className="flex justify-center py-2">
        <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
          <span className="material-symbols-outlined text-base">info</span>
          <span>AI 可能会产生错误，请核实重要信息</span>
        </div>
      </div>
    );

    // 调试日志
    console.log("[AIChatInput] render, knowledgeList:", knowledgeList?.length);

    return (
      <div className="p-6 bg-transparent">
        <div className="max-w-4xl mx-auto">
          <KnowledgeSuggestion
            knowledgeList={knowledgeList}
            knowledgeDocuments={knowledgeDocuments}
            onSelectKnowledge={onSelectKnowledgeQuick}
            onSelectDocument={onSelectDocumentQuick}
          >
            {({ onTrigger, onKeyDown: onSuggestionKeyDown, open }) => {
              // 存储触发函数供 onChange 使用
              const handleInputChange = (value: string) => {
                handleChangeWithUrlDetection(value);
                
                // 检测 '/' 输入，触发 Suggestion
                if (value.endsWith("/") && !open) {
                  onTrigger(value.slice(-1));
                } else if (!value.includes("/") && open) {
                  onTrigger(false); // 关闭
                } else if (open && value.includes("/")) {
                  // 更新搜索关键词
                  const slashIndex = value.lastIndexOf("/");
                  const keyword = value.slice(slashIndex + 1);
                  onTrigger("/" + keyword);
                }
              };

              return (
                <Sender
                  value={inputValue}
                  onChange={handleInputChange}
                  onSubmit={handleSubmit}
                  onCancel={isLoading ? handleCancel : undefined}
                  onKeyDown={(e) => {
                    onSuggestionKeyDown(e);
                  }}
                  onPaste={handlePaste}
                  loading={isLoading}
                  disabled={isDisabled}
                  placeholder={
                    selectedKnowledgeDisplay
                      ? `针对「${selectedKnowledgeDisplay}」提问...`
                      : "在这里输入您的问题，输入 / 快速选择知识库"
                  }
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
          </KnowledgeSuggestion>
        </div>
      </div>
    );
  }
);

AIChatInput.displayName = "AIChatInput";

export default AIChatInput;
