"""Almacenamiento y consulta en memoria del buzón institucional interno (SRP).

[ESTUDIANTE INFORMÁTICA] Módulo separado por Principio de Responsabilidad Única (SRP).
Implementa `EmailBuzonProtocol` sin conocer detalles de red SMTP ni plantillas HTML.
"""
from typing import Any, Dict, List, Optional

_BUZON_MEMORIA: List[Dict[str, Any]] = []


class InMemoryBuzonStore:
    """Adaptador de EmailBuzonProtocol respaldado en memoria para historial y webmail integrado."""

    def registrar(self, correo: Dict[str, Any]) -> Dict[str, Any]:
        """Guarda el correo emitido en la bandeja del sistema evitando duplicados exactos consecutivos."""
        item = {
            "id": f"{correo.get('folio', 'MAIL')}-{correo.get('tipo', 'info')}-{len(_BUZON_MEMORIA) + 1}",
            "leido": False,
            **correo,
        }
        existente_idx = next(
            (
                i
                for i, x in enumerate(_BUZON_MEMORIA)
                if x.get("folio") == correo.get("folio")
                and x.get("tipo") == correo.get("tipo")
                and x.get("estadoResolucion") == correo.get("estadoResolucion")
            ),
            None,
        )
        if existente_idx is not None:
            _BUZON_MEMORIA.pop(existente_idx)
        _BUZON_MEMORIA.insert(0, item)
        return item

    def listar(self, filtro: Optional[str] = None) -> List[Dict[str, Any]]:
        if not filtro or not filtro.strip():
            return list(_BUZON_MEMORIA)
        q = filtro.strip().lower().replace(".", "").replace("-", "")
        res: List[Dict[str, Any]] = []
        for c in _BUZON_MEMORIA:
            dest = (c.get("destinatario") or "").lower()
            folio = (c.get("folio") or "").lower()
            cuerpo = (c.get("cuerpoTexto") or "").lower().replace(".", "").replace("-", "")
            if filtro.strip().lower() in dest or filtro.strip().lower() in folio or q in cuerpo:
                res.append(c)
        return res


default_buzon_store = InMemoryBuzonStore()


def registrar_en_buzon(correo: Dict[str, Any]) -> Dict[str, Any]:
    return default_buzon_store.registrar(correo)


def listar_buzon_memoria(filtro: Optional[str] = None) -> List[Dict[str, Any]]:
    return default_buzon_store.listar(filtro)
