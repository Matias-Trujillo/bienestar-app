# Hoja de Ruta y Pendientes — Bienestar App

**Última actualización:** 25/11/2026  
**Estado global actual:** **8 / 11 bloques cumplidos al 100%** (Vecino y Nuevo Talento + Ofertas Laborales RRHH, HU-01, HU-02, HU-03, HU-04, HU-05, HU-08, HU-10).

---

## Próximos Bloques Pendientes

### Bloque 2 — Módulo Financiero y Automatización Bancaria (Prioridad Alta)
- [x] **HU-08 — Aporte Municipal en UTM (100% — Entrega 1 completada):**
  - Tabla 3FN independiente `aportes_municipales_utm` (año fiscal, socios congelados al 31-dic, valor UTM en CLP, N° decreto, fecha, monto total).
  - Consulta/cierre de padrón al 31 de diciembre (`GET /finanzas/aportes-utm/padron`).
  - Panel y modal en `/finanzas` para ingresar valor UTM y calcular automáticamente `Socios al 31-dic × 4 × Valor UTM` sumándolo al presupuesto real con auditoría e IP real.
- [ ] **HU-07 — Conciliación Código 47 RRHH + Cartola BancoEstado (Parcial):**
  - Crear tablas `conciliaciones_planilla` y `pagos_aportes_mensuales`.
  - Importador de planilla mensual devuelta por RRHH (código 47) + comprobante BancoEstado con cruce socio a socio (*Al día* vs. alerta por brecha) y modal de regularización manual.
- [ ] **Automatización de Cheques Cobrados (integrado en Conciliación BancoEstado):**
  - Subida de cartola bancaria CSV/Excel de BancoEstado para cruzar automáticamente por `N° de Cheque` y `Monto` los reembolsos en estado **Cheque Generado (Por Retirar)** y pasarlos en lote a **Pagado / Cobrado en Banco**.
  - Alerta automática de cheques en tránsito con más de 60 días sin cobrar.
  - Botón opcional para Tesorería en `/aprobaciones` (*Confirmar Entrega Presencial*) cuando el socio firma la colilla en papel en oficina.

### Bloque 3 — Reglas Normativas, Auditoría y Excel Nativo (Cierre al 100%)
- [ ] **HU-09 — Tope de 7 Directivos e IP Real (Parcial):**
  - Validar tope cerrado de 7 cuentas directivas activas (1 Presidente administrador + 6 revisores) y dar acceso al rol `PRESIDENTE` en `/admin`.
  - Capturar IP real del cliente (`X-Forwarded-For` / `request.client.host`) en todos los registros de `audit_logs`.
- [ ] **HU-06 — Liquidación Masiva Completa (Parcial):**
  - Lectura nativa de archivos `.xlsx` binarios con `openpyxl`.
  - Carga paralela de decretos PDF por RUN en planillas masivas.
  - Incluir **Bono Vacaciones** dentro del flujo de liquidación masiva.
