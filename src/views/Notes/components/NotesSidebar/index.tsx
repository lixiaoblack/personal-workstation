/**
 * 笔记侧边栏组件
 * 支持文件树展示、展开/收起、新建文件夹/笔记、重命名、删除等功能
 */

import React, { useState, useRef, useEffect } from "react";

// 文件树节点类型
export interface FileTreeNode {
  id: string;
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileTreeNode[];
  expanded?: boolean;
  active?: boolean;
}

interface NotesSidebarProps {
  fileTree: FileTreeNode[];
  selectedFile: FileTreeNode | null;
  onSelectFile: (file: FileTreeNode) => void;
  onToggleFolder: (folderPath: string) => void;
  onCreateFolder: (parentPath: string | null, name: string) => Promise<boolean>;
  onCreateNote: (parentPath: string | null, name: string) => Promise<boolean>;
  onRenameItem: (oldPath: string, newName: string) => Promise<boolean>;
  onDeleteItem: (itemPath: string) => Promise<boolean>;
  onRefresh: () => void;
  loading: boolean;
}

// 文件树节点组件
const FileTreeItem: React.FC<{
  node: FileTreeNode;
  depth: number;
  selectedFile: FileTreeNode | null;
  onSelectFile: (file: FileTreeNode) => void;
  onToggleFolder: (folderPath: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileTreeNode) => void;
}> = ({
  node,
  depth,
  selectedFile,
  onSelectFile,
  onToggleFolder,
  onContextMenu,
}) => {
  const isExpanded = node.expanded ?? false;
  const isSelected = selectedFile?.path === node.path;
  const itemRef = useRef<HTMLDivElement>(null);

  // 当被选中时滚动到可见区域
  useEffect(() => {
    if (isSelected && itemRef.current) {
      // 使用 setTimeout 确保 DOM 已渲染
      setTimeout(() => {
        itemRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    }
  }, [isSelected]);

  const handleClick = () => {
    if (node.type === "folder") {
      onToggleFolder(node.path);
    } else {
      onSelectFile(node);
    }
  };

  return (
    <>
      <div
        ref={itemRef}
        className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 transition-colors ${
          isSelected
            ? "border-l-2 border-primary bg-primary/5 text-primary"
            : "text-text-secondary hover:bg-bg-hover"
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        {/* 展开/收起图标 */}
        {node.type === "folder" && (
          <span
            className={`material-symbols-outlined text-sm transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
          >
            chevron_right
          </span>
        )}

        {/* 文件/文件夹图标 */}
        <span className="material-symbols-outlined">
          {node.type === "folder"
            ? isExpanded
              ? "folder_open"
              : "folder"
            : "description"}
        </span>

        {/* 名称 */}
        <span className="flex-1 truncate text-sm">{node.name}</span>
      </div>

      {/* 子节点 */}
      {node.type === "folder" && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              onToggleFolder={onToggleFolder}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </>
  );
};

// 右键菜单
const ContextMenu: React.FC<{
  x: number;
  y: number;
  node: FileTreeNode;
  onClose: () => void;
  onCreateFolder: () => void;
  onCreateNote: () => void;
  onRename: () => void;
  onDelete: () => void;
}> = ({
  x,
  y,
  node,
  onClose,
  onCreateFolder,
  onCreateNote,
  onRename,
  onDelete,
}) => {
  return (
    <>
      {/* 背景遮罩 */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* 菜单 */}
      <div
        className="fixed z-50 min-w-[160px] rounded-lg border border-border bg-bg-secondary py-1 shadow-xl"
        style={{ left: x, top: y }}
      >
        {node.type === "folder" && (
          <>
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-bg-hover"
              onClick={() => {
                onCreateFolder();
                onClose();
              }}
            >
              <span className="material-symbols-outlined text-sm">
                create_new_folder
              </span>
              新建文件夹
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-bg-hover"
              onClick={() => {
                onCreateNote();
                onClose();
              }}
            >
              <span className="material-symbols-outlined text-sm">
                note_add
              </span>
              新建笔记
            </button>
            <div className="my-1 border-t border-border" />
          </>
        )}
        <button
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-bg-hover"
          onClick={() => {
            onRename();
            onClose();
          }}
        >
          <span className="material-symbols-outlined text-sm">edit</span>
          重命名
        </button>
        <button
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-error hover:bg-bg-hover"
          onClick={() => {
            onDelete();
            onClose();
          }}
        >
          <span className="material-symbols-outlined text-sm">delete</span>
          删除
        </button>
      </div>
    </>
  );
};

// 新建对话框
const CreateDialog: React.FC<{
  type: "folder" | "note";
  onConfirm: (name: string) => void;
  onCancel: () => void;
}> = ({ type, onConfirm, onCancel }) => {
  const [name, setName] = useState("");

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-xl border border-border bg-bg-secondary p-4 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-text-primary">
          {type === "folder" ? "新建文件夹" : "新建笔记"}
        </h3>

        <input
          type="text"
          className="mb-4 w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
          placeholder={type === "folder" ? "文件夹名称" : "笔记名称"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
            if (e.key === "Escape") onCancel();
          }}
        />

        <div className="flex justify-end gap-2">
          <button
            className="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-hover"
            onClick={handleConfirm}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

export const NotesSidebar: React.FC<NotesSidebarProps> = ({
  fileTree,
  selectedFile,
  onSelectFile,
  onToggleFolder,
  onCreateFolder,
  onCreateNote,
  onRenameItem,
  onDeleteItem,
  onRefresh,
  loading,
}) => {
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: FileTreeNode;
  } | null>(null);

  // 新建对话框状态
  const [createDialog, setCreateDialog] = useState<{
    type: "folder" | "note";
    parentPath: string | null;
  } | null>(null);

  // 重命名对话框状态
  const [renameDialog, setRenameDialog] = useState<{
    node: FileTreeNode;
  } | null>(null);

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, node: FileTreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  // 处理新建文件夹
  const handleCreateFolder = async (name: string) => {
    const parentPath = createDialog?.parentPath ?? null;
    await onCreateFolder(parentPath, name);
    setCreateDialog(null);
  };

  // 处理新建笔记
  const handleCreateNote = async (name: string) => {
    const parentPath = createDialog?.parentPath ?? null;
    await onCreateNote(parentPath, name);
    setCreateDialog(null);
  };

  // 处理重命名
  const handleRename = async (name: string) => {
    if (renameDialog) {
      await onRenameItem(renameDialog.node.path, name);
      setRenameDialog(null);
    }
  };

  // 处理删除
  const handleDelete = async () => {
    if (contextMenu) {
      await onDeleteItem(contextMenu.node.path);
      setContextMenu(null);
    }
  };

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-border bg-bg-secondary">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between border-b border-border p-3">
        <span className="text-sm font-medium text-text-primary">笔记列表</span>
        <div className="flex items-center gap-1">
          <button
            className="rounded p-1 text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
            onClick={onRefresh}
            disabled={loading}
            title="刷新"
          >
            <span
              className={`material-symbols-outlined text-sm ${loading ? "animate-spin" : ""}`}
            >
              refresh
            </span>
          </button>
          <button
            className="rounded p-1 text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
            onClick={() =>
              setCreateDialog({ type: "folder", parentPath: null })
            }
            title="新建文件夹"
          >
            <span className="material-symbols-outlined text-sm">
              create_new_folder
            </span>
          </button>
          <button
            className="rounded p-1 text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
            onClick={() => setCreateDialog({ type: "note", parentPath: null })}
            title="新建笔记"
          >
            <span className="material-symbols-outlined text-sm">note_add</span>
          </button>
        </div>
      </div>

      {/* 文件树 */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {fileTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
            <span className="material-symbols-outlined mb-2 text-3xl">
              folder_off
            </span>
            <span className="text-sm">暂无笔记</span>
            <span className="text-xs">点击上方按钮创建</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            {fileTree.map((node) => (
              <FileTreeItem
                key={node.id}
                node={node}
                depth={0}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                onToggleFolder={onToggleFolder}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={() => setContextMenu(null)}
          onCreateFolder={() =>
            setCreateDialog({
              type: "folder",
              parentPath: contextMenu.node.path,
            })
          }
          onCreateNote={() =>
            setCreateDialog({ type: "note", parentPath: contextMenu.node.path })
          }
          onRename={() => setRenameDialog({ node: contextMenu.node })}
          onDelete={handleDelete}
        />
      )}

      {/* 新建对话框 */}
      {createDialog && (
        <CreateDialog
          type={createDialog.type}
          onConfirm={
            createDialog.type === "folder"
              ? handleCreateFolder
              : handleCreateNote
          }
          onCancel={() => setCreateDialog(null)}
        />
      )}

      {/* 重命名对话框 */}
      {renameDialog && (
        <CreateDialog
          type="note"
          onConfirm={handleRename}
          onCancel={() => setRenameDialog(null)}
        />
      )}
    </aside>
  );
};
