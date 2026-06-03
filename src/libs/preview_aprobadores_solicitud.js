import { empleados } from "@/libs/empleados";
import { conn } from "@/libs/system_v_docs";
import {
  TIPO_APROBADOR_FORZADO,
  TIPO_APROBADOR_JEFE_DIRECTO,
  TIPO_APROBADOR_RESPONSABLE_AREA,
  labelTiposAprobador,
  parseTiposAprobador,
} from "@/libs/aprobaciones";

async function obtenerJefeSolicitante(empIdSolicitante) {
  const empId = String(empIdSolicitante ?? "").trim();
  if (!empId) {
    throw new Error("No se recibió el emp_id del solicitante.");
  }

  const [rows] = await empleados.query(
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

  return normalizePersona(rows[0], TIPO_APROBADOR_JEFE_DIRECTO);
}

async function obtenerAprobadoresListado(connection) {
  const [rows] = await connection.query(
    `SELECT emp_id, emp_nombre, emp_correo
     FROM aprobadores
     ORDER BY emp_nombre ASC`,
  );
  return rows
    .map((r) => normalizePersona(r, TIPO_APROBADOR_FORZADO))
    .filter((r) => r.emp_id && r.emp_nombre);
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

  if (rows.length === 0 || !String(rows[0]?.emp_id ?? "").trim()) {
    throw new Error(
      "No se encontró responsable activo para el área de la solicitud.",
    );
  }

  return normalizePersona(rows[0], TIPO_APROBADOR_RESPONSABLE_AREA);
}

function normalizePersona(row, tipoAprobador) {
  return {
    emp_id: String(row?.emp_id ?? "").trim(),
    emp_nombre: String(row?.emp_nombre ?? "").trim(),
    emp_correo: String(row?.emp_correo ?? "").trim() || null,
    tipo_aprobador: tipoAprobador,
    rol: labelRolAprobador(tipoAprobador),
  };
}

export function labelRolAprobador(tipo) {
  return labelTiposAprobador(tipo);
}

function consolidarPersonasPreview(slots) {
  const porEmpId = new Map();
  const orden = [];

  for (const persona of slots) {
    const empId = String(persona.emp_id ?? "").trim();
    if (!empId) continue;
    let entry = porEmpId.get(empId);
    if (!entry) {
      entry = {
        emp_id: empId,
        emp_nombre: persona.emp_nombre,
        emp_correo: persona.emp_correo,
        tipos: new Set(),
      };
      porEmpId.set(empId, entry);
      orden.push(empId);
    }
    parseTiposAprobador(persona.tipo_aprobador).forEach((t) =>
      entry.tipos.add(t),
    );
  }

  return orden.map((empId) => {
    const entry = porEmpId.get(empId);
    const tipoCombinado = [...entry.tipos].join(",");
    return {
      emp_id: entry.emp_id,
      emp_nombre: entry.emp_nombre,
      emp_correo: entry.emp_correo,
      tipo_aprobador: tipoCombinado,
      rol: labelTiposAprobador(tipoCombinado),
    };
  });
}

/**
 * Lista de aprobadores y quién recibe correo al crear vs. después del jefe.
 */
export async function obtenerPreviewAprobadoresSolicitud({
  empIdSolicitante,
  idArea,
  idDocumento,
}) {
  const jefe = await obtenerJefeSolicitante(empIdSolicitante);
  const comite = await obtenerAprobadoresListado(conn);
  const responsable = await obtenerResponsableArea(conn, { idArea, idDocumento });

  const todas = consolidarPersonasPreview([
    jefe,
    ...comite,
    responsable,
  ]);

  const correo_al_crear = todas.filter((p) =>
    parseTiposAprobador(p.tipo_aprobador).includes(TIPO_APROBADOR_JEFE_DIRECTO),
  );
  const correo_despues_jefe = todas.filter((p) => {
    const tipos = parseTiposAprobador(p.tipo_aprobador);
    return (
      tipos.includes(TIPO_APROBADOR_FORZADO) ||
      tipos.includes(TIPO_APROBADOR_RESPONSABLE_AREA)
    );
  });

  return {
    correo_al_crear,
    correo_despues_jefe,
    orden_aprobacion: todas,
  };
}
