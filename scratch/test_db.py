import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath("backend"))

from app.db.session import AsyncSessionLocal
from sqlalchemy import text, select
from app.models.reembolso import SolicitudReembolso
from app.models.user import User

async def main():
    async with AsyncSessionLocal() as db:
        print("1. Checking columns of solicitudes_reembolso:")
        res = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'solicitudes_reembolso';"))
        cols = [r[0] for r in res.fetchall()]
        print("Columns in DB:", cols)
        print("beneficiario_run in DB?", "beneficiario_run" in cols)
        
        print("\n2. Trying select(SolicitudReembolso):")
        try:
            r = await db.scalars(select(SolicitudReembolso).limit(1))
            print("Query SolicitudReembolso succeeded!", r.first())
        except Exception as e:
            print("ERROR querying SolicitudReembolso:", type(e), e)

        print("\n3. Testing login query:")
        try:
            u = await db.scalar(select(User).where(User.email == "superadmin@mperalillo.cl"))
            print("User found:", u.id if u else None, u.email if u else None)
            from app.services.reembolso_service import obtener_resumen_socio
            resumen = await obtener_resumen_socio(u, db)
            print("obtener_resumen_socio succeeded:", resumen)
        except Exception as e:
            print("ERROR in login query / resumen:", type(e), e)

if __name__ == "__main__":
    asyncio.run(main())
