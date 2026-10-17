"""Creación de tablas y carga inicial de las 7 credenciales del sistema."""
import logging

from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal, engine
from app.models import Base, User, UserRole

logger = logging.getLogger("uvicorn.error")

# ⚠️ Contraseñas de desarrollo: cambiarlas antes de pasar a producción.
SEED_USERS = [
    dict(rut="11.111.111-1", email="superadmin@mperalillo.cl", nombre_completo="Super Administrador",
         password="Super#2026", rol=UserRole.SUPERUSUARIO, is_superuser=True,
         departamento="Soporte TI", antiguedad="10 Años", cargas_registradas=0),
    dict(rut="12.345.678-9", email="msoto@mperalillo.cl", nombre_completo="María Elena Soto",
         password="Presi#2026", rol=UserRole.PRESIDENTE,
         departamento="Directiva de Bienestar", antiguedad="9 Años",
         saldo_salud_disponible=220000, cargas_registradas=1),
    dict(rut="13.456.789-0", email="pfuentes@mperalillo.cl", nombre_completo="Patricia Fuentes R.",
         password="Secre#2026", rol=UserRole.SECRETARIO,
         departamento="Directiva de Bienestar", antiguedad="7 Años",
         saldo_salud_disponible=210000, cargas_registradas=2),
    dict(rut="14.982.112-4", email="rmorales@mperalillo.cl", nombre_completo="Roberto Morales P.",
         password="Teso#2026", rol=UserRole.TESORERO,
         departamento="Finanzas Municipales", antiguedad="6 Años",
         saldo_salud_disponible=195000, cargas_registradas=3),
    dict(rut="16.234.567-8", email="jcontreras@mperalillo.cl", nombre_completo="Jorge Contreras L.",
         password="Admin#2026", rol=UserRole.ADMIN,
         departamento="Administración Municipal", antiguedad="4 Años",
         saldo_salud_disponible=230000, cargas_registradas=1),
    dict(rut="17.345.678-K", email="aibarra@mperalillo.cl", nombre_completo="Andrea Ibarra V.",
         password="Audit#2026", rol=UserRole.AUDITOR,
         departamento="Comisión Revisora de Cuentas", antiguedad="3 Años",
         saldo_salud_disponible=240000, cargas_registradas=0),
    dict(rut="15.489.123-K", email="cvalenzuela@mperalillo.cl", nombre_completo="Carlos Valenzuela M.",
         password="Socio#2026", rol=UserRole.SOCIO,
         departamento="DIDECO", antiguedad="5 Años, 4 Meses",
         saldo_salud_disponible=150000, cargas_registradas=2),
]


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migraciones idempotentes para columnas de HU-02
        nuevas_columnas = [
            "ALTER TABLE solicitudes_afiliacion ADD COLUMN IF NOT EXISTS fecha_sesion VARCHAR(10);",
            "ALTER TABLE solicitudes_afiliacion ADD COLUMN IF NOT EXISTS numero_acta VARCHAR(50);",
            "ALTER TABLE solicitudes_afiliacion ADD COLUMN IF NOT EXISTS fecha_fin_carencia VARCHAR(10);",
            "ALTER TABLE solicitudes_afiliacion ADD COLUMN IF NOT EXISTS observaciones_resolucion VARCHAR(500);",
            "ALTER TABLE solicitudes_afiliacion ADD COLUMN IF NOT EXISTS resuelto_por VARCHAR(120);",
            "ALTER TABLE solicitudes_afiliacion ADD COLUMN IF NOT EXISTS resuelto_at VARCHAR(30);",
        ]
        from sqlalchemy import text
        for sql in nuevas_columnas:
            await conn.execute(text(sql))

    async with AsyncSessionLocal() as db:
        for data in SEED_USERS:
            exists = await db.scalar(select(User).where(User.email == data["email"]))
            if exists:
                continue
            data = dict(data)
            password = data.pop("password")
            db.add(User(hashed_password=get_password_hash(password), **data))
            logger.info("Usuario semilla creado: %s (%s)", data["email"], data["rol"].value)
        await db.commit()
