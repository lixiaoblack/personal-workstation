"""
前端桥接工具

提供 Agent 调用 Electron 前端服务方法的能力。
通过 WebSocket 与 Electron 通信，实现跨端方法调用。

使用方式:
    Agent 调用示例:
    {
        "service": "knowledgeService",
        "method": "createKnowledge",
        "params": {"name": "前端技术栈", "description": "..."}
    }

架构:
    Agent -> FrontendBridgeTool -> WebSocket -> Electron -> Service Method
"""

import logging
import time
import asyncio
from typing import Optional, Dict, Any, List

from pydantic import Field

from agent.tools import BaseTool, ToolSchema, global_tool_registry

logger = logging.getLogger(__name__)


# 全局 WebSocket 发送回调（由 main.py 设置）
_global_ws_send_callback = None


def set_ws_send_callback(callback):
    """设置 WebSocket 发送回调函数"""
    global _global_ws_send_callback
    _global_ws_send_callback = callback
    logger.info("[FrontendBridge] WebSocket 回调已设置")


# 待响应请求缓存
_pending_bridge_requests: Dict[str, asyncio.Future] = {}


class FrontendBridgeSchema(ToolSchema):
    """前端桥接工具参数"""

    service: str = Field(
        description="服务名称，如 'knowledgeService'、'conversationService'、'memoryService'"
    )
    method: str = Field(
        description="方法名称，如 'createKnowledge'、'listKnowledge'、'saveMemory'"
    )
    params: Dict[str, Any] = Field(
        default_factory=dict,
        description="调用参数，根据方法不同而变化"
    )


class FrontendBridgeListSchema(ToolSchema):
    """获取可用方法列表参数"""

    service: Optional[str] = Field(
        default=None,
        description="可选，筛选指定服务的方法"
    )


class FrontendBridgeTool(BaseTool):
    """
    前端桥接工具

    让 Agent 可以调用 Electron 前端的服务方法，实现跨端操作。

    可用服务：
    - knowledgeService: 知识库管理（创建、删除、列表等）
    - conversationService: 对话管理（创建、删除、更新等）
    - memoryService: 记忆管理（保存、获取、删除等）
    - userService: 用户服务（获取信息、更新资料等）

    使用场景：
    - 创建知识库并同步到前端显示
    - 管理对话列表
    - 保存用户偏好记忆
    - 获取用户信息

    示例：
    用户: "帮我创建一个名为'前端文档'的知识库"
    Agent: 调用 frontend_bridge(service="knowledgeService", method="createKnowledge",
           params={"name": "前端文档", "description": "前端技术文档合集"})
    工具: 返回创建的知识库信息
    Agent: 告知用户知识库已创建成功
    """

    name = "frontend_bridge"
    description = (
        "调用 Electron 前端的服务方法。"
        "可以操作知识库、对话、记忆、用户信息等。"
        "使用 frontend_bridge_list 工具查看所有可用方法。"
    )

    args_schema = FrontendBridgeSchema

    def _run(
        self,
        service: str,
        method: str,
        params: Dict[str, Any]
    ) -> str:
        """执行桥接调用"""
        try:
            result = asyncio.run(self._call_async(service, method, params))
            return result
        except Exception as e:
            logger.error(f"[FrontendBridge] 调用失败: {e}")
            return f"调用失败: {str(e)}"

    async def _call_async(
        self,
        service: str,
        method: str,
        params: Dict[str, Any]
    ) -> str:
        """异步执行桥接调用"""
        global _global_ws_send_callback, _pending_bridge_requests

        if not _global_ws_send_callback:
            return "错误: WebSocket 未连接，无法调用前端服务"

        # 生成请求 ID
        request_id = f"bridge_{int(time.time() * 1000)}_{id(self)}"

        # 创建 Future 等待响应
        loop = asyncio.get_event_loop()
        future = loop.create_future()
        _pending_bridge_requests[request_id] = future

        # 构建请求消息
        message = {
            "type": "frontend_bridge_request",
            "id": request_id,
            "timestamp": int(time.time() * 1000),
            "service": service,
            "method": method,
            "params": params,
            "requestId": request_id,
        }

        try:
            # 发送请求
            await _global_ws_send_callback(message)
            logger.info(f"[FrontendBridge] 发送请求: {service}.{method}")

            # 等待响应（超时 30 秒）
            response = await asyncio.wait_for(future, timeout=30.0)

            if response.get("success"):
                result = response.get("result")
                return self._format_result(result)
            else:
                return f"调用失败: {response.get('error', '未知错误')}"

        except asyncio.TimeoutError:
            _pending_bridge_requests.pop(request_id, None)
            return "调用超时: 前端服务未在 30 秒内响应"
        except Exception as e:
            _pending_bridge_requests.pop(request_id, None)
            logger.error(f"[FrontendBridge] 调用异常: {e}")
            return f"调用异常: {str(e)}"

    def _format_result(self, result: Any) -> str:
        """格式化返回结果"""
        if result is None:
            return "操作成功，无返回值"

        if isinstance(result, bool):
            return "操作成功" if result else "操作失败"

        if isinstance(result, dict):
            # 格式化字典
            lines = []
            for key, value in result.items():
                if isinstance(value, dict) or isinstance(value, list):
                    import json
                    value = json.dumps(value, ensure_ascii=False)
                lines.append(f"- {key}: {value}")
            return "操作成功:\n" + "\n".join(lines)

        if isinstance(result, list):
            # 格式化列表
            if len(result) == 0:
                return "操作成功，返回空列表"
            lines = [f"操作成功，共 {len(result)} 条记录:"]
            for i, item in enumerate(result[:10], 1):  # 最多显示 10 条
                if isinstance(item, dict):
                    name = item.get("name") or item.get("title") or item.get("id") or str(item)
                    lines.append(f"  {i}. {name}")
                else:
                    lines.append(f"  {i}. {item}")
            if len(result) > 10:
                lines.append(f"  ... 还有 {len(result) - 10} 条")
            return "\n".join(lines)

        return f"操作成功: {result}"


class FrontendBridgeListTool(BaseTool):
    """
    前端桥接方法列表工具

    获取所有可被调用的前端服务方法列表。
    """

    name = "frontend_bridge_list"
    description = (
        "获取所有可调用的前端服务方法列表。"
        "在调用 frontend_bridge 前先查看有哪些方法可用。"
    )

    args_schema = FrontendBridgeListSchema

    def _run(self, service: Optional[str] = None) -> str:
        """获取方法列表"""
        try:
            result = asyncio.run(self._list_async(service))
            return result
        except Exception as e:
            logger.error(f"[FrontendBridgeList] 获取列表失败: {e}")
            return f"获取失败: {str(e)}"

    async def _list_async(self, service: Optional[str]) -> str:
        """异步获取方法列表"""
        global _global_ws_send_callback

        if not _global_ws_send_callback:
            # 如果 WebSocket 未连接，返回内置方法描述
            return self._get_builtin_methods()

        # 生成请求 ID
        request_id = f"bridge_list_{int(time.time() * 1000)}"

        # 创建 Future 等待响应
        loop = asyncio.get_event_loop()
        future = loop.create_future()
        _pending_bridge_requests[request_id] = future

        # 构建请求消息
        message = {
            "type": "frontend_bridge_list",
            "id": request_id,
            "timestamp": int(time.time() * 1000),
            "service": service,
        }

        try:
            # 发送请求
            await _global_ws_send_callback(message)

            # 等待响应
            response = await asyncio.wait_for(future, timeout=10.0)

            if response.get("success"):
                methods = response.get("methods", [])
                return self._format_methods(methods)
            else:
                return f"获取失败: {response.get('error', '未知错误')}"

        except asyncio.TimeoutError:
            _pending_bridge_requests.pop(request_id, None)
            return "请求超时，以下是内置方法列表:\n" + self._get_builtin_methods()
        except Exception as e:
            _pending_bridge_requests.pop(request_id, None)
            return f"请求异常: {str(e)}\n以下是内置方法列表:\n" + self._get_builtin_methods()

    def _get_builtin_methods(self) -> str:
        """获取内置方法描述（WebSocket 未连接时使用）"""
        return """# 可用的前端服务方法

## knowledgeService (知识库服务)
- createKnowledge(name, description?): 创建知识库
- deleteKnowledge(knowledgeId): 删除知识库
- listKnowledge(): 获取知识库列表
- getKnowledge(knowledgeId): 获取知识库详情
- updateKnowledge(knowledgeId, data): 更新知识库信息
- listDocuments(knowledgeId): 获取知识库文档列表

## conversationService (对话服务)
- createConversation(title?, modelId?, modelName?): 创建对话
- deleteConversation(id): 删除对话
- getConversationList(): 获取对话列表
- getConversationById(id): 获取对话详情
- updateConversationTitle(id, title): 更新对话标题

## memoryService (记忆服务)
- saveMemory(memoryType, memoryKey, memoryValue, ...): 保存记忆
- getAllMemories(): 获取所有记忆
- getMemoriesByType(memoryType): 按类型获取记忆
- deleteMemory(memoryId): 删除记忆
- buildMemoryContext(): 构建记忆上下文

## userService (用户服务)
- getCurrentUser(userId): 获取当前用户信息
- updateProfile(userId, data): 更新用户资料
"""

    def _format_methods(self, methods: List[Dict]) -> str:
        """格式化方法列表"""
        if not methods:
            return "没有可用的方法"

        lines = [f"# 可用的前端服务方法 (共 {len(methods)} 个)\n"]

        # 按服务分组
        services: Dict[str, List[Dict]] = {}
        for method in methods:
            svc = method.get("service", "unknown")
            if svc not in services:
                services[svc] = []
            services[svc].append(method)

        for svc, svc_methods in services.items():
            lines.append(f"## {svc}")
            for m in svc_methods:
                method_name = m.get("method", "unknown")
                desc = m.get("description", "")
                params = m.get("params", [])

                param_str = ", ".join(
                    f"{p['name']}{'?' if not p['required'] else ''}"
                    for p in params
                )

                lines.append(f"- {method_name}({param_str}): {desc}")

            lines.append("")

        return "\n".join(lines)


def handle_bridge_response(message: Dict[str, Any]):
    """
    处理桥接响应（由 main.py 调用）

    Args:
        message: 响应消息
    """
    request_id = message.get("requestId")
    if not request_id:
        logger.warning("[FrontendBridge] 响应缺少 requestId")
        return

    future = _pending_bridge_requests.pop(request_id, None)
    if future and not future.done():
        future.set_result(message)
        logger.info(f"[FrontendBridge] 响应已处理: {request_id}")
    else:
        logger.warning(f"[FrontendBridge] 未找到对应的请求: {request_id}")


def register_frontend_bridge_tools():
    """注册前端桥接工具"""
    global global_tool_registry

    # 注册桥接工具
    bridge_tool = FrontendBridgeTool()
    if bridge_tool.name not in global_tool_registry.list_tools():
        global_tool_registry.register(bridge_tool)
        logger.info("已注册前端桥接工具: frontend_bridge")

    # 注册方法列表工具
    list_tool = FrontendBridgeListTool()
    if list_tool.name not in global_tool_registry.list_tools():
        global_tool_registry.register(list_tool)
        logger.info("已注册前端桥接方法列表工具: frontend_bridge_list")


# 自动注册
register_frontend_bridge_tools()
