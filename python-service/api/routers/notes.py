"""
Notes 笔记向量 API 路由

提供笔记向量索引、搜索、删除等操作的 HTTP 接口
"""

import os
import glob
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from api.direct_api import (
    direct_index_note,
    direct_delete_note_from_vectorstore,
    direct_search_notes,
    direct_get_notes_stats,
)

router = APIRouter(prefix="/api/notes", tags=["笔记向量"])


# ==================== 请求模型 ====================

class IndexNoteRequest(BaseModel):
    """索引笔记请求"""
    file_path: str
    content: str
    metadata: Optional[dict] = None


class SearchNotesRequest(BaseModel):
    """搜索笔记请求"""
    query: str
    k: int = 5
    file_path_filter: Optional[str] = None


class DeleteNoteRequest(BaseModel):
    """删除笔记请求"""
    file_path: str


# ==================== API 端点 ====================

@router.post("/index")
async def index_note(request: IndexNoteRequest):
    """
    索引笔记到向量存储
    
    将 Markdown 内容分块并存储到向量数据库，    """
    try:
        chunk_count = await direct_index_note(
            file_path=request.file_path,
            content=request.content,
            metadata=request.metadata
        )
        
        return {
            "success": True,
            "chunk_count": chunk_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"索引失败: {str(e)}")


@router.post("/delete")
async def delete_note(request: DeleteNoteRequest):
    """
    从向量存储删除笔记
    """
    try:
        success = await direct_delete_note_from_vectorstore(request.file_path)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")


@router.post("/search")
async def search_notes(request: SearchNotesRequest):
    """
    语义搜索笔记
    """
    try:
        results = await direct_search_notes(
            query=request.query,
            k=request.k,
            file_path_filter=request.file_path_filter
        )
        return {
            "success": True,
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"搜索失败: {str(e)}")


@router.get("/stats")
async def get_stats():
    """
    获取笔记索引统计
    """
    try:
        stats = await direct_get_notes_stats()
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计失败: {str(e)}")


@router.post("/index-all")
async def index_all_notes(request: dict):
    """
    全量索引笔记目录
    
    遍历指定目录下的所有 .md 文件并索引
    """
    root_path = request.get("root_path")
    if not root_path or not os.path.isdir(root_path):
        raise HTTPException(status_code=400, detail="根目录不存在")
    
    try:
        # 查找所有 .md 文件
        md_files = glob.glob(os.path.join(root_path, "**/*.md"), recursive=True)
        
        indexed_count = 0
        for file_path in md_files:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                # 获取文件修改时间
                stat = os.stat(file_path)
                modified_at = int(stat.st_mtime * 1000)
                
                chunk_count = await direct_index_note(
                    file_path=file_path,
                    content=content,
                    metadata={"modified_at": modified_at}
                )
                
                if chunk_count > 0:
                    indexed_count += 1
            except Exception as e:
                print(f"索引文件失败 {file_path}: {e}")
                continue
        
        return {
            "success": True,
            "indexed_count": indexed_count,
            "total_files": len(md_files)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"全量索引失败: {str(e)}")
