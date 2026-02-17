/**
 * AIChatSidebar - 对话历史侧边栏组件
 * 显示对话分组列表，支持新建、删除、编辑对话
 */
import React, { memo } from "react";
import { Dropdown, Modal } from "antd";
import type { ConversationGroup, Conversation } from "@/types/electron";

interface AIChatSidebarProps {
  conversationGroups: ConversationGroup[];
  activeConversation: Conversation | null;
  onNewConversation: () => void;
  onSelectConversation: (id: number) => void;
  onDeleteConversation: (id: number) => void;
  onEditTitle: (conversation: Conversation) => void;
}

const AIChatSidebar: React.FC<AIChatSidebarProps> = memo(
  ({
    conversationGroups,
    activeConversation,
    onNewConversation,
    onSelectConversation,
    onDeleteConversation,
    onEditTitle,
  }) => {
    return (
      <aside className="w-72 flex flex-col border-r border-border bg-bg-secondary/50 shrink-0">
        {/* 头部 */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-text-primary font-bold text-sm tracking-wide">
            最近对话
          </h3>
          <button className="text-text-tertiary hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-xl">search</span>
          </button>
        </div>

        {/* 对话列表 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {/* 新建对话按钮 */}
          <button
            className="w-full flex items-center gap-2 px-3 py-2.5 mb-3 rounded-lg border border-dashed border-border hover:border-primary hover:text-primary transition-all text-text-tertiary text-sm"
            onClick={onNewConversation}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>新建对话</span>
          </button>

          {/* 对话分组 */}
          {conversationGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="px-3 text-[10px] uppercase font-bold text-text-tertiary mb-2 tracking-widest">
                {group.label}
              </p>
              {group.conversations.map((conv) => (
                <Dropdown
                  key={conv.id}
                  trigger={["contextMenu"]}
                  menu={{
                    items: [
                      {
                        key: "edit",
                        label: "编辑标题",
                        icon: (
                          <span className="material-symbols-outlined text-sm">
                            edit
                          </span>
                        ),
                        onClick: () =>
                          onEditTitle({
                            id: conv.id,
                            title: conv.title,
                            modelId: null,
                            modelName: conv.modelName,
                            messageCount: conv.messageCount,
                            createdAt: conv.createdAt,
                            updatedAt: conv.updatedAt,
                          } as Conversation),
                      },
                      {
                        key: "delete",
                        label: "删除对话",
                        icon: (
                          <span className="material-symbols-outlined text-sm">
                            delete
                          </span>
                        ),
                        danger: true,
                        onClick: () => {
                          Modal.confirm({
                            title: "删除对话",
                            content: "确定要删除这个对话吗？",
                            okText: "删除",
                            cancelText: "取消",
                            okButtonProps: { danger: true },
                            onOk: () => onDeleteConversation(conv.id),
                          });
                        },
                      },
                    ],
                  }}
                >
                  <div
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      activeConversation?.id === conv.id
                        ? "bg-bg-tertiary border border-border"
                        : "hover:bg-bg-hover"
                    }`}
                    onClick={() => onSelectConversation(conv.id)}
                  >
                    <span
                      className={`material-symbols-outlined text-lg ${
                        activeConversation?.id === conv.id
                          ? "text-primary"
                          : "text-text-tertiary"
                      }`}
                    >
                      chat_bubble
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          activeConversation?.id === conv.id
                            ? "text-text-primary"
                            : "text-text-secondary"
                        }`}
                      >
                        {conv.title || "新对话"}
                      </p>
                      <p className="text-text-tertiary text-[11px]">
                        {conv.messageCount}条消息
                      </p>
                    </div>
                    <span
                      className="material-symbols-outlined text-text-tertiary text-lg opacity-0 group-hover:opacity-100 hover:text-error transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        Modal.confirm({
                          title: "删除对话",
                          content: "确定要删除这个对话吗？",
                          okText: "删除",
                          cancelText: "取消",
                          okButtonProps: { danger: true },
                          onOk: () => onDeleteConversation(conv.id),
                        });
                      }}
                    >
                      delete
                    </span>
                  </div>
                </Dropdown>
              ))}
            </div>
          ))}

          {/* 空状态 */}
          {conversationGroups.length === 0 && (
            <div className="text-center py-8 text-text-tertiary text-sm">
              暂无对话记录
            </div>
          )}
        </div>
      </aside>
    );
  }
);

AIChatSidebar.displayName = "AIChatSidebar";

export default AIChatSidebar;
