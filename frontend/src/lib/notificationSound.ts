/**
 * Utilidad de audio profesional para notificaciones institucionales.
 * Utiliza Web Audio API nativo para sintetizar un acorde de campana cristalino
 * sin dependencias externas, sin descargas de archivos MP3 ni problemas de CORS.
 */

const STORAGE_KEY = 'bienestar_sound_enabled';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {
      // Ignorar restricciones de autoplay si aún no hubo gesto del usuario
    });
  }
  return audioCtx;
}

/**
 * Consulta si las alertas sonoras están habilitadas por el usuario.
 * Por defecto está habilitado (true).
 */
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== 'false';
  } catch {
    return true;
  }
}

/**
 * Activa o desactiva las alertas sonoras y persiste en localStorage.
 */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Manejo de cuota o modo incógnito restrictivo
  }
}

/**
 * Alterna el estado de sonido y retorna el nuevo valor.
 */
export function toggleSoundEnabled(): boolean {
  const current = isSoundEnabled();
  const next = !current;
  setSoundEnabled(next);
  if (next) {
    // Reproduce un suave "bip" de confirmación al activarse
    playNotificationChime(true);
  }
  return next;
}

/**
 * Reproduce un acorde armónico bitonal cristalino y suave (Mi5 659.25Hz -> La5 880Hz).
 * Si force = true, se reproduce ignorando la preferencia (usado al probar/activar sonido).
 */
export function playNotificationChime(force: boolean = false): void {
  if (!force && !isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => emitChime(ctx)).catch(() => {});
    } else {
      emitChime(ctx);
    }
  } catch (err) {
    // En caso de que el navegador bloquee audio, se degrada elegantemente sin interrumpir la UX
    console.debug('Aviso sonoro no disponible en este contexto:', err);
  }
}

function emitChime(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // Nodo maestro de volumen con ganancia sutil para evitar sobresaltos
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.18, now);
  masterGain.connect(ctx.destination);

  // Primera nota: Mi 5 (659.25 Hz) con ataque rápido y decaimiento
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(659.25, now);

  gain1.gain.setValueAtTime(0.001, now);
  gain1.gain.linearRampToValueAtTime(0.6, now + 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

  osc1.connect(gain1);
  gain1.connect(masterGain);
  osc1.start(now);
  osc1.stop(now + 0.48);

  // Segunda nota: La 5 (880.00 Hz) con ligero retraso para formar el repique armónico
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(880.0, now + 0.08);

  // Armónico sutil para calidez acústica (tipo campana de cristal)
  const oscHarmonic = ctx.createOscillator();
  const gainHarmonic = ctx.createGain();
  oscHarmonic.type = 'triangle';
  oscHarmonic.frequency.setValueAtTime(1760.0, now + 0.08);
  gainHarmonic.gain.setValueAtTime(0.0001, now + 0.08);
  gainHarmonic.gain.linearRampToValueAtTime(0.15, now + 0.10);
  gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
  oscHarmonic.connect(gainHarmonic);
  gainHarmonic.connect(masterGain);
  oscHarmonic.start(now + 0.08);
  oscHarmonic.stop(now + 0.70);

  gain2.gain.setValueAtTime(0.0001, now + 0.08);
  gain2.gain.linearRampToValueAtTime(0.85, now + 0.10);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.70);

  osc2.connect(gain2);
  gain2.connect(masterGain);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.75);
}
