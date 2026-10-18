import React, { useState } from 'react';
import { BonoAdminItem } from './CatalogoBonosAdmin';

interface ModalCrearEditarBonoProps {
  bono: BonoAdminItem | null; // null si es nuevo
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, isEditing: boolean, bonoId?: number) => Promise<void>;
}

export const ModalCrearEditarBono: React.FC<ModalCrearEditarBonoProps> = ({
  bono,
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const isEditing = !!bono;

  const [codigo, setCodigo] = useState(bono?.codigo || '');
  const [nombre, setNombre] = useState(bono?.nombre || '');
  const [porcentaje, setPorcentaje] = useState(bono?.porcentaje || 10.0);
  const [categoria, setCategoria] = useState(bono?.categoria || 'Beneficio Económico');
  const [requisitos, setRequisitos] = useState(bono?.requisitos || '');
  const [documentacionRequerida, setDocumentacionRequerida] = useState(bono?.documentacion_requerida || '');
  const [reglaAsignacion, setReglaAsignacion] = useState(bono?.regla_asignacion || '');
  const [periodoDevengo, setPeriodoDevengo] = useState(bono?.periodo_devengo || '');
  const [permitePostulacion, setPermitePostulacion] = useState(bono?.permite_postulacion_socio ?? true);
  const [esCalendario, setEsCalendario] = useState(bono?.es_calendario ?? false);
  const [activo, setActivo] = useState(bono?.activo ?? true);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    try {
      const payload = {
        codigo: codigo.trim().toLowerCase().replace(/\s+/g, '_'),
        nombre: nombre.trim(),
        porcentaje: Number(porcentaje),
        categoria: categoria.trim(),
        requisitos: requisitos.trim(),
        documentacion_requerida: documentacionRequerida.trim(),
        regla_asignacion: reglaAsignacion.trim(),
        periodo_devengo: periodoDevengo.trim() || undefined,
        permite_postulacion_socio: permitePostulacion,
        es_calendario: esCalendario,
        activo,
        icono: 'gift',
      };

      await onSubmit(payload, isEditing, bono?.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar beneficio.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {isEditing ? 'Configuración de Beneficio' : 'Nuevo Beneficio Social'}
            </span>
            <h3 className="text-lg font-bold text-slate-800 mt-1">
              {isEditing ? `Editar: ${bono.nombre}` : 'Crear Nuevo Bono Reglamentario'}
            </h3>
            <p className="text-xs text-slate-500">
              Se sincroniza con el catálogo de Beneficios Sociales y queda registrado en la bitácora de auditoría.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nombre del Bono *</label>
              <input
                type="text"
                required
                placeholder="Ej: Bono Fiestas Patrias"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Código Único de Identificación *</label>
              <input
                type="text"
                required
                disabled={isEditing}
                placeholder="Ej: fiestas_patrias"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Porcentaje sobre Grado 15 (%) *</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="200"
                required
                value={porcentaje}
                onChange={(e) => setPorcentaje(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Categoría</label>
              <input
                type="text"
                placeholder="Ej: Asignación Especial / Festividades"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Requisitos de Concesión</label>
            <textarea
              rows={2}
              placeholder="Ej: Cumplir al menos 6 meses de permanencia continua en el Comité de Bienestar..."
              value={requisitos}
              onChange={(e) => setRequisitos(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Documentación Requerida de Respaldo</label>
            <input
              type="text"
              placeholder="Ej: Certificado laboral, comprobante o liquidación oficial"
              value={documentacionRequerida}
              onChange={(e) => setDocumentacionRequerida(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Período de Devengo / Fecha de Pago</label>
            <input
              type="text"
              placeholder="Ej: Primera quincena de septiembre / Fiestas Patrias"
              value={periodoDevengo}
              onChange={(e) => setPeriodoDevengo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={permitePostulacion}
                onChange={(e) => setPermitePostulacion(e.target.checked)}
                className="accent-blue-600 rounded"
              />
              <span className="font-semibold text-slate-700">Permite postulación del socio</span>
            </label>

            <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={esCalendario}
                onChange={(e) => setEsCalendario(e.target.checked)}
                className="accent-blue-600 rounded"
              />
              <span className="font-semibold text-slate-700">Bono de Calendario</span>
            </label>

            <label className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="accent-emerald-600 rounded"
              />
              <span className="font-semibold text-emerald-800">Activo / Visible</span>
            </label>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Beneficio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
