/**
 * Notes 笔记模块 Hook
 * 管理笔记文件夹设置、文件树、文件操作等状态
 */

import { useState, useEffect, useCallback } from "react";

// 本地存储 key
const LAST_OPENED_FILE_KEY = "notes_last_opened_file";

// 类型定义
export interface FileTreeNode {
  id: string;
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileTreeNode[];
  expanded?: boolean;
  active?: boolean;
}

export interface NotesState {
  hasRootPath: boolean;
  rootPath: string | null;
  fileTree: FileTreeNode[];
  selectedFile: FileTreeNode | null;
  fileContent: string;
  loading: boolean;
  error: string | null;
}

export interface UseNotesReturn extends NotesState {
  // 文件夹操作
  selectRootFolder: () => Promise<boolean>;
  setRootPath: (path: string) => Promise<void>;

  // 文件树操作
  refreshFileTree: () => Promise<void>;

  // 文件操作
  selectFile: (file: FileTreeNode) => Promise<void>;
  updateFileContent: (content: string) => void;
  saveFile: (content: string) => Promise<boolean>;
  createFolder: (parentPath: string | null, name: string) => Promise<boolean>;
  createNote: (
    parentPath: string | null,
    name: string,
    content?: string
  ) => Promise<boolean>;
  renameItem: (oldPath: string, newName: string) => Promise<boolean>;
  deleteItem: (itemPath: string) => Promise<boolean>;

  // 展开/收起
  toggleFolderExpand: (folderPath: string) => void;

  // 清除错误
  clearError: () => void;
}

export function useNotes(): UseNotesReturn {
  const [hasRootPath, setHasRootPath] = useState(false);
  const [rootPath, setRootPathState] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileTreeNode | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 展开状态管理
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

  // 在文件树中查找文件节点
  const findFileInTree = useCallback(
    (filePath: string, nodes: FileTreeNode[]): FileTreeNode | null => {
      for (const node of nodes) {
        if (node.path === filePath && node.type === "file") {
          return node;
        }
        if (node.children) {
          const found = findFileInTree(filePath, node.children);
          if (found) return found;
        }
      }
      return null;
    },
    []
  );

  // 获取文件路径的所有父文件夹路径
  const getParentFolders = useCallback(
    (filePath: string, rootPath: string): string[] => {
      const parents: string[] = [];
      let currentPath = filePath;
      
      while (currentPath !== rootPath) {
        const lastSep = Math.max(
          currentPath.lastIndexOf("/"),
          currentPath.lastIndexOf("\\")
        );
        if (lastSep === -1) break;
        
        currentPath = currentPath.substring(0, lastSep);
        if (currentPath && currentPath !== rootPath) {
          parents.push(currentPath);
        }
      }
      
      return parents;
    },
    []
  );

  // 初始化检查根目录
  useEffect(() => {
    const initNotes = async () => {
      try {
        const hasRoot = await window.electronAPI.notesHasRootPath();
        setHasRootPath(hasRoot);

        if (hasRoot) {
          const root = await window.electronAPI.notesGetRootPath();
          setRootPathState(root);

          // 扫描并获取文件树
          if (root) {
            await window.electronAPI.notesScanFolder(root);
            const tree = await window.electronAPI.notesGetFileTree();
            setFileTree(tree);

            // 恢复上次打开的文件
            const lastOpenedFile = localStorage.getItem(LAST_OPENED_FILE_KEY);
            if (lastOpenedFile) {
              const fileNode = findFileInTree(lastOpenedFile, tree);
              if (fileNode) {
                // 自动选中上次打开的文件
                const result =
                  await window.electronAPI.notesReadFile(fileNode.path);
                if (result.success && result.content !== undefined) {
                  setFileContent(result.content);
                  setSelectedFile(fileNode);
                  
                  // 展开所有父文件夹
                  const parentFolders = getParentFolders(fileNode.path, root);
                  if (parentFolders.length > 0) {
                    setExpandedFolders((prev) => {
                      const newSet = new Set(prev);
                      parentFolders.forEach((folder) => newSet.add(folder));
                      return newSet;
                    });
                  }
                }
              } else {
                // 文件不存在了，清除记录
                localStorage.removeItem(LAST_OPENED_FILE_KEY);
              }
            }
          }
        }
      } catch (err) {
        console.error("[useNotes] 初始化失败:", err);
        setError("初始化笔记模块失败");
      }
    };

    initNotes();
  }, [findFileInTree, getParentFolders]);

  // 选择根目录
  const selectRootFolder = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const result = await window.electronAPI.notesSelectFolder();

      if (result.canceled || result.filePaths.length === 0) {
        setLoading(false);
        return false;
      }

      const selectedPath = result.filePaths[0];

      // 验证文件夹
      const validation =
        await window.electronAPI.notesValidateFolder(selectedPath);
      if (!validation.valid) {
        setError(validation.error || "文件夹验证失败");
        setLoading(false);
        return false;
      }

      // 设置根目录
      await window.electronAPI.notesSetRootPath(selectedPath);
      setRootPathState(selectedPath);
      setHasRootPath(true);

      // 扫描文件夹
      const scanResult = await window.electronAPI.notesScanFolder(selectedPath);
      if (!scanResult.success) {
        setError(scanResult.error || "扫描文件夹失败");
        setLoading(false);
        return false;
      }

      // 获取文件树
      const tree = await window.electronAPI.notesGetFileTree();
      setFileTree(tree);

      setLoading(false);
      return true;
    } catch (err) {
      console.error("[useNotes] 选择根目录失败:", err);
      setError("选择根目录失败");
      setLoading(false);
      return false;
    }
  }, []);

  // 设置根目录
  const setRootPath = useCallback(async (path: string) => {
    await window.electronAPI.notesSetRootPath(path);
    setRootPathState(path);
    setHasRootPath(true);

    // 扫描文件夹
    await window.electronAPI.notesScanFolder(path);
    const tree = await window.electronAPI.notesGetFileTree();
    setFileTree(tree);
  }, []);

  // 刷新文件树
  const refreshFileTree = useCallback(async () => {
    if (!rootPath) return;

    try {
      setLoading(true);
      await window.electronAPI.notesScanFolder(rootPath);
      const tree = await window.electronAPI.notesGetFileTree();
      setFileTree(tree);
      setLoading(false);
    } catch (err) {
      console.error("[useNotes] 刷新文件树失败:", err);
      setError("刷新文件树失败");
      setLoading(false);
    }
  }, [rootPath]);

  // 选择文件
  const selectFile = useCallback(async (file: FileTreeNode) => {
    if (file.type !== "file") return;

    try {
      setLoading(true);
      const result = await window.electronAPI.notesReadFile(file.path);

      if (result.success && result.content !== undefined) {
        setFileContent(result.content);
        setSelectedFile(file);
        // 保存到本地存储
        localStorage.setItem(LAST_OPENED_FILE_KEY, file.path);
      } else {
        setError(result.error || "读取文件失败");
      }

      setLoading(false);
    } catch (err) {
      console.error("[useNotes] 读取文件失败:", err);
      setError("读取文件失败");
      setLoading(false);
    }
  }, []);

  // 更新文件内容（编辑时）
  const updateFileContent = useCallback((content: string) => {
    setFileContent(content);
  }, []);

  // 保存文件
  const saveFile = useCallback(
    async (content: string): Promise<boolean> => {
      if (!selectedFile) return false;

      try {
        const result = await window.electronAPI.notesSaveFile(
          selectedFile.path,
          content
        );

        if (result.success) {
          setFileContent(content);
          return true;
        } else {
          setError(result.error || "保存文件失败");
          return false;
        }
      } catch (err) {
        console.error("[useNotes] 保存文件失败:", err);
        setError("保存文件失败");
        return false;
      }
    },
    [selectedFile]
  );

  // 创建文件夹
  const createFolder = useCallback(
    async (parentPath: string | null, name: string): Promise<boolean> => {
      try {
        const result = await window.electronAPI.notesCreateFolder(
          parentPath,
          name
        );

        if (result.success) {
          await refreshFileTree();
          return true;
        } else {
          setError(result.error || "创建文件夹失败");
          return false;
        }
      } catch (err) {
        console.error("[useNotes] 创建文件夹失败:", err);
        setError("创建文件夹失败");
        return false;
      }
    },
    [refreshFileTree]
  );

  // 创建笔记
  const createNote = useCallback(
    async (
      parentPath: string | null,
      name: string,
      content?: string
    ): Promise<boolean> => {
      try {
        const result = await window.electronAPI.notesCreateNote(
          parentPath,
          name,
          content
        );

        if (result.success) {
          await refreshFileTree();

          // 如果创建成功，自动选中新文件
          if (result.path) {
            const newNode: FileTreeNode = {
              id: result.path,
              name: name.endsWith(".md") ? name : `${name}.md`,
              type: "file",
              path: result.path,
            };
            await selectFile(newNode);
          }

          return true;
        } else {
          setError(result.error || "创建笔记失败");
          return false;
        }
      } catch (err) {
        console.error("[useNotes] 创建笔记失败:", err);
        setError("创建笔记失败");
        return false;
      }
    },
    [refreshFileTree, selectFile]
  );

  // 重命名
  const renameItem = useCallback(
    async (oldPath: string, newName: string): Promise<boolean> => {
      try {
        const result = await window.electronAPI.notesRenameItem(
          oldPath,
          newName
        );

        if (result.success) {
          await refreshFileTree();

          // 如果重命名的是当前选中的文件，更新选中状态
          if (selectedFile?.path === oldPath && result.newPath) {
            setSelectedFile({
              ...selectedFile,
              id: result.newPath,
              name: newName,
              path: result.newPath,
            });
          }

          return true;
        } else {
          setError(result.error || "重命名失败");
          return false;
        }
      } catch (err) {
        console.error("[useNotes] 重命名失败:", err);
        setError("重命名失败");
        return false;
      }
    },
    [refreshFileTree, selectedFile]
  );

  // 删除
  const deleteItem = useCallback(
    async (itemPath: string): Promise<boolean> => {
      try {
        const result = await window.electronAPI.notesDeleteItem(itemPath);

        if (result.success) {
          await refreshFileTree();

          // 如果删除的是当前选中的文件，清除选中状态
          if (selectedFile?.path === itemPath) {
            setSelectedFile(null);
            setFileContent("");
            localStorage.removeItem(LAST_OPENED_FILE_KEY);
          }

          return true;
        } else {
          setError(result.error || "删除失败");
          return false;
        }
      } catch (err) {
        console.error("[useNotes] 删除失败:", err);
        setError("删除失败");
        return false;
      }
    },
    [refreshFileTree, selectedFile]
  );

  // 切换文件夹展开状态
  const toggleFolderExpand = useCallback((folderPath: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 更新文件树的展开状态
  const updateTreeExpandState = useCallback(
    (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.map((node) => ({
        ...node,
        expanded: expandedFolders.has(node.path),
        children: node.children
          ? updateTreeExpandState(node.children)
          : undefined,
      }));
    },
    [expandedFolders]
  );

  return {
    hasRootPath,
    rootPath,
    fileTree: updateTreeExpandState(fileTree),
    selectedFile,
    fileContent,
    loading,
    error,
    selectRootFolder,
    setRootPath,
    refreshFileTree,
    selectFile,
    updateFileContent,
    saveFile,
    createFolder,
    createNote,
    renameItem,
    deleteItem,
    toggleFolderExpand,
    clearError,
  };
}
