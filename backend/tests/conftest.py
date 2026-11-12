"""Configuración central de fixtures y contexto de pruebas con Pytest y SQLite en memoria.

[ESTUDIANTE INFORMÁTICA] Este archivo es el punto de partida de las pruebas automatizadas.
Levanta una base de datos SQLite en memoria (aiosqlite) completamente asíncrona para que cada
prueba se ejecute en milisegundos sin depender de PostgreSQL ni de Docker.
"""
from typing import AsyncGenerator
import pytest
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.models.base import Base
from app.models.user import User, UserRole
from app.models.beneficios import ParametroSistema


# [ESTUDIANTE INFORMÁTICA] Engine asíncrono para SQLite en memoria compartida por prueba.
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Crea una sesión asíncrona aislada para cada prueba, creando y limpiando tablas."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        bind=engine,
        expire_on_commit=False,
        class_=AsyncSession,
    )
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def socio_habilitado(db_session: AsyncSession) -> User:
    """Fixture de un socio con carencia cumplida (1 año y 2 meses) y saldo intacto."""
    socio = User(
        rut="12.345.678-5",
        email="socio.habilitado@mperalillo.cl",
        nombre_completo="Juan Pérez González",
        hashed_password="hashed_dummy_password",
        rol=UserRole.SOCIO,
        is_active=True,
        departamento="Dirección de Obras",
        antiguedad="1 Año, 2 Meses",
        meses_antiguedad=14,
        estado_previsional="Al día",
        saldo_salud_disponible=150000,
        saldo_salud_total_anual=150000,
        cargas_registradas=1,
    )
    db_session.add(socio)
    await db_session.commit()
    await db_session.refresh(socio)
    return socio


@pytest.fixture
async def socio_nuevo(db_session: AsyncSession) -> User:
    """Fixture de un socio recién ingresado (2 meses) que aún no cumple los 6 meses de carencia."""
    socio = User(
        rut="14.982.112-4",
        email="socio.nuevo@mperalillo.cl",
        nombre_completo="María Paz Morales",
        hashed_password="hashed_dummy_password",
        rol=UserRole.SOCIO,
        is_active=True,
        departamento="Secretaría Municipal",
        antiguedad="2 Meses",
        meses_antiguedad=2,
        estado_previsional="Al día",
        saldo_salud_disponible=150000,
        saldo_salud_total_anual=150000,
        cargas_registradas=0,
    )
    db_session.add(socio)
    await db_session.commit()
    await db_session.refresh(socio)
    return socio


@pytest.fixture
async def usuario_admin(db_session: AsyncSession) -> User:
    """Fixture de un directivo del Comité de Bienestar con facultades de resolución."""
    admin = User(
        rut="11.111.111-1",
        email="secretario@mperalillo.cl",
        nombre_completo="Patricia Fuentes Silva",
        hashed_password="hashed_dummy_password",
        rol=UserRole.SECRETARIO,
        is_active=True,
        departamento="Comité de Bienestar",
        antiguedad="5 Años",
        meses_antiguedad=60,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest.fixture
async def param_grado_15(db_session: AsyncSession) -> ParametroSistema:
    """Fixture del parámetro oficial de Sueldo Base Imponible del Grado 15 ($750.000)."""
    param = ParametroSistema(
        clave="SUELDO_BASE_GRADO_15",
        valor="750000",
        descripcion="Sueldo base imponible Grado 15 referencial",
    )
    db_session.add(param)
    await db_session.commit()
    await db_session.refresh(param)
    return param
