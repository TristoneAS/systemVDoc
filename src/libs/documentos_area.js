/** Mapa areas.id_area → fila de areas. */
export async function cargarMapaAreas(connection) {
  try {
    const [rows] = await connection.query(
      `SELECT id_area, area_nombre, emp_nombre FROM areas`,
    );
    const mapa = new Map();
    for (const row of rows) {
      const id = Number(row.id_area);
      if (!Number.isNaN(id)) {
        mapa.set(id, row);
      }
    }
    return mapa;
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE" || error?.errno === 1146) {
      return new Map();
    }
    throw error;
  }
}

function idAreaNumerico(idArea) {
  if (idArea == null || String(idArea).trim() === "") return null;
  const id = Number(idArea);
  return Number.isNaN(id) ? null : id;
}

/**
 * documentos.id_area = areas.id_area → areas.emp_nombre
 */
export function responsableAreaDesdeId(idArea, mapaAreas) {
  const id = idAreaNumerico(idArea);
  if (id == null) return null;
  const area = mapaAreas.get(id);
  const nombre = String(area?.emp_nombre ?? "").trim();
  return nombre || null;
}

export function enriquecerDocumentosConArea(documentos, mapaAreas) {
  if (!Array.isArray(documentos)) return [];
  return documentos.map((doc) => {
    const id = idAreaNumerico(doc.id_area);
    const area = id != null ? mapaAreas.get(id) : null;
    const responsable_area = responsableAreaDesdeId(doc.id_area, mapaAreas);
    return {
      ...doc,
      area_nombre:
        String(area?.area_nombre ?? doc.area_nombre ?? "").trim() || null,
      responsable_area,
    };
  });
}
