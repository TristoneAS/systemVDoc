export function normalizeEmpId(value) {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeEmpleado(row) {
  return {
    emp_id: normalizeEmpId(row?.emp_id),
    emp_nombre: String(row?.emp_nombre || "").trim(),
    emp_correo: row?.emp_correo ?? null,
  };
}

async function obtenerJefeSolicitante(empleadosPool, empIdSolicitante) {
  const empId = normalizeEmpId(empIdSolicitante);
  if (!empId) {
    throw new Error("No se recibió el emp_id del solicitante.");
  }

  const [rows] = await empleadosPool.query(
    `SELECT jefe.emp_id, jefe.emp_nombre, jefe.emp_correo
     FROM del_empleados solicitante
     INNER JOIN del_empleados jefe ON jefe.emp_id = solicitante.emp_id_jefe
     WHERE solicitante.emp_id = ?
     LIMIT 1`,
    [empId],
  );

  if (rows.length === 0) {
    throw new Error(
      "No se encontró el jefe directo del solicitante en del_empleados.",
    );
  }

  return normalizeEmpleado(rows[0]);
}

async function obtenerAprobadores(connection) {
  const [rows] = await connection.query(
    `SELECT emp_id, emp_nombre, emp_correo
     FROM aprobadores
     ORDER BY emp_nombre ASC`,
  );
  return rows.map(normalizeEmpleado).filter((r) => r.emp_id && r.emp_nombre);
}

async function resolverIdArea(connection, { idArea, idDocumento }) {
  if (idArea != null && String(idArea).trim() !== "") {
    return String(idArea).trim();
  }

  if (!idDocumento) return null;

  const [rows] = await connection.query(
    `SELECT id_area FROM documentos WHERE id_documento = ? LIMIT 1`,
    [idDocumento],
  );

  return rows[0]?.id_area ?? null;
}

async function obtenerResponsableArea(connection, params) {
  const idArea = await resolverIdArea(connection, params);
  if (idArea == null || String(idArea).trim() === "") {
    throw new Error("No se encontró el área asociada a la solicitud.");
  }

  const [rows] = await connection.query(
    `SELECT emp_id, emp_nombre, emp_correo
     FROM areas
     WHERE id_area = ? AND estado = 'activo'
     LIMIT 1`,
    [idArea],
  );

  if (rows.length === 0 || !normalizeEmpId(rows[0].emp_id)) {
    throw new Error(
      "No se encontró responsable activo para el área de la solicitud.",
    );
  }

  return normalizeEmpleado(rows[0]);
}

export async function crearAprobacionesSolicitud(
  connection,
  empleadosPool,
  { solicitudId, empIdSolicitante, idArea, idDocumento },
) {
  const jefe = await obtenerJefeSolicitante(empleadosPool, empIdSolicitante);
  const aprobadores = await obtenerAprobadores(connection);
  const responsableArea = await obtenerResponsableArea(connection, {
    idArea,
    idDocumento,
  });

  const registros = [jefe, ...aprobadores, responsableArea].map((empleado) => [
    solicitudId,
    empleado.emp_id,
    empleado.emp_nombre,
    empleado.emp_correo,
    "pendiente",
  ]);

  if (registros.length === 0) {
    throw new Error("No se generaron aprobaciones para la solicitud.");
  }

  try {
    await connection.query(
      `INSERT INTO aprobaciones
        (id_solicitud, emp_id, emp_nombre, emp_correo, status)
       VALUES ?`,
      [registros],
    );
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE" || error?.errno === 1146) {
      throw new Error(
        "Falta crear la tabla aprobaciones. Ejecute database/create_aprobaciones_table.sql en la base de System V-Docs.",
      );
    }
    throw error;
  }

  return registros.length;
}
