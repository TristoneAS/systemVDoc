import { conn } from "./system_v_docs";

/** Valida id_area contra `areas` activas. Devuelve { id_area } o { error }. */
export async function resolveIdAreaRequerido(raw) {
  if (raw == null || String(raw).trim() === "") {
    return { error: "Debe seleccionar un área" };
  }
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id)) {
    return { error: "id_area inválido" };
  }
  const [rows] = await conn.query(
    "SELECT id_area FROM areas WHERE id_area = ? AND estado = 'activo'",
    [id],
  );
  if (rows.length === 0) {
    return { error: "El área no existe o está inactiva" };
  }
  return { id_area: id };
}
