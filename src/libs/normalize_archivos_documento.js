/** Normaliza `archivos` desde API (array, JSON string o fila nula de JSON_ARRAYAGG). */
export function normalizeArchivosDocumento(raw) {
  if (raw == null) return [];
  let list = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list.filter(
    (a) =>
      a &&
      (a.id_archivo != null || String(a.nombre_archivo ?? "").trim() !== ""),
  );
}
