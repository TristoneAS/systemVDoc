import { empleados } from "@/libs/empleados";
import { isValidEmail, sendMailMessage } from "@/libs/mailer";
import { labelTiposAprobador } from "@/libs/aprobaciones";

const BRAND_ORANGE = "#e67e22";
const COLOR_APROBADO = "#1B5E20";
const COLOR_RECHAZADO = "#C62828";
const COLOR_PENDIENTE = "#FB8500";

const ENLACE_MIS_SOLICITUDES = (() => {
  const env =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.ENLACE_SISTEMA_CORREO;
  const base = String(env || "http://TFTDELSRV011:3032").replace(/\/$/, "");
  return `${base}/dashboard/mis_solicitudes`;
})();

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function labelTipoSolicitud(tipo) {
  if (tipo === "cambio") return "Cambio de documento";
  return "Alta de nuevo documento";
}

function labelRolAprobador(tipo) {
  return labelTiposAprobador(tipo);
}

function labelEstadoAprobacion(status) {
  const s = String(status || "")
    .toLowerCase()
    .trim();
  if (s === "aprobado" || s === "aprobada") return "Aprobado";
  if (s === "rechazado" || s === "rechazada") return "Rechazado";
  if (s === "pendiente") return "Pendiente";
  return status || "—";
}

function colorEstadoAprobacion(status) {
  const s = String(status || "")
    .toLowerCase()
    .trim();
  if (s === "aprobado" || s === "aprobada") return COLOR_APROBADO;
  if (s === "rechazado" || s === "rechazada") return COLOR_RECHAZADO;
  if (s === "pendiente") return COLOR_PENDIENTE;
  return "#757575";
}

async function cargarSolicitudParaCorreo(connection, idSolicitud) {
  const [rows] = await connection.query(
    `SELECT s.*, ar.area_nombre
     FROM solicitudes s
     LEFT JOIN areas ar ON s.id_area = ar.id_area
     WHERE s.id_solicitud = ?
     LIMIT 1`,
    [idSolicitud],
  );
  return rows[0] ?? null;
}

async function cargarAprobacionesParaCorreo(connection, idSolicitud) {
  const [rows] = await connection.query(
    `SELECT emp_id, emp_nombre, emp_correo, tipo_aprobador, status, comentario
     FROM aprobaciones
     WHERE id_solicitud = ?
     ORDER BY CASE
       WHEN tipo_aprobador LIKE '%jefe_directo%' THEN 1
       WHEN tipo_aprobador LIKE '%forzado%' THEN 2
       WHEN tipo_aprobador LIKE '%responsable_area%' THEN 3
       ELSE 4 END,
       emp_nombre ASC`,
    [idSolicitud],
  );
  return rows;
}

async function obtenerCorreoSolicitante(empIdSolicitante, nombreFallback) {
  const empId = String(empIdSolicitante ?? "").trim();
  if (!empId) {
    return { correo: null, nombre: nombreFallback || "Solicitante" };
  }
  try {
    const [rows] = await empleados.query(
      `SELECT emp_correo, emp_nombre FROM del_empleados WHERE emp_id = ? LIMIT 1`,
      [empId],
    );
    if (rows.length === 0) {
      return { correo: null, nombre: nombreFallback || empId };
    }
    return {
      correo: String(rows[0].emp_correo ?? "").trim() || null,
      nombre:
        String(rows[0].emp_nombre ?? "").trim() || nombreFallback || empId,
    };
  } catch (err) {
    console.error("[notificar-solicitante] Error al buscar correo:", err);
    return { correo: null, nombre: nombreFallback || empId };
  }
}

function buildTablaAprobacionesHtml(aprobaciones) {
  if (!aprobaciones?.length) {
    return `<p style="font-size:11px;color:#757575;margin:0;">No hay registros de aprobación.</p>`;
  }

  const thStyle =
    "padding:8px 10px;background:#f5f5f5;border-bottom:2px solid #e0e0e0;font-size:10px;font-weight:700;color:#5d4e37;text-align:left;";
  const tdBase =
    "padding:7px 10px;border-bottom:1px solid #eeeeee;font-size:11px;color:#333333;vertical-align:top;";

  const filas = aprobaciones
    .map((a, idx) => {
      const bg = idx % 2 === 0 ? "#ffffff" : "#fafafa";
      const estadoLabel = labelEstadoAprobacion(a.status);
      const estadoColor = colorEstadoAprobacion(a.status);
      const comentario = a.comentario?.trim()
        ? escapeHtml(a.comentario).replace(/\n/g, "<br/>")
        : "—";
      return `<tr>
        <td style="${tdBase}background:${bg};">${escapeHtml(labelRolAprobador(a.tipo_aprobador))}</td>
        <td style="${tdBase}background:${bg};">${escapeHtml(a.emp_nombre || "—")}</td>
        <td style="${tdBase}background:${bg};white-space:nowrap;">${escapeHtml(a.emp_id || "—")}</td>
        <td style="${tdBase}background:${bg};"><strong style="color:${estadoColor};">${escapeHtml(estadoLabel)}</strong></td>
        <td style="${tdBase}background:${bg};word-break:break-word;">${comentario}</td>
      </tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e0e0e0;border-radius:3px;overflow:hidden;border-collapse:collapse;">
    <thead>
      <tr>
        <th style="${thStyle}">Rol</th>
        <th style="${thStyle}">Nombre</th>
        <th style="${thStyle}">ID empleado</th>
        <th style="${thStyle}">Estado</th>
        <th style="${thStyle}">Comentario</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>`;
}

function buildTablaAprobacionesTexto(aprobaciones) {
  if (!aprobaciones?.length) return "  (Sin registros de aprobación)";
  return aprobaciones
    .map((a) => {
      const comentario = a.comentario?.trim() || "—";
      return `  - ${labelRolAprobador(a.tipo_aprobador)} | ${a.emp_nombre || "—"} (${a.emp_id || "—"}) | ${labelEstadoAprobacion(a.status)} | Comentario: ${comentario}`;
    })
    .join("\n");
}

function wrapCorreoSolicitante({
  titulo,
  subtitulo,
  colorHeader,
  nombreDestinatario,
  cuerpoHtml,
  enlaceHref,
}) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(titulo)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f4;padding:12px 8px;">
    <tr>
      <td align="center">
        <table role="presentation" width="760" cellspacing="0" cellpadding="0" style="max-width:760px;width:100%;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:${colorHeader};padding:14px 20px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.02em;line-height:1.2;">${escapeHtml(titulo)}</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.95);margin-top:4px;">${escapeHtml(subtitulo)} · System V-Docs</div>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 18px 6px;color:#333333;font-size:12px;line-height:1.5;">
              Estimado/a <strong style="color:${BRAND_ORANGE};">${escapeHtml(nombreDestinatario)}</strong>,
              ${cuerpoHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:10px 18px 14px;text-align:center;border-top:1px solid #eeeeee;">
              <a href="${escapeHtml(enlaceHref)}" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:4px;font-size:12px;font-weight:600;">Ver mis solicitudes</a>
              <div style="font-size:10px;color:#888888;margin-top:10px;">Mensaje automático. No responda a este correo.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function resumenSolicitudTexto(solicitud) {
  return [
    `- ID solicitud: #${solicitud.id_solicitud}`,
    `- Tipo: ${labelTipoSolicitud(solicitud.tipo)}`,
    `- ID documento: ${solicitud.id_documento || "—"}`,
    `- Nomenclatura: ${solicitud.nomenclatura || "—"}`,
    `- Nombre: ${solicitud.nombre_documento || "—"}`,
  ].join("\n");
}

/**
 * Notifica al solicitante que su solicitud fue rechazada.
 */
export async function notificarSolicitanteSolicitudRechazada(
  connection,
  idSolicitud,
  {
    rechazadoPorNombre,
    rechazadoPorRol,
    rechazadoPorTipo,
    comentarioRechazo,
    enlaceSistema = ENLACE_MIS_SOLICITUDES,
  } = {},
) {
  const rolRechazo =
    rechazadoPorRol || labelRolAprobador(rechazadoPorTipo);
  const resultado = { enviado: false, omitido: false, errores: [] };

  const solicitud = await cargarSolicitudParaCorreo(connection, idSolicitud);
  if (!solicitud) {
    resultado.errores.push("No se encontró la solicitud.");
    return resultado;
  }

  const { correo, nombre } = await obtenerCorreoSolicitante(
    solicitud.emp_id_solicitante,
    solicitud.solicitante,
  );

  if (!isValidEmail(correo)) {
    resultado.omitido = true;
    resultado.errores.push(
      "El solicitante no tiene correo válido registrado en del_empleados.",
    );
    return resultado;
  }

  const aprobaciones = await cargarAprobacionesParaCorreo(
    connection,
    idSolicitud,
  );
  const tablaHtml = buildTablaAprobacionesHtml(aprobaciones);
  const quien = escapeHtml(rechazadoPorNombre || "Un aprobador");
  const rol = escapeHtml(rolRechazo || "—");
  const motivoRechazo = escapeHtml(comentarioRechazo || "—").replace(
    /\n/g,
    "<br/>",
  );

  const cuerpoHtml = `
    <p style="margin:0 0 12px;">Le informamos que su solicitud <strong>#${escapeHtml(solicitud.id_solicitud)}</strong> (${escapeHtml(labelTipoSolicitud(solicitud.tipo))}) ha sido <strong style="color:${COLOR_RECHAZADO};">rechazada</strong>.</p>
    <div style="background:#ffebee;border-left:4px solid ${COLOR_RECHAZADO};padding:10px 14px;margin-bottom:14px;border-radius:0 3px 3px 0;">
      <div style="font-size:11px;font-weight:700;color:${COLOR_RECHAZADO};margin-bottom:4px;">Rechazada por</div>
      <div style="font-size:12px;color:#333;">${quien} <span style="color:#757575;">(${rol})</span></div>
      <div style="font-size:11px;font-weight:700;color:${COLOR_RECHAZADO};margin:8px 0 4px;">Motivo del rechazo</div>
      <div style="font-size:12px;color:#333;line-height:1.4;">${motivoRechazo}</div>
    </div>
    <div style="font-size:12px;font-weight:700;color:${BRAND_ORANGE};margin-bottom:8px;">Estado de las aprobaciones</div>
    ${tablaHtml}
    <p style="margin:14px 0 0;font-size:11px;color:#757575;">Puede corregir y reenviar la solicitud desde <strong>Mis solicitudes</strong> si aplica.</p>`;

  const html = wrapCorreoSolicitante({
    titulo: "Solicitud rechazada",
    subtitulo: "Sistema de Gestión de Documentos",
    colorHeader: COLOR_RECHAZADO,
    nombreDestinatario: nombre,
    cuerpoHtml,
    enlaceHref: enlaceSistema,
  });

  const text = [
    "Solicitud rechazada - System V-Docs",
    "",
    `Estimado/a ${nombre},`,
    "",
    `Su solicitud #${solicitud.id_solicitud} (${labelTipoSolicitud(solicitud.tipo)}) fue rechazada.`,
    "",
    `Rechazada por: ${rechazadoPorNombre || "—"} (${rolRechazo || "—"})`,
    `Motivo: ${comentarioRechazo || "—"}`,
    "",
    resumenSolicitudTexto(solicitud),
    "",
    "Estado de las aprobaciones:",
    buildTablaAprobacionesTexto(aprobaciones),
    "",
    `Ver mis solicitudes: ${enlaceSistema}`,
  ].join("\n");

  const subject = `Solicitud rechazada - #${idSolicitud} (${labelTipoSolicitud(solicitud.tipo)})`;

  try {
    await sendMailMessage({ to: correo, subject, text, html });
    resultado.enviado = true;
  } catch (err) {
    const msg =
      err && typeof err.message === "string" ? err.message : "Error al enviar";
    resultado.errores.push(msg);
    console.error("[notificar-solicitante] Error correo rechazo:", err);
  }

  return resultado;
}

/**
 * Notifica al solicitante que todos los aprobadores dieron su visto bueno.
 */
export async function notificarSolicitanteSolicitudAprobada(
  connection,
  idSolicitud,
  { enlaceSistema = ENLACE_MIS_SOLICITUDES } = {},
) {
  const resultado = { enviado: false, omitido: false, errores: [] };

  const solicitud = await cargarSolicitudParaCorreo(connection, idSolicitud);
  if (!solicitud) {
    resultado.errores.push("No se encontró la solicitud.");
    return resultado;
  }

  const { correo, nombre } = await obtenerCorreoSolicitante(
    solicitud.emp_id_solicitante,
    solicitud.solicitante,
  );

  if (!isValidEmail(correo)) {
    resultado.omitido = true;
    resultado.errores.push(
      "El solicitante no tiene correo válido registrado en del_empleados.",
    );
    return resultado;
  }

  const aprobaciones = await cargarAprobacionesParaCorreo(
    connection,
    idSolicitud,
  );
  const tablaHtml = buildTablaAprobacionesHtml(aprobaciones);

  const mensajeDoc =
    solicitud.tipo === "cambio"
      ? "Los archivos fueron incorporados al documento en el catálogo."
      : "El documento fue dado de alta en el catálogo.";

  const cuerpoHtml = `
    <p style="margin:0 0 12px;">Nos complace informarle que su solicitud <strong>#${escapeHtml(solicitud.id_solicitud)}</strong> (${escapeHtml(labelTipoSolicitud(solicitud.tipo))}) fue <strong style="color:${COLOR_APROBADO};">aprobada por todos los aprobadores</strong>.</p>
    <p style="margin:0 0 14px;font-size:12px;color:#333;">${escapeHtml(mensajeDoc)}</p>
    <div style="font-size:12px;font-weight:700;color:${BRAND_ORANGE};margin-bottom:8px;">Resumen de aprobaciones</div>
    ${tablaHtml}`;

  const html = wrapCorreoSolicitante({
    titulo: "Solicitud aprobada",
    subtitulo: "Sistema de Gestión de Documentos",
    colorHeader: COLOR_APROBADO,
    nombreDestinatario: nombre,
    cuerpoHtml,
    enlaceHref: enlaceSistema,
  });

  const text = [
    "Solicitud aprobada - System V-Docs",
    "",
    `Estimado/a ${nombre},`,
    "",
    `Su solicitud #${solicitud.id_solicitud} (${labelTipoSolicitud(solicitud.tipo)}) fue aprobada por todos los aprobadores.`,
    mensajeDoc,
    "",
    resumenSolicitudTexto(solicitud),
    "",
    "Resumen de aprobaciones:",
    buildTablaAprobacionesTexto(aprobaciones),
    "",
    `Ver mis solicitudes: ${enlaceSistema}`,
  ].join("\n");

  const subject = `Solicitud aprobada - #${idSolicitud} (${labelTipoSolicitud(solicitud.tipo)})`;

  try {
    await sendMailMessage({ to: correo, subject, text, html });
    resultado.enviado = true;
  } catch (err) {
    const msg =
      err && typeof err.message === "string" ? err.message : "Error al enviar";
    resultado.errores.push(msg);
    console.error("[notificar-solicitante] Error correo aprobación:", err);
  }

  return resultado;
}
