/**
 * PostmanAIPanel AI助手面板组件
 */
import React, { useState, useRef, useEffect } from "react";
import { Input, Button, Empty, Spin } from "antd";
import { App } from "antd";

// AI 消息类型
interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// AI 调试历史记录
interface DebugHistory {
  id: string;
  time: string;
  content: string;
}

interface Props {
  // 当前请求信息（用于上下文）
  requestInfo?: {
    method: string;
    url: string;
    status?: number;
    error?: string;
  };

  // AI 对话
  messages: AIMessage[];
  onSendMessage: (message: string) => void;
  loading?: boolean;

  // 调试历史
  debugHistory: DebugHistory[];
}

const PostmanAIPanel: React.FC<Props> = ({
  requestInfo,
  messages,
  onSendMessage,
  loading,
  debugHistory,
}) => {
  const { message } = App.useApp();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 发送消息
  const handleSend = () => {
    if (!inputValue.trim()) {
      message.warning("请输入内容");
      return;
    }
    onSendMessage(inputValue.trim());
    setInputValue("");
  };

  // 快捷操作
  const quickActions = [
    { label: "生成 Python SDK", action: "生成此请求的 Python SDK 代码" },
    { label: "生成 JMeter 脚本", action: "生成 JMeter 测试脚本" },
    { label: "分析响应", action: "分析当前响应数据" },
    { label: "调试建议", action: "给出调试建议" },
  ];

  return (
    <aside className="w-80 border-l border-border flex flex-col bg-bg-primary">
      {/* 标题 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-xl">smart_toy</span>
          <h2 className="text-base font-bold">AI 助手</h2>
        </div>
        <p className="text-xs text-text-tertiary mt-1">
          由 AI 驱动的开发与调试建议
        </p>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 当前请求提示 */}
        {requestInfo && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
            <p className="text-xs leading-relaxed text-text-secondary">
              识别到您正在进行{" "}
              <span className="font-bold text-primary">
                {requestInfo.method}
              </span>{" "}
              请求测试。
              {requestInfo.status && (
                <span>
                  {" "}
                  状态码:{" "}
                  <span
                    className={`font-bold ${
                      requestInfo.status < 400 ? "text-success" : "text-error"
                    }`}
                  >
                    {requestInfo.status}
                  </span>
                </span>
              )}
            </p>
            {requestInfo.error && (
              <p className="text-xs text-error mt-1">
                错误: {requestInfo.error}
              </p>
            )}
          </div>
        )}

        {/* 快捷操作 */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-text-tertiary uppercase">
            快捷操作
          </h3>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((item) => (
              <Button
                key={item.label}
                size="small"
                onClick={() => onSendMessage(item.action)}
                className="text-xs"
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* 对话消息 */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-text-tertiary uppercase">
            对话
          </h3>
          {messages.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="开始与 AI 对话"
              className="py-4"
            />
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl text-xs ${
                    msg.role === "user"
                      ? "bg-primary/10 text-text-secondary ml-4"
                      : "bg-bg-tertiary text-text-primary mr-4"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-[10px] text-text-tertiary mt-2">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-text-tertiary text-xs">
                  <Spin size="small" />
                  <span>AI 正在思考...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 调试历史 */}
        {debugHistory.length > 0 && (
          <div className="pt-4 border-t border-border">
            <h3 className="text-xs font-bold text-text-tertiary uppercase mb-3">
              AI 调试历史
            </h3>
            <div className="space-y-3">
              {debugHistory.map((item) => (
                <div
                  key={item.id}
                  className="text-[11px] p-2 rounded-lg bg-bg-tertiary/50"
                >
                  <p className="text-text-tertiary mb-1 italic">{item.time}</p>
                  <p className="text-text-secondary">{item.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="p-4 border-t border-border bg-bg-primary">
        <div className="relative">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="向 AI 提问..."
            onPressEnter={handleSend}
            className="pr-10"
          />
          <Button
            type="primary"
            size="small"
            onClick={handleSend}
            loading={loading}
            className="absolute right-1 top-1/2 -translate-y-1/2"
            icon={
              <span className="material-symbols-outlined text-sm">send</span>
            }
          />
        </div>
      </div>
    </aside>
  );
};

export { PostmanAIPanel };
export type { AIMessage, DebugHistory };
export default PostmanAIPanel;
