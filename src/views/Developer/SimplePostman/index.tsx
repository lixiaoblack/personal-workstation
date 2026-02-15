/**
 * SimplePostman 简易Postman页面
 */
import React, { useState } from "react";
import { App, Input, Select, Button } from "antd";

const { TextArea } = Input;

const SimplePostman: React.FC = () => {
  const { message } = App.useApp();
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [body, setBody] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [responseTime, setResponseTime] = useState(0);
  const [responseStatus, setResponseStatus] = useState(0);

  // 发送请求
  const handleSend = async () => {
    if (!url) {
      message.warning("请输入请求URL");
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      let parsedHeaders = {};
      try {
        parsedHeaders = JSON.parse(headers);
      } catch {
        // 忽略解析错误
      }

      const options: RequestInit = {
        method,
        headers: parsedHeaders as HeadersInit,
      };

      if (method !== "GET" && method !== "HEAD" && body) {
        options.body = body;
      }

      const res = await fetch(url, options);
      const endTime = Date.now();
      setResponseTime(endTime - startTime);
      setResponseStatus(res.status);

      const contentType = res.headers.get("content-type") || "";
      let data;
      if (contentType.includes("application/json")) {
        data = await res.json();
        setResponse(JSON.stringify(data, null, 2));
      } else {
        data = await res.text();
        setResponse(data);
      }

      message.success("请求成功");
    } catch (error) {
      const endTime = Date.now();
      setResponseTime(endTime - startTime);
      setResponseStatus(0);
      setResponse(`请求失败: ${error instanceof Error ? error.message : "未知错误"}`);
      message.error("请求失败");
    } finally {
      setLoading(false);
    }
  };

  // 清空
  const handleClear = () => {
    setUrl("");
    setHeaders('{\n  "Content-Type": "application/json"\n}');
    setBody("");
    setResponse("");
    setResponseTime(0);
    setResponseStatus(0);
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary overflow-hidden">
      {/* URL输入栏 */}
      <header className="h-16 flex-shrink-0 border-b border-border flex items-center px-6 gap-4">
        <Select
          value={method}
          onChange={setMethod}
          style={{ width: 120 }}
          options={[
            { value: "GET", label: "GET" },
            { value: "POST", label: "POST" },
            { value: "PUT", label: "PUT" },
            { value: "DELETE", label: "DELETE" },
            { value: "PATCH", label: "PATCH" },
          ]}
          className="h-10"
        />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="输入请求URL..."
          className="flex-1 h-10"
          onPressEnter={handleSend}
        />
        <Button
          type="primary"
          onClick={handleSend}
          loading={loading}
          className="h-10 px-6"
        >
          发送
        </Button>
        <Button onClick={handleClear} className="h-10">
          清空
        </Button>
      </header>

      {/* 请求/响应区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：请求配置 */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="flex items-center px-4 py-2 bg-bg-tertiary/50 border-b border-border">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">
              请求配置
            </span>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Headers */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Headers
              </label>
              <TextArea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder="JSON格式的请求头..."
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            {/* Body */}
            {method !== "GET" && method !== "HEAD" && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Body
                </label>
                <TextArea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="请求体内容..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* 右侧：响应结果 */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary/50 border-b border-border">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">
              响应结果
            </span>
            <div className="flex items-center gap-4 text-[11px]">
              {responseStatus > 0 && (
                <span
                  className={`${
                    responseStatus < 400 ? "text-success" : "text-error"
                  }`}
                >
                  Status: {responseStatus}
                </span>
              )}
              {responseTime > 0 && (
                <span className="text-text-tertiary">{responseTime}ms</span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {response ? (
              <pre className="text-sm font-mono text-text-primary whitespace-pre-wrap">
                {response}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-text-tertiary">
                <div className="text-center">
                  <span className="material-symbols-outlined text-4xl opacity-50">
                    api
                  </span>
                  <p className="mt-2">响应结果将显示在这里</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { SimplePostman };
export default SimplePostman;
