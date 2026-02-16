<!--
 * @Author: wanglx
 * @Date: 2026-02-15 22:05:03
 * @LastEditors: wanglx
 * @LastEditTime: 2026-02-16 13:44:52
 * @Description: 
 * 
 * Copyright (c) 2026 by ${git_name_email}, All Rights Reserved. 
-->
# AI 知识库与智能体功能 - 修改记录

> 本文档独立记录 AI 功能开发的版本变更，与主项目修改日志互不关联

---

## 版本统计

| 版本 | 发布日期 | 主要变更 |
|------|----------|----------|
| 0.5.9 | 2026-02-17 | AI-014 架构重构：Python 端 LangChain |
| 0.5.8 | 2026-02-17 | 模型路由在线 API 连接（已废弃） |
| 0.5.7 | 2026-02-17 | AI 设置页面模型配置 UI |
| 0.5.6 | 2026-02-17 | 模型配置 SQLite 存储 |
| 0.5.5 | 2026-02-17 | Python WebSocket 桥接 |
| - | - | 暂无发布版本 |

---

## [Unreleased] - 开发中

### 新增 (Added)

- 存储管理服务
  - 获取应用存储信息（缓存大小、总大小、数据库大小、日志大小）
  - 缓存清理功能
  - 字节格式化工具函数
- IPC 通信扩展
  - `storage:getInfo` - 获取存储信息
  - `storage:clearCache` - 清理缓存
- 设置页面基础框架
  - Settings 主设置页面（常规设置、个人信息、存储管理、关于）
  - AISettings AI 模型配置页面
  - 在线 API 配置 UI（OpenAI、百炼、智谱）
  - 本地 Ollama 配置 UI
- WebSocket 通信层
  - WebSocket 服务器（主进程）
  - 消息协议定义
  - 渲染进程客户端（useWebSocket Hook）
- 聊天界面
  - AIChat 页面布局
  - 消息列表和输入框组件
  - WebSocket 消息收发
- Python 服务管理
  - Python 环境检测（跨平台）
  - Python 进程管理（启动/停止/重启）
  - WebSocket 桥接
    - Python 服务作为 WebSocket 客户端连接 Electron
    - 客户端标识机制（renderer/python_agent）
    - 消息路由：渲染进程 <-> Electron WS <-> Python 服务
    - Python 服务状态广播
- 模型配置管理
  - 模型配置类型定义（ModelConfig, ModelConfigListItem 等）
  - 支持 OpenAI、百炼、智谱、Ollama、自定义 API
  - SQLite 存储模型配置
  - CRUD 服务和 IPC API
  - 默认模型配置模板
- AI 设置页面完善
  - ModelConfigCard 组件（显示模型配置卡片）
  - ModelConfigModal 组件（添加/编辑配置弹窗）
  - 重构 AISettings 页面使用 SQLite 存储
  - 支持启用/禁用、设为默认、优先级管理
  - 测试连接功能预留
- 模型路由服务
  - 集成 OpenAI SDK
  - 支持 OpenAI、百炼、智谱、自定义 API（OpenAI 兼容格式）
  - 支持流式响应（sendChatRequestStream）
  - 支持连接测试（testModelConnection）
  - 自动更新模型配置状态（active/error）
- **架构重构**：移除 Electron 端 AI 调用，迁移至 Python 端
  - 移除 openai SDK（Electron 端）
  - Python 端创建 model_router.py（LangChain 封装）
  - 支持模型注册/注销/测试（WebSocket 消息）
  - 正确架构：渲染进程 → Electron → WebSocket → Python → LangChain
- 技术方案文档 `md/ai-agent-tech-plan.md`
- 任务清单文档 `md/ai-tasks.md`
- 修改记录文档 `md/ai-changelog.md`

---

## 版本历史

暂无正式发布版本

---

*文档版本: v1.1*
*创建时间: 2026-02-13*
*最后更新: 2026-02-17*
