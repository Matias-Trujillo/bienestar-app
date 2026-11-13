import urllib.request
import json

req = urllib.request.Request('https://spuebas.tail60f764.ts.net/api/backend/auth/login', 
    data=json.dumps({'username': '11.111.111-1', 'password': 'Super#2026'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'})
res = urllib.request.urlopen(req)
token = json.loads(res.read().decode('utf-8'))['access_token']

req2 = urllib.request.Request('https://spuebas.tail60f764.ts.net/api/backend/admin/parametros',
    headers={'Authorization': f'Bearer {token}'})
res2 = urllib.request.urlopen(req2)
params = json.loads(res2.read().decode('utf-8'))
print("=== PARÁMETROS SMTP EN PRODUCCIÓN ===")
for p in params:
    clave = p.get('clave', '')
    if 'SMTP' in clave:
        val = p.get('valor', '')
        if 'PASSWORD' in clave:
            val = '*** (LONG: ' + str(len(val)) + ')' if val else '<VACIO>'
        print(f"{clave}: {val}")

req3 = urllib.request.Request('https://spuebas.tail60f764.ts.net/api/backend/afiliacion/buzon',
    headers={'Authorization': f'Bearer {token}'})
res3 = urllib.request.urlopen(req3)
buzon = json.loads(res3.read().decode('utf-8'))
for c in buzon.get('correos', []):
    if c.get('folio') == 'AF-2026-00007':
        print(json.dumps(c, indent=2))

