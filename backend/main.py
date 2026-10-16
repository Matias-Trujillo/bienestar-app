from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from contextlib import asynccontextmanager

from app.api.v1.api import api_router
from app.db.init_db import init_db


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Crea tablas y usuarios semilla (idempotente)
    await init_db()
    yield


# Inicialización de la aplicación FastAPI con metadata para OpenAPI / Swagger
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="API de Gestión Operativa y Financiera del Comité de Bienestar",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# Configuración de CORS para permitir la comunicación con el frontend (Next.js)
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusión de rutas de la API v1
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health Check"])
async def health_check():
    """Endpoint de comprobación de estado para Docker y orquestación."""
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
