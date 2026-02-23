"""
用户 API 路由
"""

from fastapi import APIRouter, HTTPException

from ..database import get_db
from ..models import UserProfileUpdate

router = APIRouter(prefix="/api/users", tags=["用户"])


@router.get("/{user_id}")
async def get_user(user_id: int):
    """获取用户信息"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, username, nickname, avatar, email, phone, 
                   birthday, gender, bio, created_at, updated_at, last_login_at, settings
            FROM users WHERE id = ?
        """, (user_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="用户不存在")

        return {"success": True, "data": dict(row)}


@router.put("/{user_id}")
async def update_user_profile(user_id: int, data: UserProfileUpdate):
    """更新用户资料"""
    with get_db() as conn:
        updates = []
        params = []

        if data.nickname is not None:
            updates.append("nickname = ?")
            params.append(data.nickname)
        if data.avatar is not None:
            updates.append("avatar = ?")
            params.append(data.avatar)
        if data.email is not None:
            updates.append("email = ?")
            params.append(data.email)
        if data.phone is not None:
            updates.append("phone = ?")
            params.append(data.phone)
        if data.birthday is not None:
            updates.append("birthday = ?")
            params.append(data.birthday)
        if data.gender is not None:
            updates.append("gender = ?")
            params.append(data.gender)
        if data.bio is not None:
            updates.append("bio = ?")
            params.append(data.bio)

        if not updates:
            return await get_user(user_id)

        updates.append("updated_at = datetime('now', 'localtime')")
        params.append(user_id)

        conn.execute(
            f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()

        return await get_user(user_id)
