from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "Comité de Bienestar API"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    
    # Seguridad y JWT
    SECRET_KEY: str = "super_secret_jwt_key_bienestar_2026_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 día

    # Base de Datos
    DATABASE_URL: str = "postgresql+asyncpg://bienestar_user:bienestar_secret_pass@postgres:5432/bienestar_db"
    
    # Orígenes CORS permitidos
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Reglas HU-01 (Afiliación)
    AFILIACION_VALIDAR_PERIODO: bool = True   # False en desarrollo para probar fuera de ene-jun
    AFILIACION_MES_INICIO: int = 1            # Enero
    AFILIACION_MES_FIN: int = 6               # Junio
    AFILIACION_PORCENTAJE_DESCUENTO: int = 4  # % del sueldo base, descuento por planilla
    AFILIACION_MESES_CARENCIA: int = 6        # Meses continuos como socio antes de impetrar beneficios

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
