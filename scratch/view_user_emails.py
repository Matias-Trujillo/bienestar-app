import urllib.request
import json

req = urllib.request.Request('https://spuebas.tail60f764.ts.net/api/backend/auth/login', 
    data=json.dumps({'username': '11.111.111-1', 'password': 'Super#2026'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'})
res = urllib.request.urlopen(req)
token = json.loads(res.read().decode('utf-8'))['access_token']

req2 = urllib.request.Request('https://spuebas.tail60f764.ts.net/api/backend/afiliacion/buzon?q=mntrujillof@gmail.com',
    headers={'Authorization': f'Bearer {token}'})
res2 = urllib.request.urlopen(req2)
buzon = json.loads(res2.read().decode('utf-8'))
print(f"Total correos encontrados: {buzon.get('total')}")
for c in buzon.get('correos', []):
    print("----------------------------------------------------------------")
    print(f"Tipo: {c.get('tipo')}")
    print(f"Folio: {c.get('folio')}")
    print(f"Asunto: {c.get('asunto')}")
    print(f"Destinatario: {c.get('destinatario')}")
    print(f"Enviado SMTP: {c.get('enviadoSmtp')}")
    print(f"Error SMTP: {c.get('errorSmtp')}")
    print(f"Fecha Emisión: {c.get('fechaEmision')}")
    if c.get('credenciales'):
        print(f"Credenciales: {c.get('credenciales')}")
