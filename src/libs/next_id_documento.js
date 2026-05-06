import { conn } from "./system_v_docs";

/** Siguiente id_documento numérico (1, 2, 3…) según máximo en documentos y solicitudes. */
export async function getNextIdDocumento() {
  const [rows] = await conn.query(
    `SELECT GREATEST(
      COALESCE((SELECT MAX(CAST(id_documento AS UNSIGNED)) FROM documentos WHERE id_documento REGEXP '^[0-9]+$'), 0),
      COALESCE((SELECT MAX(CAST(id_documento AS UNSIGNED)) FROM solicitudes WHERE id_documento REGEXP '^[0-9]+$'), 0)
    ) AS max_num`,
  );
  const next = Number(rows[0]?.max_num ?? 0) + 1;
  return String(next);
}
