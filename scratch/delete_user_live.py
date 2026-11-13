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
    print("ELIMINACIÓN DE CUENTA DE PRUEBA Y LIBERACIÓN DE RUN EN PRODUCCIÓN")
    print("==========================================================================")

    # 1. Login como Superadmin
    print("\n--- PASO 1: Login como Superadministrador ---")
    login_super = request_json(f"{BASE_URL}/auth/login", method="POST", data={
        "username": "11.111.111-1",
        "password": "Super#2026"
    })
    token_super = login_super["access_token"]
    print(f"✔ Superadmin autenticado: {login_super['user']['nombreCompleto']}")

    # 2. Buscar al usuario ID 14 o por RUN 20.545.210-9
    print("\n--- PASO 2: Identificación del Usuario en Producción ---")
    users = request_json(f"{BASE_URL}/admin/usuarios", token=token_super)
    target_user = None
    for u in users:
        rut_clean = u.get("rut", "").replace(".", "").replace("-", "").upper()
        if "205452109" in rut_clean or u.get("email") in ("mntrujillof@gmail.com", "mntrujillog@gmail.com"):
            target_user = u
            break

    if not target_user:
        print("ℹ No se encontró cuenta de usuario activa con ese RUN/Email. Verificando solicitudes...")
    else:
        user_id = target_user["id"]
        print(f"✔ Usuario localizado: ID {user_id} | {target_user['nombreCompleto']} | {target_user['rut']} | {target_user['email']}")
        
        # 3. Eliminar usuario usando el endpoint administrativo seguro
        print(f"\n--- PASO 3: Ejecutar DELETE /admin/usuarios/{user_id} ---")
        res_del = request_json(f"{BASE_URL}/admin/usuarios/{user_id}", method="DELETE", token=token_super)
        print(f"✔ Resultado del servidor: {res_del.get('mensaje')}")

    # 4. Verificar liberación completa
    print("\n--- PASO 4: Comprobación de Liberación de RUN y Correo ---")
    users_post = request_json(f"{BASE_URL}/admin/usuarios", token=token_super)
    existe_user = any("205452109" in u.get("rut", "").replace(".", "").replace("-", "") for u in users_post)
    print(f"✔ ¿Existe usuario con RUN 20.545.210-9 en tabla usuarios?: {existe_user} (Debe ser False)")

    solicitudes = request_json(f"{BASE_URL}/afiliacion/solicitudes", token=token_super)
    existe_sol = any("205452109" in s.get("run", "").replace(".", "").replace("-", "") for s in solicitudes)
    print(f"✔ ¿Existe solicitud con RUN 20.545.210-9 en solicitudes?: {existe_sol} (Debe ser False)")

    if not existe_user and not existe_sol:
        print("\n==========================================================================")
        print("¡ÉXITO TOTAL: CUENTA Y SOLICITUD ELIMINADAS! EL RUN ESTÁ 100% LIBRE.")
        print("==========================================================================")
        print("Ya puedes ingresar a https://spuebas.tail60f764.ts.net/afiliacion/solicitud")
        print("y enviar tu postulación nuevamente desde el formulario.")
    else:
        print("\n⚠ Advertencia: Aún quedan rastros. Revisar.")
        sys.exit(1)

if __name__ == "__main__":
    main()
