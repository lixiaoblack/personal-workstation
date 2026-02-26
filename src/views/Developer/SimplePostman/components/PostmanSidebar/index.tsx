/**
 * PostmanSidebar 左侧边栏组件
 */
import React, { useState, useMemo } from "react";
import { Input, Button, Collapse, Empty, Select, Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  SIDEBAR_MENU_ITEMS,
  type SidebarMenuKey,
  type ApiFolder,
  type RequestConfig,
  type HttpMethod,
  type GlobalConfig,
} from "../../config";

const { Panel } = Collapse;

// HTTP 方法颜色映射
const METHOD_COLORS: Record<string, string> = {
  GET: "text-green-500",
  POST: "text-yellow-500",
  PUT: "text-blue-500",
  DELETE: "text-red-500",
  PATCH: "text-purple-500",
  HEAD: "text-gray-500",
  OPTIONS: "text-gray-500",
};

interface Props {
  // Swagger 解析相关
  swaggerUrl: string;
  swaggerLoading: boolean;
  onSwaggerUrlChange: (url: string) => void;
  onParseSwagger: () => void;
  onUploadSwagger: () => void;

  // 菜单和请求相关
  activeMenu: SidebarMenuKey;
  onMenuChange: (key: SidebarMenuKey) => void;
  folders: ApiFolder[];
  requests: RequestConfig[];
  activeRequestId?: string;
  onRequestSelect: (id: string) => void;

  // 同步状态
  syncing?: boolean;
  syncStatus?: string;

  // 文件夹操作
  onEditFolder: (folder: ApiFolder) => void;
  onDeleteFolder: (folderId: string) => void;

  // 全局配置和环境
  globalConfig: GlobalConfig;
  currentEnvironment: string;
  onEnvironmentChange: (envKey: string) => void;
  onOpenGlobalConfig: () => void;

  // 项目选择
  activeProjectId?: string;
  onProjectChange: (projectId: string) => void;
}

const PostmanSidebar: React.FC<Props> = ({
  swaggerUrl,
  swaggerLoading,
  onSwaggerUrlChange,
  onParseSwagger,
  onUploadSwagger,
  activeMenu,
  onMenuChange,
  folders,
  requests,
  activeRequestId,
  onRequestSelect,
  syncing,
  syncStatus,
  onEditFolder,
  onDeleteFolder,
  globalConfig,
  currentEnvironment,
  onEnvironmentChange,
  onOpenGlobalConfig,
  activeProjectId,
  onProjectChange,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);

  // 获取项目列表（顶层文件夹，没有 parentId 的）
  const projects = useMemo(() => {
    return folders.filter((f) => !f.parentId);
  }, [folders]);

  // 获取当前项目的分组列表
  const currentProjectGroups = useMemo(() => {
    if (!activeProjectId && projects.length > 0) {
      // 如果没有选中项目，默认选中第一个
      return folders.filter((f) => f.parentId === projects[0].id);
    }
    return folders.filter((f) => f.parentId === activeProjectId);
  }, [folders, activeProjectId, projects]);

  // 获取方法颜色
  const getMethodColor = (method: HttpMethod) => {
    return METHOD_COLORS[method] || "text-gray-500";
  };

  // 文件夹操作菜单
  const getFolderMenuItems = (folder: ApiFolder): MenuProps["items"] => [
    {
      key: "edit",
      label: "编辑文件夹",
      icon: <span className="material-symbols-outlined text-sm">edit</span>,
      onClick: () => onEditFolder(folder),
    },
    {
      key: "delete",
      label: "删除文件夹",
      icon: <span className="material-symbols-outlined text-sm">delete</span>,
      danger: true,
      onClick: () => onDeleteFolder(folder.id),
    },
  ];

  return (
    <aside className="w-64 border-r border-border flex flex-col bg-bg-primary">
      {/* 环境选择器 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Select
            value={currentEnvironment}
            onChange={onEnvironmentChange}
            className="flex-1"
            size="small"
            options={globalConfig.environments.map((env) => ({
              value: env.key,
              label: env.name,
            }))}
          />
          <Button
            size="small"
            icon={
              <span className="material-symbols-outlined text-sm">
                settings
              </span>
            }
            onClick={onOpenGlobalConfig}
            title="全局配置"
          />
        </div>
        {globalConfig.environments.find((e) => e.key === currentEnvironment)
          ?.baseUrl && (
          <div className="mt-2 text-[10px] text-text-tertiary truncate">
            Base:{" "}
            {
              globalConfig.environments.find(
                (e) => e.key === currentEnvironment
              )?.baseUrl
            }
          </div>
        )}
      </div>

      {/* Swagger 解析区域 */}
      <div className="p-4 space-y-4 border-b border-border">
        <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">upload_file</span>
          解析 Swagger / OpenAPI
        </h2>
        <div className="space-y-2">
          <Input
            value={swaggerUrl}
            onChange={(e) => onSwaggerUrlChange(e.target.value)}
            placeholder="粘贴 Swagger URL..."
            className="text-xs"
          />
          <div className="flex gap-2">
            <Button
              type="primary"
              size="small"
              loading={swaggerLoading}
              onClick={onParseSwagger}
              className="flex-1 text-xs font-bold"
            >
              解析链接
            </Button>
            <Button
              size="small"
              onClick={onUploadSwagger}
              title="上传 JSON/YAML"
              icon={
                <span className="material-symbols-outlined text-sm">
                  attach_file
                </span>
              }
            />
          </div>
        </div>
        {/* 同步状态 */}
        {syncing && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-text-tertiary">
              {syncStatus || "正在同步接口..."}
            </span>
          </div>
        )}
      </div>

      {/* 菜单列表 */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-3 px-2">
            请求列表
          </h2>
          <nav className="space-y-1">
            {SIDEBAR_MENU_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => onMenuChange(item.key)}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                  activeMenu === item.key
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-text-secondary hover:bg-bg-tertiary"
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 接口文件夹 */}
        <div>
          {/* 项目选择器 */}
          {projects.length > 0 && (
            <div className="mb-3 px-2">
              <Select
                value={activeProjectId || projects[0]?.id}
                onChange={onProjectChange}
                className="w-full"
                size="small"
                placeholder="选择项目"
                options={projects.map((p) => ({
                  value: p.id,
                  label: p.name,
                }))}
              />
            </div>
          )}

          <h2 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-3 px-2 flex items-center justify-between">
            <span>接口分组</span>
            <span className="material-symbols-outlined text-xs cursor-pointer hover:text-primary">
              sync
            </span>
          </h2>
          <div className="space-y-1">
            {projects.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无接口"
                className="py-4"
              />
            ) : currentProjectGroups.length === 0 ? (
              // 如果没有分组，直接显示项目下的接口
              <div className="ml-2 space-y-1">
                {requests
                  .filter((r) => r.folderId === (activeProjectId || projects[0]?.id))
                  .map((request) => (
                    <button
                      key={request.id}
                      onClick={() => onRequestSelect(request.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                        activeRequestId === request.id
                          ? "bg-primary/10 text-primary"
                          : "text-text-tertiary hover:bg-bg-tertiary"
                      }`}
                    >
                      <span
                        className={`font-bold w-10 text-left ${getMethodColor(
                          request.method
                        )}`}
                      >
                        {request.method}
                      </span>
                      <span className="truncate flex-1 text-left">
                        {request.name || request.url}
                      </span>
                    </button>
                  ))}
              </div>
            ) : (
              <Collapse
                ghost
                expandIcon={({ isActive }) => (
                  <span
                    className={`material-symbols-outlined text-sm text-text-tertiary transition-transform ${
                      isActive ? "rotate-90" : ""
                    }`}
                  >
                    chevron_right
                  </span>
                )}
                expandIconPosition="start"
                activeKey={expandedFolders}
                onChange={(keys) => setExpandedFolders(keys as string[])}
              >
                {currentProjectGroups.map((group) => {
                  const groupRequests = requests.filter(
                    (r) => r.folderId === group.id
                  );
                  return (
                    <Panel
                      header={
                        <div className="flex items-center gap-2 text-sm font-medium w-full">
                          <span className="material-symbols-outlined text-sm text-yellow-500">
                            folder
                          </span>
                          <span className="truncate flex-1">{group.name}</span>
                          <Dropdown
                            menu={{ items: getFolderMenuItems(group) }}
                            trigger={["click"]}
                          >
                            <span
                              className="material-symbols-outlined text-sm text-text-tertiary hover:text-primary cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              more_vert
                            </span>
                          </Dropdown>
                        </div>
                      }
                      key={group.id}
                      className="!border-none !bg-transparent"
                    >
                      <div className="ml-6 space-y-1">
                        {groupRequests.map((request) => (
                          <button
                            key={request.id}
                            onClick={() => onRequestSelect(request.id)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                              activeRequestId === request.id
                                ? "bg-primary/10 text-primary"
                                : "text-text-tertiary hover:bg-bg-tertiary"
                            }`}
                          >
                            <span
                              className={`font-bold w-10 text-left ${getMethodColor(
                                request.method
                              )}`}
                            >
                              {request.method}
                            </span>
                            <span className="truncate flex-1 text-left">
                              {request.name || request.url}
                            </span>
                          </button>
                        ))}
                      </div>
                    </Panel>
                  );
                })}
              </Collapse>
            )}
          </div>
        </div>
      </div>

      {/* 底部同步按钮 */}
      <div className="p-4 border-t border-border">
        <Button type="primary" block className="font-bold text-sm">
          <span className="material-symbols-outlined text-sm mr-1">
            sync_alt
          </span>
          接口同步
        </Button>
      </div>
    </aside>
  );
};

export { PostmanSidebar };
export default PostmanSidebar;
