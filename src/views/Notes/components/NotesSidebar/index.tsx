/**
 * 笔记侧边栏组件
 */

import React from "react";
import type { FileNode } from "../../config";

interface NotesSidebarProps {
  fileTree: FileNode[];
}

const FileTreeItem: React.FC<{
  node: FileNode;
  depth: number;
}> = ({ node, depth }) => {
  const hasChildren = node.children && node.children.length > 0;

  return (
    <>
      <div
        className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 transition-colors ${
          node.active
            ? "border-l-2 border-primary bg-primary/5 text-primary"
            : "text-text-secondary hover:bg-bg-hover"
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren && (
          <span className="material-symbols-outlined text-sm">
            {node.expanded ? "expand_more" : "chevron_right"}
          </span>
        )}
        <span className="material-symbols-outlined">{node.icon}</span>
        <span className="text-sm">{node.name}</span>
      </div>
      {hasChildren && node.expanded && (
        <div>
          {node.children!.map((child) => (
            <FileTreeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </>
  );
};

export const NotesSidebar: React.FC<NotesSidebarProps> = ({ fileTree }) => {
  return (
    <aside className="w-64 flex-shrink-0 border-r border-border flex flex-col bg-bg-secondary">
      <div className="p-4">
        <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 font-medium text-sm text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover">
          <span className="material-symbols-outlined">add</span>
          新建笔记
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="space-y-1">
          {fileTree.map((node) => (
            <FileTreeItem key={node.id} node={node} depth={0} />
          ))}
        </div>
      </div>

      <div className="border-t border-border p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-text-tertiary">
          <span>存储空间</span>
          <span>75%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-tertiary">
          <div className="h-full w-3/4 bg-primary" />
        </div>
      </div>
    </aside>
  );
};
