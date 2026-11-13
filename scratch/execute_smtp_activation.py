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
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode()
        print(f"HTTP Error {e.code} on {method} {url}: {err_msg}")
        raise

def main():
    print("==========================================================================")
    print("ACTIVACIÓN Y DESPACHO DE CORREOS REALES SMTP (PERALILLO)")
    print("==========================================================================")

    # 1. Autenticación como Superadmin
    print("\n--- PASO 1: Login como Superadministrador ---")
    login_super = request_json(f"{BASE_URL}/auth/login", method="POST", data={
        "username": "11.111.111-1",
        "password": "Super#2026"
    })
    token_super = login_super["access_token"]
    print(f"✔ Superadmin autenticado: {login_super['user']['nombreCompleto']}")

    # 2. Configurar SMTP en Producción y Enviar Correo de Verificación
    print("\n--- PASO 2: Inyectar Credenciales SMTP y Enviar Correo de Prueba ---")
    smtp_payload = {
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "smtp_user": "bperalillo@gmail.com",
        "smtp_password": "xgsnewzymyqjumgc",
        "destinatario_prueba": "mntrujillof@gmail.com"
    }
    res_smtp = request_json(f"{BASE_URL}/admin/smtp-config", method="POST", data=smtp_payload, token=token_super)
    print(f"✔ Resultado de conexión SMTP: enviado={res_smtp.get('enviado')}")
    print(f"✔ Mensaje del servidor: {res_smtp.get('mensaje')}")
    if not res_smtp.get("enviado"):
        print("❌ Error al probar conexión SMTP. Abortando.")
        sys.exit(1)

    # 3. Reenviar correo de recepción para AF-2026-00007
    print("\n--- PASO 3: Reenviar Notificación de Recepción para AF-2026-00007 ---")
    res_reenvio = request_json(
        f"{BASE_URL}/afiliacion/solicitudes/AF-2026-00007/reenviar-correo",
        method="POST",
        token=token_super
    )
    email_rec = res_reenvio.get("notificacionEmail", {})
    print(f"✔ Correo de Recepción re-despachado:")
    print(f"   Destinatario: {email_rec.get('destinatario')}")
    print(f"   Enviado SMTP Real: {email_rec.get('enviadoSmtp')}")
    print(f"   Error SMTP: {email_rec.get('errorSmtp')}")

    # 4. Login como Presidente de Directiva
    print("\n--- PASO 4: Login como Presidente de Directiva (María Elena Soto) ---")
    login_presi = request_json(f"{BASE_URL}/auth/login", method="POST", data={
        "username": "12.345.678-9",
        "password": "Presi#2026"
    })
    token_presi = login_presi["access_token"]
    print(f"✔ Presidente autenticado: {login_presi['user']['nombreCompleto']}")

    # 5. Aprobar la solicitud AF-2026-00007 en Sesión de Directorio
    print("\n--- PASO 5: Aprobación Oficial de Solicitud AF-2026-00007 ---")
    payload_resolver = {
        "accion": "aprobar",
        "fechaSesion": "2026-11-13",
        "numeroActa": "Acta Ordinaria N° 11/2026",
        "observaciones": "Incorporación aprobada unánimemente por el Directorio de Bienestar."
    }
    res_resolucion = request_json(
        f"{BASE_URL}/afiliacion/solicitudes/AF-2026-00007/resolucion",
        method="POST",
        data=payload_resolver,
        token=token_presi
    )
    print(f"✔ Solicitud resuelta: Estado={res_resolucion.get('estado')}")
    email_aprob = res_resolucion.get("notificacionEmail", {})
    print(f"✔ Correo de Aprobación y Bienvenida:")
    print(f"   Destinatario: {email_aprob.get('destinatario')}")
    print(f"   Enviado SMTP Real: {email_aprob.get('enviadoSmtp')}")
    print(f"   Error SMTP: {email_aprob.get('errorSmtp')}")
    print(f"   Credenciales asignadas: {email_aprob.get('credenciales')}")

    # 6. Consultar buzón oficial de correos para mntrujillof@gmail.com
    print("\n--- PASO 6: Inspección del Buzón de Correos para mntrujillof@gmail.com ---")
    buzon = request_json(f"{BASE_URL}/afiliacion/buzon?q=mntrujillof@gmail.com", token=token_presi)
    print(f"✔ Total correos registrados en buzón para esta casilla: {buzon.get('total')}")
    for idx, c in enumerate(buzon.get("correos", []), 1):
        print(f"   [{idx}] Tipo: {c.get('tipo')} | Folio: {c.get('folio')} | Enviado SMTP: {c.get('enviadoSmtp')}")

    # 7. Probar inicio de sesión con el nuevo socio creado
    print("\n--- PASO 7: Comprobación de Primer Acceso del Nuevo Socio ---")
    login_nuevo_socio = request_json(f"{BASE_URL}/auth/login", method="POST", data={
        "username": "20.545.210-9",
        "password": "Peralillo#2054"
    })
    user_data = login_nuevo_socio["user"]
    print(f"✔ Login exitoso para nuevo socio: {user_data['nombreCompleto']} ({user_data['rut']})")
    print(f"✔ Debe cambiar password: {user_data.get('debeCambiarPassword')}")
    print(f"✔ Estado de cuenta: {user_data.get('estadoPassword')}")

    print("\n==========================================================================")
    print("¡VERIFICACIÓN COMPLETA Y CORREOS REALES ENVIADOS A mntrujillof@gmail.com!")
    print("==========================================================================")

if __name__ == "__main__":
    main()
