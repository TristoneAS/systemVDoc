/** Días hacia adelante para alertas de retención por vencer. */
export const DIAS_AVISO_RETENCION = 5;

/** Valor enviado desde formularios cuando la retención no vence. */
export const RETENCION_AL_MAS_ACTUAL_VALOR = "AL_MAS_ACTUAL";

/** Fecha sentinel en columna DATE para "al más actual". */
export const RETENCION_AL_MAS_ACTUAL_FECHA = "9999-12-31";

export const RETENCION_AL_MAS_ACTUAL_LABEL = "Al más actual";

function fechaLocalDesdeDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isRetencionAlMasActual(value) {
  if (value == null || value === "") return false;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return fechaLocalDesdeDate(value) === RETENCION_AL_MAS_ACTUAL_FECHA;
  }
  const s = String(value).trim().toUpperCase();
  if (s === RETENCION_AL_MAS_ACTUAL_VALOR) return true;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso?.[1] === RETENCION_AL_MAS_ACTUAL_FECHA;
}

/** Valor para controles de formulario (fecha ISO o AL_MAS_ACTUAL). */
export function retencionValorParaForm(value) {
  if (isRetencionAlMasActual(value)) return RETENCION_AL_MAS_ACTUAL_VALOR;
  return fechaRetencionParaInput(value);
}

export function tieneValorRetencion(value) {
  return isRetencionAlMasActual(value) || !!fechaRetencionParaInput(value);
}

/** Normaliza valor de BD o formulario a YYYY-MM-DD para input type="date". */
export function fechaRetencionParaInput(value) {
  if (value == null || value === "") return "";
  if (isRetencionAlMasActual(value)) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return fechaLocalDesdeDate(value);
  }
  const s = String(value).trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  return "";
}

/** Formato legible para tablas y detalle. */
export function formatFechaRetencion(value) {
  if (isRetencionAlMasActual(value)) return RETENCION_AL_MAS_ACTUAL_LABEL;
  const input = fechaRetencionParaInput(value);
  if (!input) return "—";
  const d = new Date(`${input}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Parsea fecha opcional para guardar en columna DATE.
 * Acepta string del formulario, ISO o Date devuelto por MySQL.
 * @returns { value: string|null, error?: string }
 */
export function parseOptionalFechaRetencion(raw) {
  if (raw == null || raw === "") return { value: null };

  if (isRetencionAlMasActual(raw)) {
    return { value: RETENCION_AL_MAS_ACTUAL_FECHA };
  }

  const normalizada = fechaRetencionParaInput(raw);
  if (!normalizada) {
    return {
      value: null,
      error:
        "La fecha de retención debe tener formato válido (YYYY-MM-DD).",
    };
  }
  const d = new Date(`${normalizada}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return { value: null, error: "La fecha de retención no es válida." };
  }
  return { value: normalizada };
}
