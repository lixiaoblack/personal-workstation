#!/usr/bin/env python3
"""
WebSocket 客户端
连接 Electron WebSocket 服务器
"""
import asyncio
import json
import logging
from typing import Callable, Optional
import websockets
from websockets.client import WebSocketClientProtocol

logger = logging.getLogger(__name__)


class WebSocketClient:
    """WebSocket 客户端"""
    
    def __init__(
        self,
        host: str,
        port: int,
        on_message: Callable[[dict], None],
        on_connected: Optional[Callable[[], None]] = None,
        on_disconnected: Optional[Callable[[], None]] = None
    ):
        self.host = host
        self.port = port
        self.on_message = on_message
        self.on_connected = on_connected
        self.on_disconnected = on_disconnected
        self.ws: Optional[WebSocketClientProtocol] = None
        self.connected = False
        
    @property
    def uri(self) -> str:
        return f"ws://{self.host}:{self.port}"
        
    async def connect(self):
        """连接到服务器"""
        logger.info(f"正在连接到 {self.uri}...")
        
        try:
            self.ws = await websockets.connect(
                self.uri,
                ping_interval=30,
                ping_timeout=10
            )
            self.connected = True
            logger.info(f"已连接到 {self.uri}")
            
            # 发送客户端标识
            await self.send({
                "type": "client_identify",
                "clientType": "python_agent",
                "timestamp": int(asyncio.get_event_loop().time() * 1000)
            })
            
            if self.on_connected:
                self.on_connected()
                
        except Exception as e:
            logger.error(f"连接失败: {e}")
            self.connected = False
            raise
            
    async def close(self):
        """关闭连接"""
        if self.ws:
            await self.ws.close()
            self.ws = None
            self.connected = False
            logger.info("连接已关闭")
            
    async def send(self, message: dict):
        """发送消息"""
        if not self.ws or not self.connected:
            logger.warning("未连接，无法发送消息")
            return False
            
        try:
            data = json.dumps(message, ensure_ascii=False)
            await self.ws.send(data)
            logger.debug(f"发送消息: {message.get('type')}")
            return True
        except Exception as e:
            logger.error(f"发送消息失败: {e}")
            return False
            
    async def listen(self):
        """监听消息"""
        if not self.ws:
            logger.error("未连接")
            return
            
        try:
            async for message in self.ws:
                try:
                    data = json.loads(message)
                    logger.debug(f"收到消息: {data.get('type')}")
                    await self.on_message(data)
                except json.JSONDecodeError as e:
                    logger.error(f"消息解析错误: {e}")
                except Exception as e:
                    logger.error(f"消息处理错误: {e}")
                    
        except websockets.exceptions.ConnectionClosed as e:
            logger.info(f"连接关闭: {e}")
        except Exception as e:
            logger.error(f"监听错误: {e}")
        finally:
            self.connected = False
            if self.on_disconnected:
                self.on_disconnected()
