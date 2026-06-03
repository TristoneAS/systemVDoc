/** Normaliza `solicitudes.estado` para comparaciones y UI. */
export function normalizarEstadoSolicitud(estado) {
  return String(estado ?? "")
    .trim()
    .toLowerCase();
}

export function esEstadoObsoletaValor(estado) {
  return normalizarEstadoSolicitud(estado) === "obsoleta";
}

/** Condición SQL: excluir obsoletas del listado (comparación sin distinguir mayúsculas). */
export function sqlExcluirObsoletas() {
  return `LOWER(TRIM(COALESCE(estado, ''))) <> 'obsoleta'`;
}

export function filtrarSolicitudesPorObsoletas(rows, mostrarObsoletas) {
  if (mostrarObsoletas) return rows;
  return (rows || []).filter((r) => !esEstadoObsoletaValor(r.estado));
}
