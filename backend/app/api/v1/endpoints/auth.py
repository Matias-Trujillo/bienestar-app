"""Endpoints de autenticación (login JWT, perfil y listado de usuarios)."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_superuser
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models import User
from app.models.user import ROLE_LABELS

router = APIRouter()


class LoginRequest(BaseModel):
    username: str  # RUT o correo
    password: str


class UserOut(BaseModel):
    id: str
    rut: str
    nombreCompleto: str
    email: str
    rol: str
    rolLabel: str
    isSuperuser: bool
    departamento: str
    antiguedad: str
    estadoPrevisional: str
    saldoSaludDisponible: int
    saldoSaludTotalAnual: int
    cargasRegistradas: int


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


def to_out(u: User) -> UserOut:
    return UserOut(
        id=str(u.id), rut=u.rut, nombreCompleto=u.nombre_completo, email=u.email,
        rol=u.rol.value, rolLabel=ROLE_LABELS[u.rol], isSuperuser=u.is_superuser,
        departamento=u.departamento, antiguedad=u.antiguedad,
        estadoPrevisional=u.estado_previsional,
        saldoSaludDisponible=u.saldo_salud_disponible,
        saldoSaludTotalAnual=u.saldo_salud_total_anual,
        cargasRegistradas=u.cargas_registradas,
    )


def _normalize_rut(value: str) -> str:
    return value.replace(".", "").replace("-", "").upper().strip()


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    ident = body.username.strip()
    rut_norm = _normalize_rut(ident)
    user = await db.scalar(
        select(User).where(
            or_(
                func.lower(User.email) == ident.lower(),
                func.upper(func.replace(func.replace(User.rut, ".", ""), "-", "")) == rut_norm,
            )
        )
    )
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario deshabilitado")
    token = create_access_token(user.id, extra_claims={"rol": user.rol.value})
    return TokenResponse(access_token=token, user=to_out(user))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return to_out(user)


@router.get("/usuarios", response_model=List[UserOut])
async def listar_usuarios(
    _: User = Depends(require_superuser), db: AsyncSession = Depends(get_db)
):
    """Listado completo de usuarios. Solo superusuario."""
    result = await db.scalars(select(User).order_by(User.id))
    return [to_out(u) for u in result]
