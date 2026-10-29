"""Endpoints de autenticación (login JWT, perfil y listado de usuarios)."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models import User
from app.models.user import ROLE_LABELS, UserRole
from app.services.reembolso_service import TOPE_ANUAL_SALUD, obtener_resumen_socio

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
    mesesAntiguedad: int = 12


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


def to_out(u: User) -> UserOut:
    return UserOut(
        id=str(u.id),
        rut=u.rut,
        nombreCompleto=u.nombre_completo,
        email=u.email,
        rol=u.rol.value,
        rolLabel=ROLE_LABELS[u.rol],
        isSuperuser=u.is_superuser,
        departamento=u.departamento,
        antiguedad=u.antiguedad,
        estadoPrevisional=u.estado_previsional,
        saldoSaludDisponible=min(int(u.saldo_salud_disponible), TOPE_ANUAL_SALUD),
        saldoSaludTotalAnual=TOPE_ANUAL_SALUD,
        cargasRegistradas=u.cargas_registradas,
        mesesAntiguedad=getattr(u, "meses_antiguedad", 12) or 12,
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

    # Sincronizar el saldo disponible según el año calendario vigente (renovación automática 1 de enero)
    await obtener_resumen_socio(user, db)
    await db.refresh(user)

    token = create_access_token(user.id, extra_claims={"rol": user.rol.value})
    return TokenResponse(access_token=token, user=to_out(user))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Sincronizar el saldo disponible del año calendario vigente
    await obtener_resumen_socio(user, db)
    await db.refresh(user)
    return to_out(user)


@router.get("/usuarios", response_model=List[UserOut])
async def listar_usuarios(
    _: User = Depends(require_roles(UserRole.ADMIN)), db: AsyncSession = Depends(get_db)
):
    """Listado completo de usuarios. Solo administrador y superusuario."""
    result = await db.scalars(select(User).order_by(User.id))
    return [to_out(u) for u in result]
