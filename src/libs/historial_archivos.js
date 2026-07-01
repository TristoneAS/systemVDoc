import {
  enriquecerPayloadHistorial,
  agruparHistorialEnProcesos,
} from "@/libs/historial_proceso";

export {
  agruparHistorialEnProcesos,
  labelTipoProceso,
  labelEstadoProceso,
  ESTADO_PROCESO,
  TIPO_PROCESO,
} from "@/libs/historial_proceso";

/** Acciones registradas en historial_archivos. */
export const ACCION_HISTORIAL = {
  ALTA_DIRECTA: "alta_directa",
  SOLICITUD_NUEVO: "solicitud_nuevo",
  SOLICITUD_CAMBIO: "solicitud_cambio",
  VISTO_BUENO: "visto_bueno",
  SOLICITUD_APROBADA: "solicitud_aprobada",
  ALTA_POR_APROBACION: "alta_por_aprobacion",
  CAMBIO_ARCHIVOS: "cambio_archivos",
  SOLICITUD_RECHAZADA: "solicitud_rechazada",
  RECHAZO_AUTOMATICO: "rechazo_automatico",
  SOLICITUD_REENVIADA: "solicitud_reenviada",
  SOLICITUD_OBSOLETA: "solicitud_obsoleta",
  CAMBIO_ESTADO: "cambio_estado",
  CAMBIO_DESCARGADO: "cambio_descargado",
  DOCUMENTO_ELIMINADO: "documento_eliminado",
};

const LABELS_ACCION = {
  [ACCION_HISTORIAL.ALTA_DIRECTA]: "Alta directa del documento",
  [ACCION_HISTORIAL.SOLICITUD_NUEVO]: "Solicitud de nuevo documento",
  [ACCION_HISTORIAL.SOLICITUD_CAMBIO]: "Solicitud de cambio",
  [ACCION_HISTORIAL.VISTO_BUENO]: "Visto bueno",
  [ACCION_HISTORIAL.SOLICITUD_APROBADA]: "Solicitud aprobada",
  [ACCION_HISTORIAL.ALTA_POR_APROBACION]: "Documento dado de alta (solicitud aprobada)",
  [ACCION_HISTORIAL.CAMBIO_ARCHIVOS]: "Archivos actualizados (solicitud aprobada)",
  [ACCION_HISTORIAL.SOLICITUD_RECHAZADA]: "Solicitud rechazada",
  [ACCION_HISTORIAL.RECHAZO_AUTOMATICO]: "Rechazo automático por tiempo",
  [ACCION_HISTORIAL.SOLICITUD_REENVIADA]: "Solicitud reenviada",
  [ACCION_HISTORIAL.SOLICITUD_OBSOLETA]: "Solicitud marcada obsoleta",
  [ACCION_HISTORIAL.CAMBIO_ESTADO]: "Cambio de estado",
  [ACCION_HISTORIAL.CAMBIO_DESCARGADO]: "Cambio de descarga",
  [ACCION_HISTORIAL.DOCUMENTO_ELIMINADO]: "Documento eliminado",
};

export function labelAccionHistorial(accion) {
  const key = String(accion ?? "").trim().toLowerCase();
  return LABELS_ACCION[key] || key || "Movimiento";
}

function toJsonColumn(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function parseJsonColumn(raw) {
  if (raw == null) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

function isMissingHistorialTable(error) {
  return error?.code === "ER_NO_SUCH_TABLE" || error?.errno === 1146;
}

function isMissingProcesoColumn(error) {
  return error?.code === "ER_BAD_FIELD_ERROR" || error?.errno === 1054;
}

const SELECT_HISTORIAL = `
  h.id_historial,
  h.id_documento,
  h.id_solicitud,
  h.id_proceso,
  h.tipo_proceso,
  h.id_archivo,
  h.nombre_archivo,
  h.accion,
  h.emp_id_actor,
  h.emp_nombre_actor,
  h.detalle,
  h.datos_anteriores,
  h.datos_nuevos,
  h.fecha_evento
`;

function mapFilasHistorial(rows) {
  return rows.map((row) => ({
    ...row,
    datos_anteriores: parseJsonColumn(row.datos_anteriores),
    datos_nuevos: parseJsonColumn(row.datos_nuevos),
  }));
}

/**
 * Registra un evento en historial_archivos.
 * Ignora silenciosamente si la tabla aún no existe (migración pendiente).
 */
export async function registrarHistorial(connection, payload) {
  const enriquecido = enriquecerPayloadHistorial(payload ?? {});
  const {
    id_documento = null,
    id_solicitud = null,
    id_proceso = null,
    tipo_proceso = null,
    id_archivo = null,
    nombre_archivo = null,
    accion,
    emp_id_actor = null,
    emp_nombre_actor = null,
    detalle = null,
    datos_anteriores = null,
    datos_nuevos = null,
  } = enriquecido;

  if (!accion) return;

  const db = connection ?? null;
  if (!db?.query) return;

  const params = [
    id_documento,
    id_solicitud,
    id_proceso,
    tipo_proceso,
    id_archivo,
    nombre_archivo,
    accion,
    emp_id_actor,
    emp_nombre_actor,
    detalle,
    toJsonColumn(datos_anteriores),
    toJsonColumn(datos_nuevos),
  ];

  try {
    await db.query(
      `INSERT INTO historial_archivos
        (id_documento, id_solicitud, id_proceso, tipo_proceso, id_archivo, nombre_archivo,
         accion, emp_id_actor, emp_nombre_actor, detalle, datos_anteriores, datos_nuevos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params,
    );
  } catch (error) {
    if (isMissingProcesoColumn(error)) {
      try {
        await db.query(
          `INSERT INTO historial_archivos
            (id_documento, id_solicitud, id_archivo, nombre_archivo, accion,
             emp_id_actor, emp_nombre_actor, detalle, datos_anteriores, datos_nuevos)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id_documento,
            id_solicitud,
            id_archivo,
            nombre_archivo,
            accion,
            emp_id_actor,
            emp_nombre_actor,
            detalle,
            toJsonColumn(datos_anteriores),
            toJsonColumn(datos_nuevos),
          ],
        );
        return;
      } catch (fallbackErr) {
        if (isMissingHistorialTable(fallbackErr)) {
          console.warn(
            "[historial_archivos] Tabla no encontrada. Ejecute database/create_historial_archivos_table.sql",
          );
          return;
        }
        console.error("[historial_archivos] Error al registrar:", fallbackErr);
        return;
      }
    }
    if (isMissingHistorialTable(error)) {
      console.warn(
        "[historial_archivos] Tabla no encontrada. Ejecute database/create_historial_archivos_table.sql",
      );
      return;
    }
    console.error("[historial_archivos] Error al registrar:", error);
  }
}

export async function obtenerHistorialPorDocumento(connection, idDocumento) {
  const db = connection;
  if (!db?.query || !idDocumento) return [];

  const id = String(idDocumento).trim();

  try {
    const [rows] = await db.query(
      `SELECT DISTINCT ${SELECT_HISTORIAL}
       FROM historial_archivos h
       LEFT JOIN solicitudes s ON s.id_solicitud = h.id_solicitud
       WHERE h.id_documento = ?
          OR s.id_documento = ?
       ORDER BY h.fecha_evento ASC, h.id_historial ASC`,
      [id, id],
    );
    return mapFilasHistorial(rows);
  } catch (error) {
    if (isMissingProcesoColumn(error)) {
      const [rows] = await db.query(
        `SELECT DISTINCT
            h.id_historial, h.id_documento, h.id_solicitud, h.id_archivo,
            h.nombre_archivo, h.accion, h.emp_id_actor, h.emp_nombre_actor,
            h.detalle, h.datos_anteriores, h.datos_nuevos, h.fecha_evento
         FROM historial_archivos h
         LEFT JOIN solicitudes s ON s.id_solicitud = h.id_solicitud
         WHERE h.id_documento = ? OR s.id_documento = ?
         ORDER BY h.fecha_evento ASC, h.id_historial ASC`,
        [id, id],
      );
      return mapFilasHistorial(rows);
    }
    if (isMissingHistorialTable(error)) return [];
    throw error;
  }
}

export async function obtenerHistorialProcesosPorDocumento(
  connection,
  idDocumento,
  { soloFinalizados = true } = {},
) {
  const eventos = await obtenerHistorialPorDocumento(connection, idDocumento);
  return agruparHistorialEnProcesos(eventos, { soloFinalizados });
}

export function resumenArchivosHistorial(archivos) {
  const lista = Array.isArray(archivos) ? archivos : [];
  if (lista.length === 0) return null;
  return lista.map((a) => a?.nombre_archivo).filter(Boolean);
}
