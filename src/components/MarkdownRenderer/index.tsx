/**
 * MarkdownRenderer Markdown 渲染组件
 * 支持代码高亮、GFM 语法、流式渲染
 */
import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeHighlighter } from "@ant-design/x";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// 代码块组件
const CodeBlock: React.FC<{
  language?: string;
  children: string;
}> = ({ language, children }) => {
  // 如果内容为空，不渲染代码块
  const trimmedContent = children.trim();
  if (!trimmedContent) {
    return null;
  }

  return (
    <CodeHighlighter lang={language || "text"}>
      {trimmedContent}
    </CodeHighlighter>
  );
};

// Markdown 组件配置
const components: Components = {
  // 代码块
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || "");
    const isInline = !match && !className;

    if (isInline) {
      return (
        <code
          className="px-1.5 py-0.5 bg-bg-tertiary rounded text-primary text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <CodeBlock language={match?.[1]}>
        {String(children).replace(/\n$/, "")}
      </CodeBlock>
    );
  },
  // 段落
  p: ({ children }) => (
    <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
  ),
  // 标题
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h3>
  ),
  // 列表
  ul: ({ children }) => (
    <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  // 引用
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/50 pl-4 py-2 my-3 bg-bg-tertiary/50 rounded-r">
      {children}
    </blockquote>
  ),
  // 链接
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      {children}
    </a>
  ),
  // 表格
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full border border-border rounded-lg">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-bg-tertiary">{children}</thead>,
  th: ({ children }) => (
    <th className="px-4 py-2 text-left border-b border-border font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2 border-b border-border">{children}</td>
  ),
  // 分割线
  hr: () => <hr className="my-4 border-border" />,
  // 图片
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt}
      className="max-w-full h-auto rounded-lg my-3"
      loading="lazy"
    />
  ),
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = memo(
  ({ content, className = "" }) => {
    return (
      <div className={`markdown-content ${className}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }
);

MarkdownRenderer.displayName = "MarkdownRenderer";

export { MarkdownRenderer };
