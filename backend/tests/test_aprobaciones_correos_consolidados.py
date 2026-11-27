"""Pruebas automatizadas de correos transaccionales en solicitudes y resoluciones consolidadas."""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.schemas.afiliacion import NuevaCargaIn
from app.schemas.beneficios import PostulacionBeneficioCreate, ValidarSolicitudRequest
from app.services.afiliacion_service import AfiliacionService
from app.services.beneficios_service import BeneficiosService
from app.services.email_buzon import default_buzon_store


@pytest.mark.asyncio
async def test_correos_al_solicitar_carga_y_postular_resolver_beneficio(
    db_session: AsyncSession, socio_habilitado: User, usuario_admin: User
) -> None:
    # 1. Solicitar nueva carga familiar -> debe emitir correo de recepción
    carga = await AfiliacionService.solicitar_nueva_carga(
        db_session,
        socio_habilitado,
        NuevaCargaIn(
            nombreCompleto="Matías Ejemplo Carga",
            run="18.456.789-K",
            parentesco="Hijo/a",
            certificadoNombre="cert_nac.pdf",
            certificadoTipo="Certificado de Nacimiento",
            certificadoData="data:image/png;base64,iVBORw0KGgo=",
        ),
    )
    correos_carga = [
        c for c in default_buzon_store.listar() if c.get("folio") == carga.folio and c.get("tipo") == "recepcion_carga_familiar"
    ]
    assert len(correos_carga) >= 1

    # 2. Postular a un beneficio social -> debe emitir correo de recepción
    sol_ben = await BeneficiosService.postular_beneficio(
        db_session,
        socio_habilitado,
        PostulacionBeneficioCreate(
            tipo_bono="nacimiento",
            motivo="Nacimiento de hijo",
            documento_tipo="Certificado de Nacimiento",
            documento_nombre="cert_nacimiento.pdf",
        ),
    )
    folio_ben = f"BEN-{sol_ben.id:04d}"
    correos_ben_rec = [
        c for c in default_buzon_store.listar() if c.get("folio") == folio_ben and c.get("tipo") == "recepcion_beneficio"
    ]
    assert len(correos_ben_rec) >= 1

    # 3. Aprobar beneficio social -> debe emitir correo de resolución APROBADA
    await BeneficiosService.validar_o_liquidar(
        db_session,
        usuario_admin,
        sol_ben.id,
        ValidarSolicitudRequest(accion="APROBAR", observaciones="Cumple requisitos"),
    )
    correos_ben_res = [
        c
        for c in default_buzon_store.listar()
        if c.get("folio") == folio_ben
        and c.get("tipo") == "resolucion_beneficio"
        and c.get("estadoSolicitud") == "APROBADA"
    ]
    assert len(correos_ben_res) >= 1
