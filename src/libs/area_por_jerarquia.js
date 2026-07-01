import { normalizeEmpId } from "@/libs/aprobaciones";

/** Mapa emp_id (responsable) → área activa. */
export async function cargarMapaAreasPorEmpId(connection) {
  const [rows] = await connection.query(
    `SELECT id_area, area_nombre, emp_id, emp_nombre
     FROM areas
     WHERE estado = 'activo'
       AND emp_id IS NOT NULL
       AND TRIM(emp_id) <> ''`,
  );

  const mapa = new Map();
  for (const row of rows) {
    const empId = normalizeEmpId(row.emp_id);
    if (!empId || mapa.has(empId)) continue;
    mapa.set(empId, {
      id_area: row.id_area,
      area_nombre: String(row.area_nombre ?? "").trim() || null,
      emp_id_responsable: empId,
      emp_nombre_responsable: String(row.emp_nombre ?? "").trim() || null,
    });
  }
  return mapa;
}

async function obtenerEmpIdJefe(empleadosPool, empId) {
  const id = normalizeEmpId(empId);
  if (!id) return null;

  const [rows] = await empleadosPool.query(
    `SELECT emp_id_jefe
     FROM del_empleados
     WHERE emp_id = ?
     LIMIT 1`,
    [id],
  );

  const jefeId = normalizeEmpId(rows[0]?.emp_id_jefe);
  return jefeId || null;
}

/**
 * Resuelve el área del usuario:
 * - Si él es responsable de un área (areas.emp_id), devuelve esa área.
 * - Si no, solo revisa al jefe directo (emp_id_jefe). Un nivel, sin subir más.
 */
export async function resolverAreaPorJerarquiaJefe(
  empleadosPool,
  connection,
  empIdUsuario,
) {
  const empId = normalizeEmpId(empIdUsuario);
  if (!empId) return null;

  const mapaAreas = await cargarMapaAreasPorEmpId(connection);
  if (mapaAreas.size === 0) return null;

  if (mapaAreas.has(empId)) {
    return mapaAreas.get(empId);
  }

  const jefeId = await obtenerEmpIdJefe(empleadosPool, empId);
  if (jefeId && mapaAreas.has(jefeId)) {
    return mapaAreas.get(jefeId);
  }

  return null;
}
