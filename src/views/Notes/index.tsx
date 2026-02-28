/**
 * 记事本页面
 * 用于编辑和管理 Markdown 笔记
 */

import React from "react";
import { useNotes } from "@/hooks/useNotes";
import { FolderSelectModal } from "./components/FolderSelectModal";
import { NotesSidebar } from "./components/NotesSidebar";
import { NotesEditor } from "./components/NotesEditor";

const Notes: React.FC = () => {
  const {
    hasRootPath,
    fileTree,
    selectedFile,
    fileContent,
    loading,
    error,
    selectRootFolder,
    selectFile,
    updateFileContent,
    saveFile,
    createFolder,
    createFolderForce,
    createNote,
    createNoteForce,
    renameItem,
    deleteItem,
    toggleFolderExpand,
    refreshFileTree,
    clearError,
  } = useNotes();

  // 未设置根目录时显示选择弹窗
  if (!hasRootPath) {
    return (
      <div className="notes flex h-screen w-full flex-col overflow-hidden">
        <FolderSelectModal onSelect={selectRootFolder} loading={loading} />
      </div>
    );
  }

  return (
    <div className="notes flex  w-full h-full flex-col overflow-hidden">
      <main className="flex flex-1 overflow-hidden">
        {/* 左侧边栏 */}
        <NotesSidebar
          fileTree={fileTree}
          selectedFile={selectedFile}
          onSelectFile={selectFile}
          onToggleFolder={toggleFolderExpand}
          onCreateFolder={createFolder}
          onCreateFolderForce={createFolderForce}
          onCreateNote={createNote}
          onCreateNoteForce={createNoteForce}
          onRenameItem={renameItem}
          onDeleteItem={deleteItem}
          onRefresh={refreshFileTree}
          loading={loading}
        />

        {/* 编辑区域 */}
        <NotesEditor
          selectedFile={selectedFile}
          content={fileContent}
          onContentChange={updateFileContent}
          onSave={saveFile}
        />
      </main>

      {/* AI 助手浮动按钮 */}
      <button className="fixed bottom-12 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 font-medium text-sm text-white shadow-2xl transition-all hover:scale-105">
        <span className="material-symbols-outlined">auto_awesome</span>
        AI 助手
      </button>
    </div>
  );
};

export default Notes;
