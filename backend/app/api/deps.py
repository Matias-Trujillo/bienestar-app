"""Dependencias de autenticación y autorización por rol."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado o token inválido",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials:
        raise unauthorized
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise unauthorized
    user = await db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise unauthorized
    return user


def require_roles(*roles: UserRole):
    """Permite el acceso a los roles indicados. El superusuario siempre tiene acceso."""

    async def checker(user: User = Depends(get_current_user)) -> User:
        if user.is_superuser or user.rol in roles:
            return user
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permisos insuficientes")

    return checker


require_superuser = require_roles()  # sin roles adicionales => solo superusuario
