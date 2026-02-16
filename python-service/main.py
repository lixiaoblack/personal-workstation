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


def init_skills_system():
    """
    初始化 Skills 系统

    在服务启动时调用，完成：
    1. 初始化技能注册中心
    2. 注册内置技能
    3. 加载用户自定义技能
    """
    from agent.skills import global_skill_registry, init_builtin_skills, SkillLoader
    from agent.tools import global_tool_registry

    # 1. 注册内置技能
    init_builtin_skills(global_skill_registry)

    # 2. 设置工具注册中心（用于 YamlSkill 执行工具）
    global_skill_registry._tool_registry = global_tool_registry

    # 3. 加载用户自定义技能
    skills_dir = os.path.join(os.path.dirname(__file__), "skills")
    if os.path.exists(skills_dir):
        loader = SkillLoader(
            tool_registry=global_tool_registry,
            skill_registry=global_skill_registry
        )
        skills = loader.load_from_directory(skills_dir)
        logger.info(f"从 {skills_dir} 加载了 {len(skills)} 个自定义技能")

    logger.info(f"Skills 系统初始化完成，共 {len(global_skill_registry)} 个技能")


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
