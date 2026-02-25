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

// 安全的内容过滤：清理不完整的代码块
const sanitizeMarkdown = (content: string): string => {
  let sanitized = content;

  // 1. 移除空的代码块 ```\n``` 或 ```\n\n```
  sanitized = sanitized.replace(/```\s*```/g, "");
  sanitized = sanitized.replace(/```\n*```/g, "");

  // 2. 移除末尾不完整的代码块开始标记（没有闭合的 ```）
  // 统计 ``` 的数量，如果是奇数则移除最后一个
  const codeBlockMarkers = sanitized.match(/```/g);
  if (codeBlockMarkers && codeBlockMarkers.length % 2 !== 0) {
    // 移除最后一个未闭合的 ```
    const lastIndex = sanitized.lastIndexOf("```");
    if (lastIndex !== -1) {
      // 检查这个 ``` 后面是否只有空白
      const afterMarker = sanitized.slice(lastIndex + 3).trim();
      if (!afterMarker) {
        sanitized = sanitized.slice(0, lastIndex).trimEnd();
      }
    }
  }

  return sanitized;
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
  // pre 标签（代码块容器）
  pre: ({ children }) => {
    // 检查 children 是否为空或只包含空白
    const hasContent = React.Children.toArray(children).some((child) => {
      if (typeof child === "string") {
        return child.trim().length > 0;
      }
      // 如果是 React 元素，检查是否有内容
      if (React.isValidElement(child)) {
        // CodeBlock 组件会在内容为空时返回 null
        return child !== null;
      }
      return true;
    });

    if (!hasContent) {
      return null;
    }

    return <pre className="my-3">{children}</pre>;
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
  // li 内部可能包裹 p 标签，需要处理样式
  li: ({ children }) => (
    <li className="leading-relaxed [&>p]:mb-0 [&>p]:inline">
      {children}
    </li>
  ),
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
    // 清理内容：移除不完整的代码块
    const sanitizedContent = sanitizeMarkdown(content);

    return (
      <div className={`markdown-content ${className}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {sanitizedContent}
        </ReactMarkdown>
      </div>
    );
  }
);

MarkdownRenderer.displayName = "MarkdownRenderer";

export { MarkdownRenderer };
