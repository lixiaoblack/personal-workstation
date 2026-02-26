"""
LLM API 路由

提供 LLM 调用接口。
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from model_router import model_router

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/llm", tags=["LLM"])


# ==================== 请求/响应模型 ====================

class ChatMessage(BaseModel):
    """聊天消息"""
    role: str  # system, user, assistant
    content: str


class LlmGenerateRequest(BaseModel):
    """LLM 生成请求"""
    messages: List[ChatMessage]
    model_id: Optional[int] = None
    temperature: Optional[float] = 0.3
    max_tokens: Optional[int] = 4096


class LlmGenerateResponse(BaseModel):
    """LLM 生成响应"""
    success: bool
    content: Optional[str] = None
    error: Optional[str] = None


# ==================== API 端点 ====================

@router.post("/generate", response_model=LlmGenerateResponse)
async def generate(request: LlmGenerateRequest):
    """
    调用 LLM 生成内容

    Args:
        request: 包含 messages 和 model_id 的请求

    Returns:
        生成的内容
    """
    try:
        # 检查模型路由器是否有注册的模型
        if not model_router._models:
            return LlmGenerateResponse(
                success=False,
                error="没有可用的模型，请先在 AI 设置中配置模型"
            )

        # 转换消息格式
        messages = [{"role": msg.role, "content": msg.content}
                    for msg in request.messages]

        # 调用模型路由器
        content = await model_router.chat_async(
            messages=messages,
            model_id=request.model_id
        )

        return LlmGenerateResponse(
            success=True,
            content=content
        )

    except ValueError as e:
        logger.error(f"[LLM API] 参数错误: {e}")
        return LlmGenerateResponse(
            success=False,
            error=str(e)
        )
    except Exception as e:
        logger.error(f"[LLM API] 生成失败: {e}")
        return LlmGenerateResponse(
            success=False,
            error=f"生成失败: {str(e)}"
        )


@router.get("/models")
async def list_models():
    """列出可用的模型"""
    models = []
    for model_id, config in model_router._configs.items():
        models.append({
            "id": model_id,
            "provider": config.provider.value if hasattr(config.provider, 'value') else str(config.provider),
            "model_id": config.model_id,
            "name": getattr(config, 'name', config.model_id)
        })

    return {
        "success": True,
        "models": models
    }
