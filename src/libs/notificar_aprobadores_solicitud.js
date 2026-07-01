import {
  TIPO_APROBADOR_FORZADO,
  TIPO_APROBADOR_JEFE_DIRECTO,
  TIPO_APROBADOR_RESPONSABLE_AREA,
  labelTiposAprobador,
} from "@/libs/aprobaciones";
import { isValidEmail, sendMailMessage } from "@/libs/mailer";
import { formatFechaRetencion } from "@/libs/tiempo_retencion";

const BRAND_ORANGE = "#e67e22";
const BRAND_ORANGE_DARK = "#d35400";

/** URL del sistema en correos (prioridad: variable de entorno). */
export const ENLACE_SISTEMA_CORREO = (() => {
  const env =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.ENLACE_SISTEMA_CORREO;
  const base = String(env || "http://TFTDELSRV011:3032").replace(/\/$/, "");
  return `${base}/dashboard/solicitudes`;
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

function textoIntroTipo(tipo, segundaFase = false) {
  if (segundaFase) {
    return "El <strong>jefe directo del solicitante</strong> ha registrado su aprobación. Esta solicitud requiere ahora su revisión y aprobación.";
  }
  if (tipo === "cambio") {
    return "Se ha creado una <strong>solicitud de cambio de documento</strong> que requiere su revisión y aprobación.";
  }
  return "Se ha creado una <strong>nueva solicitud de documento</strong> que requiere su revisión y aprobación.";
}

function labelRolAprobador(tipo) {
  return labelTiposAprobador(tipo);
}

function celdaEtiqueta(etiqueta, par = false) {
  const bg = par ? "#fff8e7" : "#ffffff";
  return `<td style="padding:4px 8px;background:${bg};border-bottom:1px solid #f0e6d6;font-size:10px;font-weight:600;color:#5d4e37;white-space:nowrap;vertical-align:top;">${escapeHtml(etiqueta)}</td>`;
}

function celdaValor(valor, par = false) {
  const bg = par ? "#fff8e7" : "#ffffff";
  return `<td style="padding:4px 10px 4px 6px;background:${bg};border-bottom:1px solid #f0e6d6;font-size:11px;line-height:1.35;color:#333333;vertical-align:top;">${valor}</td>`;
}

/** Dos pares etiqueta–valor por fila (layout horizontal, menos altura). */
function filaDetalleDoble(
  e1,
  v1,
  e2,
  v2,
  par = false,
) {
  return `<tr>${celdaEtiqueta(e1, par)}${celdaValor(v1, par)}${celdaEtiqueta(e2, par)}${celdaValor(v2, par)}</tr>`;
}

function filaDetalleAncho(etiqueta, valor, par = false) {
  const bg = par ? "#fff8e7" : "#ffffff";
  return `<tr>
    <td colspan="1" style="padding:4px 8px;background:${bg};border-bottom:1px solid #f0e6d6;font-size:10px;font-weight:600;color:#5d4e37;width:18%;vertical-align:top;">${escapeHtml(etiqueta)}</td>
    <td colspan="3" style="padding:4px 10px 4px 6px;background:${bg};border-bottom:1px solid #f0e6d6;font-size:11px;line-height:1.35;color:#333333;">${valor}</td>
  </tr>`;
}

function buildHtmlCorreoAprobacion({
  nombreDestinatario,
  solicitud,
  rolAprobador,
  enlaceSistema,
  segundaFase = false,
}) {
  const tipoLabel = labelTipoSolicitud(solicitud.tipo);
  const motivoHtml = escapeHtml(solicitud.motivo || "—").replace(
    /\n/g,
    "<br/>",
  );

  const creadoPor = `<strong style="color:${BRAND_ORANGE};font-size:11px;">${escapeHtml(solicitud.solicitante || "—")}</strong>`;
  const estadoHtml = `<strong style="color:${BRAND_ORANGE};font-size:11px;">Pendiente de aprobación</strong>`;

  const filas = [
    filaDetalleDoble(
      "ID solicitud",
      `#${escapeHtml(solicitud.id_solicitud)}`,
      "Tipo",
      escapeHtml(tipoLabel),
      false,
    ),
    filaDetalleDoble(
      "ID documento",
      escapeHtml(solicitud.id_documento || "—"),
      "Nomenclatura",
      escapeHtml(solicitud.nomenclatura || "—"),
      true,
    ),
    filaDetalleDoble(
      "Nombre registro",
      escapeHtml(solicitud.nombre_documento || "—"),
      "Dueño (área)",
      escapeHtml(solicitud.area_nombre || "—"),
      false,
    ),
    filaDetalleDoble(
      "Fecha de retención",
      escapeHtml(formatFechaRetencion(solicitud.tiempo_retencion)),
      "Ubicación",
      escapeHtml(solicitud.ubicacion_registro?.trim() || "—"),
      true,
    ),
    filaDetalleDoble(
      "Creado por",
      creadoPor,
      "Su rol",
      escapeHtml(rolAprobador),
      false,
    ),
    filaDetalleAncho("Estado", estadoHtml, true),
    filaDetalleAncho("Motivo", motivoHtml, false),
  ].join("");

  const enlaceHref = enlaceSistema || ENLACE_SISTEMA_CORREO;
  const enlaceTexto = "TFTDELSRV011:3032";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Aprobación requerida</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f4;padding:12px 8px;">
    <tr>
      <td align="center">
        <table role="presentation" width="760" cellspacing="0" cellpadding="0" style="max-width:760px;width:100%;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:${BRAND_ORANGE};padding:14px 20px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.02em;line-height:1.2;">Aprobación Requerida</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.95);margin-top:4px;">Sistema de Gestión de Documentos · System V-Docs</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 18px 6px;color:#333333;font-size:12px;line-height:1.45;">
              Estimado/a <strong style="color:${BRAND_ORANGE};">${escapeHtml(nombreDestinatario)}</strong>,
              ${textoIntroTipo(solicitud.tipo, segundaFase)} Acceda al sistema para revisar los detalles.
            </td>
          </tr>
          <tr>
            <td style="padding:4px 18px 10px;">
              <div style="font-size:12px;font-weight:700;color:${BRAND_ORANGE};margin-bottom:6px;">Detalles de la solicitud</div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #f0e6d6;border-radius:3px;overflow:hidden;table-layout:fixed;">
                ${filas}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 18px 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="4" style="background:${BRAND_ORANGE};">&nbsp;</td>
                  <td style="background:#fff8e7;padding:10px 14px;font-size:11px;color:#5d4e37;line-height:1.4;">
                    <strong style="color:${BRAND_ORANGE_DARK};">Acción requerida:</strong>
                    Revise y apruebe esta solicitud en el sistema.
                    <a href="${escapeHtml(enlaceHref)}" style="color:${BRAND_ORANGE};font-weight:600;margin-left:6px;text-decoration:underline;">${escapeHtml(enlaceTexto)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 18px 14px;text-align:center;border-top:1px solid #eeeeee;">
              <div style="font-size:11px;font-weight:600;color:${BRAND_ORANGE};">System V-Docs</div>
              <div style="font-size:10px;color:#888888;margin-top:2px;">Mensaje automático. No responda a este correo.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildTextoPlano({
  nombreDestinatario,
  solicitud,
  rolAprobador,
  enlaceSistema,
  segundaFase = false,
}) {
  const lineas = [
    "Aprobación Requerida - System V-Docs",
    "",
    `Estimado/a ${nombreDestinatario},`,
    "",
    textoIntroTipo(solicitud.tipo, segundaFase).replace(/<[^>]+>/g, ""),
    "",
    "Detalles de la solicitud:",
    `- ID de la solicitud: #${solicitud.id_solicitud}`,
    `- Tipo: ${labelTipoSolicitud(solicitud.tipo)}`,
    `- ID del documento: ${solicitud.id_documento || "—"}`,
    `- Nomenclatura: ${solicitud.nomenclatura || "—"}`,
    `- Nombre del registro: ${solicitud.nombre_documento || "—"}`,
    `- Dueño del registro (área): ${solicitud.area_nombre || "—"}`,
    `- Fecha de retención: ${formatFechaRetencion(solicitud.tiempo_retencion)}`,
    `- Ubicación del registro: ${solicitud.ubicacion_registro?.trim() || "—"}`,
    `- Motivo: ${solicitud.motivo || "—"}`,
    `- Creado por: ${solicitud.solicitante || "—"}`,
    `- Su rol: ${rolAprobador}`,
    `- Estado: Pendiente de aprobación`,
    "",
    "Acción requerida: revise y apruebe esta solicitud en el sistema.",
  ];
  lineas.push("", `Enlace: ${enlaceSistema || ENLACE_SISTEMA_CORREO} (TFTDELSRV011:3032)`);
  lineas.push("", "Este es un mensaje automático. No responda a este correo.");
  return lineas.join("\n");
}

function deduplicarDestinatarios(aprobaciones) {
  const vistos = new Set();
  const lista = [];
  for (const row of aprobaciones) {
    const correo = String(row.emp_correo ?? "").trim();
    const empId = String(row.emp_id ?? "").trim();
    const key = correo ? correo.toLowerCase() : `emp:${empId}`;
    if (vistos.has(key)) continue;
    vistos.add(key);
    lista.push({
      emp_id: empId,
      emp_nombre: String(row.emp_nombre ?? "").trim(),
      emp_correo: correo,
      tipo_aprobador: row.tipo_aprobador,
    });
  }
  return lista;
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

/**
 * @param {string[]} tiposIncluidos - valores de tipo_aprobador a notificar
 * @param {boolean} [soloPendientes] - si true, solo filas con status pendiente
 */
async function enviarCorreosAprobadores(
  connection,
  idSolicitud,
  { appBaseUrl, tiposIncluidos, soloPendientes = false, segundaFase = false },
) {
  const resultado = { enviados: 0, omitidos: 0, errores: [] };

  const solicitud = await cargarSolicitudParaCorreo(connection, idSolicitud);
  if (!solicitud) {
    resultado.errores.push("No se encontró la solicitud para notificar.");
    return resultado;
  }

  if (!tiposIncluidos?.length) {
    resultado.errores.push("No se indicaron tipos de aprobador a notificar.");
    return resultado;
  }

  const tipoLike = tiposIncluidos.map(() => "tipo_aprobador LIKE ?").join(" OR ");
  const params = [
    idSolicitud,
    ...tiposIncluidos.map((t) => `%${t}%`),
  ];
  let sql = `SELECT emp_id, emp_nombre, emp_correo, tipo_aprobador
     FROM aprobaciones
     WHERE id_solicitud = ?
       AND (${tipoLike})`;
  if (soloPendientes) {
    sql += ` AND status = 'pendiente'`;
  }

  const [aprobaciones] = await connection.query(sql, params);

  const destinatarios = deduplicarDestinatarios(aprobaciones);
  if (destinatarios.length === 0) {
    resultado.errores.push(
      "No hay aprobadores con los criterios indicados para notificar.",
    );
    return resultado;
  }

  const enlaceSistema = ENLACE_SISTEMA_CORREO;
  const tipoAsunto =
    solicitud.tipo === "cambio" ? "Cambio de documento" : "Nuevo documento";
  const prefijoAsunto = segundaFase ? "Siguiente aprobación" : "Aprobación requerida";
  const subject = `${prefijoAsunto} - Solicitud #${idSolicitud} (${tipoAsunto})`;

  for (const dest of destinatarios) {
    const correo = dest.emp_correo;
    if (!isValidEmail(correo)) {
      resultado.omitidos += 1;
      console.warn(
        `[notificar-aprobadores] Sin correo válido para ${dest.emp_nombre} (${dest.emp_id})`,
      );
      continue;
    }

    const nombre = dest.emp_nombre || dest.emp_id || "aprobador/a";
    const rol = labelRolAprobador(dest.tipo_aprobador);

    const html = buildHtmlCorreoAprobacion({
      nombreDestinatario: nombre,
      solicitud,
      rolAprobador: rol,
      enlaceSistema,
      segundaFase,
    });
    const text = buildTextoPlano({
      nombreDestinatario: nombre,
      solicitud,
      rolAprobador: rol,
      enlaceSistema,
      segundaFase,
    });

    try {
      await sendMailMessage({ to: correo, subject, text, html });
      resultado.enviados += 1;
    } catch (err) {
      const msg =
        err && typeof err.message === "string"
          ? err.message
          : "Error al enviar correo";
      resultado.errores.push(`${correo}: ${msg}`);
      console.error(
        `[notificar-aprobadores] Error enviando a ${correo}:`,
        err,
      );
    }
  }

  return resultado;
}

/** Al crear la solicitud: solo el jefe directo. */
export async function notificarJefeDirectoSolicitudCreada(
  connection,
  idSolicitud,
  { appBaseUrl } = {},
) {
  return enviarCorreosAprobadores(connection, idSolicitud, {
    appBaseUrl,
    tiposIncluidos: [TIPO_APROBADOR_JEFE_DIRECTO],
    soloPendientes: true,
    segundaFase: false,
  });
}

/** Tras aprobar el jefe directo: aprobadores forzados y responsable de área. */
export async function notificarDemasAprobadoresTrasJefe(
  connection,
  idSolicitud,
  { appBaseUrl } = {},
) {
  return enviarCorreosAprobadores(connection, idSolicitud, {
    appBaseUrl,
    tiposIncluidos: [
      TIPO_APROBADOR_FORZADO,
      TIPO_APROBADOR_RESPONSABLE_AREA,
    ],
    soloPendientes: true,
    segundaFase: true,
  });
}

export function resolveAppBaseUrl(request) {
  const env =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL;
  if (env) return String(env).replace(/\/$/, "");
  try {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
}
