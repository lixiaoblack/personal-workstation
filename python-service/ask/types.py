#!/usr/bin/env python3
"""
Ask 模块类型定义
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Union
import time
import uuid


class AskType(str, Enum):
    """交互类型"""
    SELECT = "select"          # 单选
    MULTI = "multi"            # 多选
    CONFIRM = "confirm"        # 确认（是/否）
    INPUT = "input"            # 文本输入
    CASCADE = "cascade"        # 级联选择
    API_SELECT = "api_select"  # API 动态选项


@dataclass
class AskOption:
    """选项定义"""
    id: str
    label: str
    description: Optional[str] = None
    icon: Optional[str] = None
    disabled: bool = False
    group: Optional[str] = None
    children: Optional[List["AskOption"]] = None
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "id": self.id,
            "label": self.label,
        }
        if self.description:
            result["description"] = self.description
        if self.icon:
            result["icon"] = self.icon
        if self.disabled:
            result["disabled"] = self.disabled
        if self.group:
            result["group"] = self.group
        if self.children:
            result["children"] = [c.to_dict() for c in self.children]
        if self.metadata:
            result["metadata"] = self.metadata
        return result


@dataclass
class AskApiConfig:
    """API 动态选项配置"""
    endpoint: str
    method: str = "GET"
    params: Optional[Dict[str, Any]] = None
    result_mapping: Optional[Dict[str, str]] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "endpoint": self.endpoint,
            "method": self.method,
        }
        if self.params:
            result["params"] = self.params
        if self.result_mapping:
            result["resultMapping"] = self.result_mapping
        return result


@dataclass
class AskInputConfig:
    """输入配置"""
    placeholder: Optional[str] = None
    default_value: Optional[str] = None
    required: bool = False
    validate: Optional[str] = None  # 正则表达式
    min_length: Optional[int] = None
    max_length: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {}
        if self.placeholder:
            result["placeholder"] = self.placeholder
        if self.default_value:
            result["defaultValue"] = self.default_value
        if self.required:
            result["required"] = self.required
        if self.validate:
            result["validate"] = self.validate
        if self.min_length is not None:
            result["minLength"] = self.min_length
        if self.max_length is not None:
            result["maxLength"] = self.max_length
        return result


@dataclass
class AskMessage:
    """询问消息"""
    ask_id: str
    ask_type: AskType
    title: str
    description: Optional[str] = None
    conversation_id: Optional[str] = None
    options: Optional[List[AskOption]] = None
    api_config: Optional[AskApiConfig] = None
    input_config: Optional[AskInputConfig] = None
    timeout: int = 300000  # 5分钟
    readonly: bool = False
    default_value: Optional[Union[str, List[str], bool]] = None
    context: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "type": "ask",
            "id": self.ask_id,  # 使用 askId 作为消息 id
            "askId": self.ask_id,
            "askType": self.ask_type.value,
            "title": self.title,
            "timestamp": int(time.time() * 1000),
        }
        if self.description:
            result["description"] = self.description
        if self.conversation_id:
            result["conversationId"] = self.conversation_id
        if self.options:
            result["options"] = [o.to_dict() for o in self.options]
        if self.api_config:
            result["apiConfig"] = self.api_config.to_dict()
        if self.input_config:
            result["inputConfig"] = self.input_config.to_dict()
        if self.timeout:
            result["timeout"] = self.timeout
        if self.readonly:
            result["readonly"] = self.readonly
        if self.default_value is not None:
            result["defaultValue"] = self.default_value
        if self.context:
            result["context"] = self.context
        return result


@dataclass
class AskResponse:
    """用户响应"""
    ask_id: str
    action: str  # submit, cancel, timeout
    value: Optional[Union[str, List[str], bool, Dict[str, Any]]] = None
    timestamp: int = field(default_factory=lambda: int(time.time() * 1000))

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AskResponse":
        return cls(
            ask_id=data.get("askId", ""),
            action=data.get("action", "cancel"),
            value=data.get("value"),
            timestamp=data.get("timestamp", int(time.time() * 1000)),
        )


@dataclass
class AskResult:
    """询问结果"""
    ask_id: str
    success: bool
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "type": "ask_result",
            "id": self.ask_id,  # 使用 askId 作为消息 id
            "askId": self.ask_id,
            "success": self.success,
            "timestamp": int(time.time() * 1000),
        }
        if self.message:
            result["message"] = self.message
        if self.data:
            result["data"] = self.data
        return result


def generate_ask_id() -> str:
    """生成唯一询问 ID"""
    return f"ask_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
