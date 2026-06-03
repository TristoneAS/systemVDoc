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

/** Rol del revisor en la fila de `aprobaciones.tipo_aprobador`. */
export const TIPO_APROBADOR_JEFE_DIRECTO = "jefe_directo";

/** Aprobadores listados en la tabla `aprobadores` (segunda fase). */
export const TIPO_APROBADOR_FORZADO = "forzado";

/** Responsable del área del trámite (segunda fase). */
export const TIPO_APROBADOR_RESPONSABLE_AREA = "responsable_area";

const ORDEN_TIPOS_APROBADOR = [
  TIPO_APROBADOR_JEFE_DIRECTO,
  TIPO_APROBADOR_FORZADO,
  TIPO_APROBADOR_RESPONSABLE_AREA,
];

/** Separa tipos combinados en `tipo_aprobador` (p. ej. `jefe_directo,forzado`). */
export function parseTiposAprobador(tipoAprobador) {
  return String(tipoAprobador ?? "")
    .split(/[,+]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Etiqueta legible para uno o varios roles en la misma fila. */
export function labelTiposAprobador(tipoAprobador) {
  const tipos = parseTiposAprobador(tipoAprobador);
  if (tipos.length === 0) return "Aprobador";
  const labels = tipos.map((t) => {
    if (t === TIPO_APROBADOR_JEFE_DIRECTO) return "Jefe directo";
    if (t === TIPO_APROBADOR_RESPONSABLE_AREA) return "Responsable de área";
    if (t === TIPO_APROBADOR_FORZADO) return "Requerido";
    return t;
  });
  return [...new Set(labels)].join(", ");
}

function ordenarTiposAprobador(tipos) {
  return [...new Set(tipos)].sort(
    (a, b) => ORDEN_TIPOS_APROBADOR.indexOf(a) - ORDEN_TIPOS_APROBADOR.indexOf(b),
  );
}

export function incluyeTipoAprobador(tipoAprobador, tipoBuscado) {
  return parseTiposAprobador(tipoAprobador).includes(tipoBuscado);
}

/**
 * Una fila por emp_id: combina roles (jefe + comité + área) en `tipo_aprobador`
 * separados por coma, p. ej. `jefe_directo,forzado`.
 */
function consolidarRegistrosAprobacion(solicitudId, slots) {
  const porEmpId = new Map();
  const ordenEmpIds = [];

  for (const { emp, tipo } of slots) {
    const empId = normalizeEmpId(emp?.emp_id);
    if (!empId || !emp?.emp_nombre) continue;

    let entry = porEmpId.get(empId);
    if (!entry) {
      entry = {
        emp_id: empId,
        emp_nombre: emp.emp_nombre,
        emp_correo: emp.emp_correo,
        tipos: new Set(),
      };
      porEmpId.set(empId, entry);
      ordenEmpIds.push(empId);
    }
    entry.tipos.add(tipo);
  }

  return ordenEmpIds.map((empId) => {
    const entry = porEmpId.get(empId);
    const tipoCombinado = ordenarTiposAprobador([...entry.tipos]).join(",");
    return [
      solicitudId,
      entry.emp_id,
      entry.emp_nombre,
      entry.emp_correo,
      "pendiente",
      tipoCombinado,
    ];
  });
}

/** Valor en `aprobaciones.status` cuando el visto bueno está completo. */
export const STATUS_APROBACION_APROBADO = "aprobado";

/** Valor en `aprobaciones.status` cuando el aprobador rechaza la solicitud. */
export const STATUS_APROBACION_RECHAZADO = "rechazado";

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

  const registros = consolidarRegistrosAprobacion(solicitudId, [
    { emp: jefe, tipo: TIPO_APROBADOR_JEFE_DIRECTO },
    ...aprobadores.map((e) => ({ emp: e, tipo: TIPO_APROBADOR_FORZADO })),
    { emp: responsableArea, tipo: TIPO_APROBADOR_RESPONSABLE_AREA },
  ]);

  if (registros.length === 0) {
    throw new Error("No se generaron aprobaciones para la solicitud.");
  }

  try {
    await connection.query(
      `INSERT INTO aprobaciones
        (id_solicitud, emp_id, emp_nombre, emp_correo, status, tipo_aprobador)
       VALUES ?`,
      [registros],
    );
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE" || error?.errno === 1146) {
      throw new Error(
        "Falta crear la tabla aprobaciones. Ejecute database/create_aprobaciones_table.sql en la base de System V-Docs.",
      );
    }
    if (error?.code === "ER_BAD_FIELD_ERROR" || error?.errno === 1054) {
      throw new Error(
        "Falta la columna tipo_aprobador en aprobaciones. Ejecute database/alter_aprobaciones_tipo_aprobador.sql.",
      );
    }
    throw error;
  }

  return registros.length;
}

/** Elimina aprobaciones previas y las vuelve a crear (jefe → comité → responsable de área). */
export async function reiniciarAprobacionesSolicitud(
  connection,
  empleadosPool,
  { solicitudId, empIdSolicitante, idArea, idDocumento },
) {
  await connection.query(`DELETE FROM aprobaciones WHERE id_solicitud = ?`, [
    solicitudId,
  ]);
  return crearAprobacionesSolicitud(connection, empleadosPool, {
    solicitudId,
    empIdSolicitante,
    idArea,
    idDocumento,
  });
}

/** Si solo tiene roles de 2.ª fase, debe existir antes el visto bueno del jefe directo. */
export function requiereAprobacionJefePrevio(tipoAprobador) {
  const tipos = parseTiposAprobador(tipoAprobador);
  if (tipos.includes(TIPO_APROBADOR_JEFE_DIRECTO)) return false;
  return (
    tipos.includes(TIPO_APROBADOR_RESPONSABLE_AREA) ||
    tipos.includes(TIPO_APROBADOR_FORZADO)
  );
}

/**
 * Fila pendiente del actor para esta solicitud. Si hay varias (mismo emp_id en varios roles),
 * prioriza jefe → forzado → responsable de área.
 */
export async function obtenerAprobacionPendienteDelActor(
  connection,
  idSolicitud,
  empIdActor,
) {
  const emp = normalizeEmpId(empIdActor);
  if (!emp) return null;
  const [rows] = await connection.query(
    `SELECT id, emp_id, tipo_aprobador, status FROM aprobaciones
     WHERE id_solicitud = ? AND TRIM(emp_id) = ? AND status = 'pendiente'
     ORDER BY CASE
       WHEN tipo_aprobador LIKE '%jefe_directo%' THEN 1
       WHEN tipo_aprobador LIKE '%forzado%' THEN 2
       WHEN tipo_aprobador LIKE '%responsable_area%' THEN 3
       ELSE 4 END
     LIMIT 1`,
    [idSolicitud, emp],
  );
  return rows[0] ?? null;
}

/** Aprueba todas las filas pendientes del mismo emp_id (solicitudes antiguas con duplicados). */
export async function aprobarTodasPendientesDelActor(
  connection,
  idSolicitud,
  empIdActor,
  comentario,
) {
  const emp = normalizeEmpId(empIdActor);
  if (!emp) return 0;
  const [result] = await connection.query(
    `UPDATE aprobaciones SET status = ?, comentario = ?
     WHERE id_solicitud = ? AND TRIM(emp_id) = ? AND status = 'pendiente'`,
    [STATUS_APROBACION_APROBADO, comentario, idSolicitud, emp],
  );
  return result.affectedRows || 0;
}

export async function existeJefeDirectoAprobado(connection, idSolicitud) {
  const [rows] = await connection.query(
    `SELECT 1 FROM aprobaciones
     WHERE id_solicitud = ?
       AND status = ?
       AND tipo_aprobador LIKE ?
     LIMIT 1`,
    [
      idSolicitud,
      STATUS_APROBACION_APROBADO,
      `%${TIPO_APROBADOR_JEFE_DIRECTO}%`,
    ],
  );
  return rows.length > 0;
}

/**
 * Actualiza `solicitudes.estado`: `aprobada` solo si existe al menos una fila en
 * `aprobaciones` y todas tienen `status = 'aprobado'`; en caso contrario `pendiente`.
 */
export async function actualizarEstadoSolicitudPorAprobaciones(
  connection,
  idSolicitud,
) {
  const [[stats]] = await connection.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS aprobados
     FROM aprobaciones WHERE id_solicitud = ?`,
    [STATUS_APROBACION_APROBADO, idSolicitud],
  );
  const total = Number(stats?.total) || 0;
  const aprobados = Number(stats?.aprobados) || 0;
  const nuevo = total > 0 && aprobados === total ? "aprobada" : "pendiente";
  await connection.query(
    `UPDATE solicitudes SET estado = ? WHERE id_solicitud = ?`,
    [nuevo, idSolicitud],
  );
  return nuevo;
}
