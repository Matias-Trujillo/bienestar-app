"""Agregador de rutas de la API versión 1."""
from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    afiliacion,
    reembolsos,
    beneficios,
    finanzas,
    admin,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Autenticación"])
api_router.include_router(afiliacion.router, prefix="/afiliacion", tags=["Afiliación y Cargas"])
api_router.include_router(reembolsos.router, prefix="/reembolsos", tags=["Reembolsos Médicos"])
api_router.include_router(beneficios.router, prefix="/beneficios", tags=["Beneficios Sociales"])
api_router.include_router(finanzas.router, prefix="/finanzas", tags=["Control Financiero"])
api_router.include_router(admin.router, prefix="/admin", tags=["Administración"])
