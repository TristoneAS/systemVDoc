import { STATUS_APROBACION_RECHAZADO } from "@/libs/aprobaciones";
import { notificarSolicitanteSolicitudRechazada } from "@/libs/notificar_solicitante_solicitud";
import { resolveAppBaseUrl } from "@/libs/notificar_aprobadores_solicitud";
import {
  ACCION_HISTORIAL,
  registrarHistorial,
} from "@/libs/historial_archivos";

export const COMENTARIO_RECHAZO_TIEMPO_EXCEDIDO =
  "Rechazada en automático por tiempo excedido";

export const DIAS_LIMITE_APROBACION_SOLICITUD = 10;

async function rechazarSolicitudVencidaEnTransaccion(
  connection,
  idSolicitud,
  comentario,
) {
  const [solRows] = await connection.query(
    `SELECT id_solicitud, estado, fecha_creacion, id_documento, motivo, tipo
     FROM solicitudes
     WHERE id_solicitud = ?
     FOR UPDATE`,
    [idSolicitud],
  );

  const sol = solRows[0];
  if (!sol || sol.estado !== "pendiente") {
    return false;
  }

  await connection.query(
    `UPDATE aprobaciones
     SET status = ?, comentario = ?
     WHERE id_solicitud = ? AND status = 'pendiente'`,
    [STATUS_APROBACION_RECHAZADO, comentario, idSolicitud],
  );

  await connection.query(
    `UPDATE solicitudes
     SET estado = 'rechazada', fecha_resolucion = NOW()
     WHERE id_solicitud = ?`,
    [idSolicitud],
  );

  await registrarHistorial(connection, {
    id_documento: sol.id_documento ?? null,
    id_solicitud: idSolicitud,
    accion: ACCION_HISTORIAL.RECHAZO_AUTOMATICO,
    emp_nombre_actor: "Sistema",
    detalle: comentario,
    datos_nuevos: {
      tipo: sol.tipo,
      motivo: sol.motivo,
      comentario,
    },
  });

  return true;
}

async function notificarRechazoAutomatico(pool, idSolicitud, request) {
  try {
    const baseUrl = request ? resolveAppBaseUrl(request) : undefined;
    await notificarSolicitanteSolicitudRechazada(pool, idSolicitud, {
      rechazadoPorNombre: "Sistema",
      rechazadoPorRol: "Rechazo automático por tiempo excedido",
      comentarioRechazo: COMENTARIO_RECHAZO_TIEMPO_EXCEDIDO,
      enlaceSistema: baseUrl
        ? `${baseUrl}/dashboard/mis_solicitudes`
        : undefined,
    });
  } catch (mailErr) {
    console.error(
      `[rechazo-automatico] Error al notificar solicitud #${idSolicitud}:`,
      mailErr,
    );
  }
}

/**
 * Rechaza una solicitud pendiente si superó el plazo desde `fecha_creacion`.
 * Marca como rechazadas todas las aprobaciones aún pendientes con el comentario del sistema.
 */
export async function rechazarSolicitudPorTiempoExcedidoSiAplica(
  pool,
  idSolicitud,
  { dias = DIAS_LIMITE_APROBACION_SOLICITUD, notificar = true, request } = {},
) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id_solicitud
       FROM solicitudes
       WHERE id_solicitud = ?
         AND estado = 'pendiente'
         AND fecha_creacion IS NOT NULL
         AND fecha_creacion <= DATE_SUB(NOW(), INTERVAL ? DAY)
       FOR UPDATE`,
      [idSolicitud, dias],
    );

    if (rows.length === 0) {
      await connection.rollback();
      return false;
    }

    const rechazada = await rechazarSolicitudVencidaEnTransaccion(
      connection,
      idSolicitud,
      COMENTARIO_RECHAZO_TIEMPO_EXCEDIDO,
    );

    if (!rechazada) {
      await connection.rollback();
      return false;
    }

    await connection.commit();

    if (notificar) {
      await notificarRechazoAutomatico(pool, idSolicitud, request);
    }

    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Rechaza en lote las solicitudes pendientes con más de `dias` sin resolverse.
 */
export async function rechazarSolicitudesPorTiempoExcedido(
  pool,
  { dias = DIAS_LIMITE_APROBACION_SOLICITUD, notificar = true, request } = {},
) {
  const [candidatas] = await pool.query(
    `SELECT id_solicitud
     FROM solicitudes
     WHERE estado = 'pendiente'
       AND fecha_creacion IS NOT NULL
       AND fecha_creacion <= DATE_SUB(NOW(), INTERVAL ? DAY)
     ORDER BY id_solicitud ASC`,
    [dias],
  );

  const idsProcesados = [];

  for (const row of candidatas) {
    try {
      const rechazada = await rechazarSolicitudPorTiempoExcedidoSiAplica(
        pool,
        row.id_solicitud,
        { dias, notificar, request },
      );
      if (rechazada) {
        idsProcesados.push(row.id_solicitud);
      }
    } catch (error) {
      console.error(
        `[rechazo-automatico] Error al rechazar solicitud #${row.id_solicitud}:`,
        error,
      );
    }
  }

  return { procesadas: idsProcesados.length, ids: idsProcesados };
}
