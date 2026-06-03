import { conn } from "@/libs/system_v_docs";

/**
 * Documento con archivos (sin JSON_ARRAYAGG; compatible con MySQL/MariaDB en producción).
 */
export async function obtenerDocumentoConArchivos(id_documento) {
  const id = String(id_documento ?? "").trim();
  if (!id) return null;

  const [docs] = await conn.query(
    `SELECT d.*, ar.area_nombre
     FROM documentos d
     LEFT JOIN areas ar ON d.id_area = ar.id_area
     WHERE d.id_documento = ?
     LIMIT 1`,
    [id],
  );

  if (docs.length === 0) return null;

  let archivos = [];
  try {
    const [rows] = await conn.query(
      `SELECT id_archivo, nombre_archivo, ruta_archivo, tipo_archivo, tamano_archivo
       FROM archivos_documentos
       WHERE id_documento = ?
       ORDER BY nombre_archivo ASC`,
      [id],
    );
    archivos = rows;
  } catch (e) {
    if (e?.code !== "ER_NO_SUCH_TABLE" && e?.errno !== 1146) {
      throw e;
    }
  }

  return {
    ...docs[0],
    archivos,
  };
}
