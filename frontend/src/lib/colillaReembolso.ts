import { formatCurrency } from './utils';

export interface ColillaReembolsoData {
  codigo: string;
  socioNombre: string;
  socioRut: string;
  beneficiarioNombre: string;
  beneficiarioParentesco: string;
  prestacionLabel: string;
  montoReembolso: number;
  metodoPago?: string;
  numeroDocumento?: string;
  bancoEmisor?: string;
  fechaPago?: string;
  horaProceso?: string;
  recepcionConforme?: boolean;
  recepcionConformeAt?: string | null;
}

/** Abre una Colilla de Recepción Conforme institucional lista para imprimir o guardar como PDF (HU-04 / HU-10). */
export function imprimirColillaReembolso(data: ColillaReembolsoData): void {
  if (typeof window === 'undefined') return;
  const win = window.open('', '_blank', 'width=760,height=860');
  if (!win) return;

  const fechaRecepcion = data.recepcionConformeAt
    ? new Date(data.recepcionConformeAt).toLocaleString('es-CL')
    : null;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Colilla de Recepción Conforme — ${data.codigo}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 28px; background: #f8fafc; }
    .sheet { max-width: 680px; margin: 0 auto; background: #fff; border: 1px solid #cbd5e1; border-radius: 14px; overflow: hidden; }
    .bar { height: 6px; background: linear-gradient(90deg, #006799, #78a200, #cfa145, #d94e28); }
    .header { padding: 20px 26px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 16px; margin: 0; color: #0c2b45; }
    .header p { font-size: 11px; margin: 3px 0 0; color: #475569; }
    .folio { font-family: monospace; font-size: 13px; font-weight: 700; color: #006799; background: #f0f9ff; border: 1px solid #bae6fd; padding: 6px 12px; border-radius: 8px; }
    .body { padding: 22px 26px; }
    .amount-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .amount-box .lbl { font-size: 12px; color: #166534; font-weight: 600; }
    .amount-box .val { font-size: 20px; color: #14532d; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 18px; }
    td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
    td.k { color: #64748b; font-weight: 600; width: 42%; background: #f8fafc; }
    td.v { color: #0f172a; font-weight: 700; }
    .conforme { padding: 12px 16px; border-radius: 10px; font-size: 12px; margin-bottom: 24px; background: ${data.recepcionConforme ? '#ecfdf5' : '#fffbeb'}; border: 1px solid ${data.recepcionConforme ? '#86efac' : '#fde68a'}; color: ${data.recepcionConforme ? '#166534' : '#92400e'}; }
    .firmas { display: flex; justify-content: space-between; gap: 32px; margin-top: 42px; padding-top: 8px; }
    .firma { flex: 1; text-align: center; border-top: 1px solid #64748b; padding-top: 6px; font-size: 11px; color: #475569; }
    .actions { text-align: right; margin-top: 16px; }
    @media print { .actions { display: none; } body { background: #fff; padding: 0; } .sheet { border: none; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="bar"></div>
    <div class="header">
      <div>
        <h1>Comité de Bienestar • Ilustre Municipalidad de Peralillo</h1>
        <p>Colilla Oficial de Pago y Recepción Conforme (HU-04 / HU-10)</p>
      </div>
      <div class="folio">${data.codigo}</div>
    </div>
    <div class="body">
      <div class="amount-box">
        <span class="lbl">Monto Liquidado / Reembolsado</span>
        <span class="val">${formatCurrency(data.montoReembolso)}</span>
      </div>
      <table>
        <tr><td class="k">Socio Titular</td><td class="v">${data.socioNombre} (RUN ${data.socioRut})</td></tr>
        <tr><td class="k">Beneficiario / Paciente</td><td class="v">${data.beneficiarioNombre} (${data.beneficiarioParentesco})</td></tr>
        <tr><td class="k">Prestación Médica</td><td class="v">${data.prestacionLabel}</td></tr>
        <tr><td class="k">Método de Pago</td><td class="v">${data.metodoPago || 'Cheque'}</td></tr>
        <tr><td class="k">N° Cheque / Transferencia</td><td class="v">${data.numeroDocumento || '—'}</td></tr>
        <tr><td class="k">Banco Emisor</td><td class="v">${data.bancoEmisor || 'BancoEstado'}</td></tr>
        <tr><td class="k">Fecha y Hora de Proceso</td><td class="v">${data.fechaPago || '—'} ${data.horaProceso ? `a las ${data.horaProceso} hrs` : ''}</td></tr>
      </table>
      <div class="conforme">
        ${
          data.recepcionConforme
            ? `<strong>✓ RECEPCIÓN CONFORME CONFIRMADA DIGITALMENTE:</strong> El socio titular confirmó conformidad del pago el <strong>${fechaRecepcion}</strong>.`
            : '<strong>Pendiente de confirmación digital:</strong> El socio puede firmar esta colilla impresa o confirmar Recepción Conforme desde su Hoja de Socio en el portal.'
        }
      </div>
      <div class="firmas">
        <div class="firma">Tesorería / Comité de Bienestar<br/>I. Municipalidad de Peralillo</div>
        <div class="firma">Firma Recepción Conforme Socio(a)<br/>${data.socioNombre} • ${data.socioRut}</div>
      </div>
      <div class="actions">
        <button onclick="window.print()" style="padding:8px 16px;background:#006799;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">Imprimir / Guardar PDF</button>
      </div>
    </div>
  </div>
</body>
</html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
