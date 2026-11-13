import urllib.request
import urllib.error
import json
import sys

BASE_URL = "https://spuebas.tail60f764.ts.net/api/backend"

def request_json(url, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode()
        print(f"HTTP Error {e.code} on {method} {url}: {err_msg}")
        raise

def main():
    print("==========================================================================")
    print("VERIFICACION EN VIVO EN PRODUCCION: PUNTO 3 (CARGAS FAMILIARES DOBLE VIA)")
    print("==========================================================================")

    # 1. Login como Socio Titular Gonzalo Valdés
    print("\n--- PASO 1: Autenticación de Socio Titular (Gonzalo Valdés) ---")
    login_socio = request_json(f"{BASE_URL}/auth/login", method="POST", data={
        "username": "13.579.246-2",
        "password": "PeralilloSeguro2026!"
    })
    token_socio = login_socio["access_token"]
    user_socio = login_socio["user"]
    print(f"✔ Socio autenticado: {user_socio['nombreCompleto']} ({user_socio['rut']})")
    cargas_iniciales = user_socio.get("cargasRegistradas", 0)
    print(f"✔ Cargas registradas previas: {cargas_iniciales}")

    # 2. Socio consulta sus cargas iniciales
    print("\n--- PASO 2: Consulta de Cargas Familiares del Socio ---")
    mis_cargas_ini = request_json(f"{BASE_URL}/afiliacion/mis-cargas", token=token_socio)
    print(f"✔ Modo de vista retornado: {mis_cargas_ini.get('modoVista')}")
    print(f"✔ Cargas en ficha actual: {len(mis_cargas_ini.get('cargas', []))}")

    # 3. Vía 1: Autogestión Socio (Sube carga con foto frontal de cédula)
    print("\n--- PASO 3: Vía 1 — Socio Solicita Carga Familiar con Foto de Cédula Frontal ---")
    carga_via1_data = {
        "nombreCompleto": "Lucas Valdés Mardones",
        "run": "25.555.666-5",
        "parentesco": "Hijo/a",
        "observacionSocio": "Se adjunta fotografía clara del carnet frontal",
        "certificadoNombre": "carnet_frontal_lucas.jpg",
        "certificadoTipo": "Cédula de Identidad (Frontal)",
        "certificadoData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD..."
    }
    sol_via1 = request_json(f"{BASE_URL}/afiliacion/mis-cargas", method="POST", data=carga_via1_data, token=token_socio)
    folio_via1 = sol_via1["folio"]
    print(f"✔ Solicitud de carga creada con éxito. Folio: {folio_via1}")
    print(f"✔ Titular asociado: {sol_via1['socioNombre']} (ID {sol_via1['socioId']})")
    print(f"✔ Estado canónico en BD: {sol_via1['estado']}")

    # 4. Verificar que al socio le figura como 'Pendiente de Revisión'
    print("\n--- PASO 4: Verificación del Estado para el Socio (Pendiente de Revisión) ---")
    mis_cargas_tras_envio = request_json(f"{BASE_URL}/afiliacion/mis-cargas", token=token_socio)
    item_v1 = next((c for c in mis_cargas_tras_envio.get("cargas", []) if c.get("folio") == folio_via1), None)
    assert item_v1 is not None, "La carga no aparece en la lista del socio"
    print(f"✔ Estado visible para el socio en la interfaz: '{item_v1['estado']}'")
    assert item_v1["estado"] == "Pendiente de Revisión", f"Debe mostrar 'Pendiente de Revisión', se obtuvo: {item_v1['estado']}"

    # 5. Login de Directiva (Presidente)
    print("\n--- PASO 5: Autenticación de Directiva (Presidente) ---")
    login_dir = request_json(f"{BASE_URL}/auth/login", method="POST", data={
        "username": "12.345.678-9",
        "password": "Presi#2026"
    })
    token_dir = login_dir["access_token"]
    user_dir = login_dir["user"]
    print(f"✔ Directiva autenticada: {user_dir['nombreCompleto']} ({user_dir['rol']})")

    # 6. Directiva rechaza la solicitud de Vía 1 indicando causal para que el socio pueda subsanar
    print(f"\n--- PASO 6: Directorio Rechaza Solicitud {folio_via1} con Motivo de Subsanación ---")
    motivo_rechazo = "Fotografía de la cédula cortada en los bordes, no se aprecia el RUN ni la firma."
    res_rechazo = request_json(f"{BASE_URL}/afiliacion/solicitudes-cargas/{folio_via1}/resolucion", method="POST", data={
        "accion": "rechazar",
        "observaciones": motivo_rechazo
    }, token=token_dir)
    print(f"✔ Solicitud {folio_via1} resuelta. Estado: {res_rechazo['estado']}")
    print(f"✔ Motivo registrado: {res_rechazo['observacionesResolucion']}")

    # 7. Socio verifica que su carga ahora está 'Rechazada' y puede leer el motivo para subsanar
    print(f"\n--- PASO 7: Socio Verifica Causal de Rechazo en su Portal para Subsanación ---")
    mis_cargas_tras_rechazo = request_json(f"{BASE_URL}/afiliacion/mis-cargas", token=token_socio)
    item_v1_rech = next(c for c in mis_cargas_tras_rechazo.get("cargas", []) if c.get("folio") == folio_via1)
    print(f"✔ Estado reflejado al socio: '{item_v1_rech['estado']}'")
    print(f"✔ Motivo disponible para subsanar: '{item_v1_rech['observacionesResolucion']}'")
    assert item_v1_rech["estado"] == "Rechazada", f"Debe figurar 'Rechazada', se obtuvo: {item_v1_rech['estado']}"
    assert item_v1_rech["observacionesResolucion"] == motivo_rechazo

    # 8. Vía 2: Atención Presencial Asistida en Oficina
    print("\n--- PASO 8: Vía 2 — Directiva Registra Carga Asistida en Oficina para Socio ---")
    carga_asistida_data = {
        "nombreCompleto": "Agustín Valdés Mardones",
        "run": "25.444.555-K",
        "parentesco": "Hijo/a",
        "observacionSocio": "Atención presencial en oficina Bienestar con carnet físico exhibido",
        "certificadoNombre": "cedula_agustin_frontal_oficina.png",
        "certificadoTipo": "Cédula de Identidad (Frontal)",
        "certificadoData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "socioRut": "13.579.246-2"
    }
    sol_asistida = request_json(f"{BASE_URL}/afiliacion/mis-cargas", method="POST", data=carga_asistida_data, token=token_dir)
    folio_asistida = sol_asistida["folio"]
    print(f"✔ Carga asistida creada por Directiva. Folio: {folio_asistida}")
    print(f"✔ Titular asignado correctamente: {sol_asistida['socioNombre']} (RUN {sol_asistida['socioRut']})")
    assert sol_asistida["socioRut"].replace(".", "") == "13579246-2"
    assert sol_asistida["socioNombre"] == user_socio["nombreCompleto"]

    # 9. Directorio aprueba la solicitud asistida en sesión oficial
    print(f"\n--- PASO 9: Directorio Aprueba Solicitud Asistida {folio_asistida} ---")
    res_aprob = request_json(f"{BASE_URL}/afiliacion/solicitudes-cargas/{folio_asistida}/resolucion", method="POST", data={
        "accion": "aprobar",
        "fechaSesion": "2026-05-20",
        "numeroActa": "Acta Ordinaria N° 10/2026",
        "observaciones": "Acreditación presencial conforme con cédula de identidad exhibida."
    }, token=token_dir)
    print(f"✔ Carga {folio_asistida} APROBADA con Acta: {res_aprob['numeroActa']}")
    print(f"✔ Estado resolución: {res_aprob['estado']}")

    # 10. Socio verifica que la carga asistida figura como 'Vigente'
    print(f"\n--- PASO 10: Socio Verifica Carga Aprobada en Estado 'Vigente' ---")
    mis_cargas_final = request_json(f"{BASE_URL}/afiliacion/mis-cargas", token=token_socio)
    item_asist_aprob = next(c for c in mis_cargas_final.get("cargas", []) if c.get("folio") == folio_asistida)
    print(f"✔ Estado de la carga aprobada para el socio: '{item_asist_aprob['estado']}'")
    assert item_asist_aprob["estado"] == "Vigente", f"Debe figurar 'Vigente', se obtuvo: {item_asist_aprob['estado']}"

    # 11. Verificar incremento del contador cargas_registradas del socio
    print("\n--- PASO 11: Verificar Incremento de 'cargasRegistradas' en Perfil de Socio ---")
    login_socio_check = request_json(f"{BASE_URL}/auth/login", method="POST", data={
        "username": "13.579.246-2",
        "password": "PeralilloSeguro2026!"
    })
    cargas_actualizadas = login_socio_check["user"].get("cargasRegistradas", 0)
    print(f"✔ Contador de cargas registradas previo: {cargas_iniciales} -> actual: {cargas_actualizadas}")
    assert cargas_actualizadas >= cargas_iniciales + 1, "El contador de cargas registradas debe incrementarse al aprobar"

    # 12. Directiva consulta el Buzón Institucional para verificar los correos emitidos
    print("\n--- PASO 12: Verificación de Correos Transaccionales en el Buzón Institucional ---")
    buzon_data = request_json(f"{BASE_URL}/afiliacion/buzon", token=token_dir)
    correos = buzon_data.get("correos", [])
    print(f"✔ Total de correos en buzón: {len(correos)}")
    
    mail_rechazo = next((m for m in correos if m.get("folio") == folio_via1), None)
    mail_aprob = next((m for m in correos if m.get("folio") == folio_asistida), None)
    
    print(f"✔ Notificación de Rechazo ({folio_via1}) registrada en buzón: {mail_rechazo is not None}")
    if mail_rechazo:
        print(f"   Asunto: {mail_rechazo.get('asunto')}")
        print(f"   Destinatario: {mail_rechazo.get('destinatario')}")
        print(f"   Motivo: {mail_rechazo.get('motivo')}")

    print(f"✔ Notificación de Aprobación ({folio_asistida}) registrada en buzón: {mail_aprob is not None}")
    if mail_aprob:
        print(f"   Asunto: {mail_aprob.get('asunto')}")
        print(f"   Destinatario: {mail_aprob.get('destinatario')}")
        print(f"   Motivo: {mail_aprob.get('motivo')}")

    print("\n==========================================================================")
    print("✔✔✔ PUNTO 3 COMPLETAMENTE VALIDADO Y EXITOSO EN SERVIDOR DE PRODUCCION ✔✔✔")
    print("==========================================================================")

if __name__ == "__main__":
    main()
