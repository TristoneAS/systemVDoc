/** Plazo en días naturales antes del rechazo automático (compartido UI + API). */
export const DIAS_LIMITE_APROBACION_SOLICITUD = 10;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Fecha de calendario local (00:00) a partir de valor MySQL/ISO. */
function fechaCalendarioLocal(value) {
  if (value == null || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const texto = String(value).trim();
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]) - 1;
    const d = Number(match[3]);
    return new Date(y, m, d);
  }

  const dt = new Date(texto);
  if (Number.isNaN(dt.getTime())) return null;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

/** Plazo de rechazo automático (días naturales desde la fecha de creación). */
export function calcularPlazoRechazoAutomatico(
  fechaCreacion,
  diasLimite = DIAS_LIMITE_APROBACION_SOLICITUD,
) {
  const inicioCal = fechaCalendarioLocal(fechaCreacion);
  if (!inicioCal) return null;

  const limiteCal = new Date(
    inicioCal.getFullYear(),
    inicioCal.getMonth(),
    inicioCal.getDate() + diasLimite,
  );

  const hoyCal = fechaCalendarioLocal(new Date());
  const diasRestantes = Math.floor(
    (limiteCal.getTime() - hoyCal.getTime()) / MS_POR_DIA,
  );

  const fechaLimiteTexto = limiteCal.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return {
    diasRestantes,
    fechaLimiteTexto,
    vencido: diasRestantes <= 0,
    urgente: diasRestantes > 0 && diasRestantes <= 2,
  };
}
