"""Paquete de modelos SQLAlchemy ORM."""
from app.models.base import Base
from app.models.user import User, UserRole
from app.models.reembolso import (
    PagoReembolso,
    SolicitudReembolso,
    TipoPrestacion,
    EstadoReembolso,
)
from app.models.afiliacion import (
    CalidadContractual,
    CargaFamiliar,
    EstadoSolicitud,
    SolicitudAfiliacion,
    SolicitudCargaFamiliar,
)
from app.models.beneficios import (
    ParametroSistema,
    BonoCatalogo,
    SolicitudBeneficio,
    NominaMasiva,
    DetalleNominaMasiva,
)

from app.models.audit import AuditLog
from app.models.permisos import PermisoRolAdmin
from app.models.finanzas import (
    AporteMunicipalUtm,
    ConciliacionPlanilla,
    PagoAporteMensual,
)
from app.models.talento import (
    CompetenciaCatalogo,
    CursoPerfeccionamiento,
    EducacionTalento,
    EstadoPostulacionTalento,
    ExperienciaLaboralTalento,
    JornadaLaboral,
    ModalidadTrabajo,
    OfertaLaboral,
    PerfilTalentoVecino,
    talento_competencias,
)

__all__ = [
    "Base",
    "User",
    "UserRole",
    "AuditLog",
    "PermisoRolAdmin",
    "AporteMunicipalUtm",
    "ConciliacionPlanilla",
    "PagoAporteMensual",
    "PagoReembolso",
    "SolicitudReembolso",
    "TipoPrestacion",
    "EstadoReembolso",
    "SolicitudAfiliacion",
    "CargaFamiliar",
    "SolicitudCargaFamiliar",
    "CalidadContractual",
    "EstadoSolicitud",
    "ParametroSistema",
    "BonoCatalogo",
    "SolicitudBeneficio",
    "NominaMasiva",
    "DetalleNominaMasiva",
    "CompetenciaCatalogo",
    "CursoPerfeccionamiento",
    "EducacionTalento",
    "EstadoPostulacionTalento",
    "ExperienciaLaboralTalento",
    "JornadaLaboral",
    "ModalidadTrabajo",
    "OfertaLaboral",
    "PerfilTalentoVecino",
    "talento_competencias",
]
