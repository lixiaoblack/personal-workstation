#!/usr/bin/env python3
"""
AI Agent Python Service
WebSocket 桥接服务，连接 Electron WebSocket 服务器
"""
# 在导入其他模块前禁用代理（解决 SOCKS 代理问题）
from message_handler import MessageHandler
from ws_client import WebSocketClient
from typing import Optional
import logging
import asyncio
import sys
import os
_proxy_vars = ['http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY',
               'all_proxy', 'ALL_PROXY', 'socks_proxy', 'SOCKS_PROXY']
for _var in _proxy_vars:
    if _var in os.environ:
        del os.environ[_var]
os.environ['NO_PROXY'] = '127.0.0.1,localhost'
os.environ['no_proxy'] = '127.0.0.1,localhost'


# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# 全局消息发送回调（用于知识库同步等）
_global_send_callback = None


def get_external_skills_dirs() -> list:
    """
    获取外部技能目录列表

    按优先级返回多个可能的技能目录：
    1. 环境变量 SKILLS_DIR 指定的目录（支持冒号分隔多个路径）
    2. 用户配置目录 ~/.personal-workstation/skills
    3. 项目内置目录 python-service/skills

    Returns:
        目录路径列表
    """
    dirs = []

    # 1. 环境变量指定的目录（最高优先级）
    env_dirs = os.environ.get("SKILLS_DIR", "")
    if env_dirs:
        # 支持冒号分隔多个路径 (Unix) 或分号 (Windows)
        separator = ";" if sys.platform == "win32" else ":"
        for d in env_dirs.split(separator):
            d = d.strip()
            if d and os.path.isabs(d):
                dirs.append(d)
            elif d:
                # 相对路径转为绝对路径
                dirs.append(os.path.abspath(d))

    # 2. 用户配置目录
    home_dir = os.path.expanduser("~")
    user_skills_dir = os.path.join(home_dir, ".personal-workstation", "skills")
    if user_skills_dir not in dirs:
        dirs.append(user_skills_dir)

    # 3. 项目内置目录（最低优先级）
    builtin_dir = os.path.join(os.path.dirname(__file__), "skills")
    if builtin_dir not in dirs:
        dirs.append(builtin_dir)

    return dirs


def init_skills_system():
    """
    初始化 Skills 系统

    在服务启动时调用，完成：
    1. 初始化技能注册中心
    2. 注册内置技能
    3. 加载外部技能目录（用户自定义技能）
    4. 将技能注册为 Agent 工具
    5. 注册知识库检索工具
    6. 注册网页搜索工具

    外部技能目录优先级：
    1. SKILLS_DIR 环境变量（支持多个路径，冒号分隔）
    2. ~/.personal-workstation/skills（用户配置目录）
    3. python-service/skills（项目内置目录）
    """
    from agent.skills import global_skill_registry, init_builtin_skills, SkillLoader
    from agent.tools import global_tool_registry, register_skills_as_tools
    from agent.knowledge_tool import register_knowledge_tools
    from agent.web_search_tool import register_web_search_tools

    # 1. 注册内置技能
    init_builtin_skills(global_skill_registry)

    # 2. 设置工具注册中心（用于 YamlSkill 执行工具）
    global_skill_registry._tool_registry = global_tool_registry

    # 3. 从多个目录加载技能
    loader = SkillLoader(
        tool_registry=global_tool_registry,
        skill_registry=global_skill_registry
    )

    external_dirs = get_external_skills_dirs()
    total_loaded = 0

    for skills_dir in external_dirs:
        if os.path.exists(skills_dir):
            skills = loader.load_from_directory(skills_dir)
            if skills:
                logger.info(f"从 {skills_dir} 加载了 {len(skills)} 个技能")
                total_loaded += len(skills)
        else:
            # 自动创建用户配置目录
            if ".personal-workstation" in skills_dir:
                try:
                    os.makedirs(skills_dir, exist_ok=True)
                    logger.info(f"已创建用户技能目录: {skills_dir}")
                except Exception as e:
                    logger.warning(f"无法创建用户技能目录: {e}")

    logger.info(f"Skills 系统初始化完成，共 {len(global_skill_registry)} 个技能")

    # 4. 将技能注册为 Agent 工具（让 Agent 可以调用技能）
    tool_count = register_skills_as_tools(
        global_skill_registry, global_tool_registry)
    logger.info(f"已将 {tool_count} 个技能注册为 Agent 工具")

    # 5. 注册知识库检索工具
    register_knowledge_tools()
    logger.info("已注册知识库检索工具")

    # 6. 注册网页搜索工具
    from agent.web_search_tool import register_web_search_tools
    register_web_search_tools(global_tool_registry)
    logger.info("已注册网页搜索工具")

    # 7. 注册网页采集工具
    from agent.web_crawler import register_web_crawl_tools
    register_web_crawl_tools(global_tool_registry)
    logger.info("已注册网页采集工具")

    # 8. 注册前端桥接工具
    from agent.frontend_bridge_tool import register_frontend_bridge_tools
    register_frontend_bridge_tools()
    logger.info("已注册前端桥接工具")


class AgentService:
    """AI 智能体服务"""

    def __init__(self):
        self.ws_client: Optional[WebSocketClient] = None
        self.message_handler: Optional[MessageHandler] = None
        self.running = False

    async def _send_message(self, message: dict):
        """发送消息的回调函数"""
        if self.ws_client:
            await self.ws_client.send(message)

    async def start(self, ws_host: str, ws_port: int):
        """启动服务"""
        global _global_send_callback
        logger.info(f"启动 AI 智能体服务，连接到 ws://{ws_host}:{ws_port}")

        # 初始化 Skills 系统
        init_skills_system()

        # 先初始化 WebSocket 客户端
        self.ws_client = WebSocketClient(
            host=ws_host,
            port=ws_port,
            on_message=self.handle_message,
            on_connected=self.on_connected,
            on_disconnected=self.on_disconnected
        )

        # 初始化消息处理器，传递发送消息的回调
        self.message_handler = MessageHandler(send_callback=self._send_message)

        # 设置全局发送回调（供知识库创建工具使用）
        _global_send_callback = self._send_message

        # 设置前端桥接工具的 WebSocket 回调
        from agent.frontend_bridge_tool import set_ws_send_callback
        set_ws_send_callback(self._send_message)

        self.running = True

        # 连接到 Electron WebSocket 服务器
        while self.running:
            try:
                await self.ws_client.connect()
                await self.ws_client.listen()
            except Exception as e:
                logger.error(f"连接错误: {e}")
                if self.running:
                    logger.info("5秒后重连...")
                    await asyncio.sleep(5)
                else:
                    break

    async def stop(self):
        """停止服务"""
        logger.info("正在停止 AI 智能体服务...")
        self.running = False
        if self.ws_client:
            await self.ws_client.close()
        logger.info("服务已停止")

    async def handle_message(self, message: dict):
        """处理接收到的消息"""
        try:
            # 处理前端桥接响应
            msg_type = message.get("type")
            logger.debug(f"[AgentService] 收到消息类型: {msg_type}")

            if msg_type == "frontend_bridge_response":
                logger.info(f"[AgentService] 处理 frontend_bridge_response")
                from agent.frontend_bridge_tool import handle_bridge_response
                handle_bridge_response(message)
                return

            if msg_type == "frontend_bridge_list_response":
                logger.info(f"[AgentService] 处理 frontend_bridge_list_response")
                from agent.frontend_bridge_tool import handle_bridge_response
                handle_bridge_response(message)
                return

            # 处理其他消息
            response = await self.message_handler.process(message)
            if response and self.ws_client:
                await self.ws_client.send(response)
        except Exception as e:
            logger.error(f"消息处理错误: {e}")

    def on_connected(self):
        """连接成功回调"""
        logger.info("已连接到 Electron WebSocket 服务器")

    def on_disconnected(self):
        """连接断开回调"""
        logger.info("与 Electron WebSocket 服务器断开连接")


async def main():
    """主入口"""
    # 从环境变量获取配置
    ws_host = os.environ.get("WS_HOST", "127.0.0.1")
    ws_port = int(os.environ.get("WS_PORT", 8765))

    service = AgentService()

    try:
        await service.start(ws_host, ws_port)
    except KeyboardInterrupt:
        logger.info("收到中断信号")
    finally:
        await service.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
