#!/usr/bin/env python3
"""
AI Agent Python Service
WebSocket 桥接服务，连接 Electron WebSocket 服务器
"""
# 在导入其他模块前禁用代理（解决 SOCKS 代理问题）
import os
_proxy_vars = ['http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY', 
              'all_proxy', 'ALL_PROXY', 'socks_proxy', 'SOCKS_PROXY']
for _var in _proxy_vars:
    if _var in os.environ:
        del os.environ[_var]
os.environ['NO_PROXY'] = '127.0.0.1,localhost'
os.environ['no_proxy'] = '127.0.0.1,localhost'

import sys
import asyncio
import logging
from typing import Optional

from ws_client import WebSocketClient
from message_handler import MessageHandler

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


class AgentService:
    """AI 智能体服务"""
    
    def __init__(self):
        self.ws_client: Optional[WebSocketClient] = None
        self.message_handler: Optional[MessageHandler] = None
        self.running = False
        
    async def start(self, ws_host: str, ws_port: int):
        """启动服务"""
        logger.info(f"启动 AI 智能体服务，连接到 ws://{ws_host}:{ws_port}")
        
        # 初始化消息处理器
        self.message_handler = MessageHandler()
        
        # 初始化 WebSocket 客户端
        self.ws_client = WebSocketClient(
            host=ws_host,
            port=ws_port,
            on_message=self.handle_message,
            on_connected=self.on_connected,
            on_disconnected=self.on_disconnected
        )
        
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
