# Hoja de Ruta y Pendientes — Bienestar App

**Última actualización:** 25/11/2026  
**Estado global actual:** **9 / 11 bloques cumplidos al 100%** (Vecino y Nuevo Talento + Ofertas Laborales RRHH, HU-01, HU-02, HU-03, HU-04, HU-05, HU-07, HU-08, HU-10).

---

## Próximos Bloques Pendientes

### Bloque 2 — Módulo Financiero y Automatización Bancaria (COMPLETADO AL 100%)
- [x] **HU-08 — Aporte Municipal en UTM (100% — Entrega 1 completada):**
  - Tabla 3FN independiente `aportes_municipales_utm` (año fiscal, socios congelados al 31-dic, valor UTM en CLP, N° decreto, fecha, monto total).
  - Consulta/cierre de padrón al 31 de diciembre (`GET /finanzas/aportes-utm/padron`).
  - Dashboard Ejecutivo de Tesorería con gráficos interactivos, simulador UTM y modal moderno de registro/anulación en `/finanzas`.
- [x] **HU-07 — Conciliación Código 47 RRHH + Cartola BancoEstado (100% — Entrega 2 completada):**
  - Tablas 3FN independientes `conciliaciones_planilla` y `pagos_aportes_mensuales`.
  - Importador de planilla mensual devuelta por RRHH (código 47) + comprobante BancoEstado con cruce socio a socio (*Al día* vs. *Con brecha*), plantilla descargable y modal moderno de regularización manual.
- [x] **Automatización de Cheques Cobrados (integrado en Conciliación BancoEstado — Entrega 2 completada):**
  - Subida de cartola bancaria CSV de BancoEstado para cruzar automáticamente por `N° de Cheque` y `Monto` los reembolsos en estado **Cheque Generado (Por Retirar)** y pasarlos en lote a **Pagado / Cobrado en Banco**.
  - Alerta automática de cheques en tránsito con más de 60 días sin cobrar y plantilla descargable de cartola.

### Bloque 3 — Reglas Normativas, Auditoría y Excel Nativo (Cierre al 100%)
- [ ] **HU-09 — Tope de 7 Directivos e IP Real (Parcial):**
  - Validar tope cerrado de 7 cuentas directivas activas (1 Presidente administrador + 6 revisores) y dar acceso al rol `PRESIDENTE` en `/admin`.
  - Capturar IP real del cliente (`X-Forwarded-For` / `request.client.host`) en todos los registros de `audit_logs`.
- [ ] **HU-06 — Liquidación Masiva Completa (Parcial):**
  - Lectura nativa de archivos `.xlsx` binarios con `openpyxl`.
  - Carga paralela de decretos PDF por RUN en planillas masivas.
  - Incluir **Bono Vacaciones** dentro del flujo de liquidación masiva.
