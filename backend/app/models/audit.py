"""Modelo de Auditoría (Audit Log inmutable) para trazabilidad legal y administrativa."""
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class AuditLog(Base):
    """
    Bitácora de eventos del sistema (Append-Only).
    Nunca se debe eliminar ni modificar un registro existente (inmutable para Contraloría / Auditoría).
    """
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    usuario_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    usuario_nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    usuario_rut: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    usuario_rol: Mapped[str] = mapped_column(String(50), nullable=False)
    
    modulo: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # Ej: AFILIACION, REEMBOLSOS, BENEFICIOS, USUARIOS, CONFIG
    accion: Mapped[str] = mapped_column(String(100), nullable=False, index=True) # Ej: APROBAR_SOLICITUD, RECHAZAR_SOLICITUD, CAMBIO_ROL, LIQUIDACION_MASIVA
    
    recurso_tipo: Mapped[str] = mapped_column(String(50), nullable=False) # Ej: SolicitudAfiliacion, SolicitudReembolso, User
    recurso_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True) # Folio o ID
    
    detalles: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # JSON o texto explicativo
    ip_origen: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
