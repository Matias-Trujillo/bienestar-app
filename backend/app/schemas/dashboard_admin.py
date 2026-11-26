"""Esquemas Pydantic segregados (ISP) para el Resumen General de la Vista Admin.

[ESTUDIANTE INFORMÁTICA] Define contratos de salida específicos para el Dashboard Ejecutivo
de Administración: novedades desde el último acceso, bandejas por aprobar, rechazadas recientes,
métricas de actividad de la plataforma y feed cronológico de auditoría.
"""
from typing import List, Literal, Optional

from pydantic import BaseModel


class NovedadesDesdeAccesoOut(BaseModel):
    desde_iso: str
    es_primer_acceso: bool
    nuevas_afiliaciones: int
    nuevas_cargas: int
    nuevos_reembolsos: int
    nuevos_beneficios: int
    nuevas_postulaciones_talento: int
    total_novedades: int


class PendientesDesgloseOut(BaseModel):
    afiliaciones: int
    cargas: int
    reembolsos_revision: int
    reembolsos_por_pagar: int
    beneficios: int
    total: int


class RechazadasDesgloseOut(BaseModel):
    afiliaciones: int
    cargas: int
    reembolsos: int
    beneficios: int
    total: int


class ConteoBandejasOut(BaseModel):
    por_aprobar: PendientesDesgloseOut
    rechazadas_30d: RechazadasDesgloseOut


class MetricasActividadOut(BaseModel):
    total_usuarios: int
    socios_activos: int
    socios_habilitados: int
    socios_carencia: int
    eventos_hoy: int
    eventos_7d: int
    total_eventos_auditoria: int
    monto_reembolsos_revision: int
    monto_desembolsado_periodo: int
    ofertas_activas: int
    postulaciones_talento: int


class SolicitudResumenItem(BaseModel):
    id_referencia: str
    modulo: Literal["AFILIACION", "CARGAS", "REEMBOLSOS", "BENEFICIOS"]
    folio: str
    solicitante: str
    detalle: str
    estado: str
    motivo_rechazo: Optional[str] = None
    monto: Optional[int] = None
    fecha_iso: str
    es_nueva: bool = False
    href: str


class ActividadRecienteItem(BaseModel):
    id: int
    modulo: str
    accion: str
    usuario_nombre: str
    usuario_rol: str
    detalles: str
    fecha_iso: str


class ResumenGeneralAdminOut(BaseModel):
    generado_en_iso: str
    novedades: NovedadesDesdeAccesoOut
    bandejas: ConteoBandejasOut
    metricas: MetricasActividadOut
    solicitudes_por_aprobar: List[SolicitudResumenItem]
    solicitudes_rechazadas: List[SolicitudResumenItem]
    actividad_reciente: List[ActividadRecienteItem]
