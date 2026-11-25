"""Pruebas de validación y servicio del Módulo Vecino y Nuevo Talento (Trabaja con Nosotros — Ley 21.015)."""
import base64
import pytest
from pydantic import ValidationError

from app.schemas.talento import PostulacionTalentoIn
from app.services.talento_service import TalentoService


def _payload_valido(**overrides):
    cv_bytes = b"%PDF-1.4\n%CV prueba vecino talento\n"
    data = {
        "nombreCompleto": "Camila Andrea Rojas Soto",
        "run": "18.456.789-K",
        "email": "camila.rojas@gmail.com",
        "telefono": "+56 9 8765 4321",
        "direccion": "Av. Errázuriz 420",
        "comuna": "Peralillo",
        "resumenProfesional": "Profesional con 5 años de experiencia en gestión administrativa y atención ciudadana.",
        "educaciones": [
            {
                "institucion": "Instituto Profesional AIEP",
                "titulo": "Técnico en Administración Pública",
                "nivelEducacional": "Técnico Nivel Superior",
                "estadoEstudios": "Titulado/a",
                "anioInicio": 2018,
                "anioTermino": 2020,
            }
        ],
        "experiencias": [
            {
                "empresa": "Consultora Regional",
                "cargo": "Asistente Administrativa",
                "anioInicio": 2021,
                "actualmenteTrabajando": True,
                "funciones": "Gestión documental y atención de público.",
            }
        ],
        "cursos": [
            {
                "nombreCurso": "Excel Avanzado para Gestión",
                "institucion": "SENCE",
                "horas": 40,
                "anio": 2023,
            }
        ],
        "competenciaIds": [],
        "rentaEsperadaClp": 850000,
        "jornadaDeseada": "completa",
        "modalidadDeseada": "hibrida",
        "poseeDiscapacidadLey21015": True,
        "credencialRndSenadis": "RND-2026-00123",
        "aceptaTratamientoDatos": True,
        "cvFilename": "CV_Camila_Rojas.pdf",
        "cvContentType": "application/pdf",
        "cvDataBase64": "data:application/pdf;base64," + base64.b64encode(cv_bytes).decode("ascii"),
    }
    data.update(overrides)
    return data


def test_schema_rechaza_run_invalido():
    with pytest.raises(ValidationError):
        PostulacionTalentoIn(**_payload_valido(run="18.456.789-1"))


def test_schema_rechaza_formato_cv_invalido():
    with pytest.raises(ValidationError):
        PostulacionTalentoIn(**_payload_valido(cvFilename="virus.exe"))


def test_schema_rechaza_sin_aceptar_tratamiento_datos():
    with pytest.raises(ValidationError):
        PostulacionTalentoIn(**_payload_valido(aceptaTratamientoDatos=False))


@pytest.mark.asyncio
async def test_crear_postulacion_y_notificar_ambas_partes(db_session):
    competencias = await TalentoService.listar_competencias(db_session)
    assert len(competencias) >= 20

    payload = PostulacionTalentoIn(
        **_payload_valido(competenciaIds=[competencias[0].id, competencias[1].id])
    )
    out = await TalentoService.crear_postulacion(db_session, payload, ip_origen="10.0.0.5")

    assert out.folio.startswith("TAL-")
    assert out.tieneCv is True
    assert out.poseeDiscapacidadLey21015 is True
    assert len(out.competencias) == 2
    assert len(out.educaciones) == 1
    assert len(out.experiencias) == 1
    assert len(out.cursos) == 1
    assert out.notificaciones is not None
    assert out.notificaciones["postulante"]["destinatario"] == "camila.rojas@gmail.com"
    assert out.notificaciones["institucion"]["cvAdjunto"] is True
