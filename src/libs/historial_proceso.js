const ACCIONES_TIPO_ALTA = new Set([
  "alta_directa",
  "solicitud_nuevo",
  "alta_por_aprobacion",
  "solicitud_aprobada",
]);

const ACCIONES_TIPO_REEMPLAZO = new Set([
  "solicitud_cambio",
  "cambio_archivos",
  "solicitud_reenviada",
]);

const ACCIONES_FINALIZAN_PROCESO = new Set([
  "alta_directa",
  "alta_por_aprobacion",
  "cambio_archivos",
  "solicitud_rechazada",
  "rechazo_automatico",
  "solicitud_obsoleta",
  "cambio_estado",
  "cambio_descargado",
  "documento_eliminado",
  "solicitud_aprobada",
]);

export const TIPO_PROCESO = {
  ALTA: "alta",
  REEMPLAZO: "reemplazo",
  ADMINISTRACION: "administracion",
};

export const ESTADO_PROCESO = {
  EN_CURSO: "en_curso",
  FINALIZADO: "finalizado",
};

const LABELS_TIPO = {
  [TIPO_PROCESO.ALTA]: "Alta de documento",
  [TIPO_PROCESO.REEMPLAZO]: "Reemplazo de archivos",
  [TIPO_PROCESO.ADMINISTRACION]: "Administración",
};

const LABELS_ESTADO = {
  [ESTADO_PROCESO.EN_CURSO]: "En curso",
  [ESTADO_PROCESO.FINALIZADO]: "Finalizado",
};

export function labelTipoProceso(tipo) {
  return LABELS_TIPO[String(tipo ?? "").trim().toLowerCase()] || "Proceso";
}

export function labelEstadoProceso(estado) {
  return LABELS_ESTADO[String(estado ?? "").trim().toLowerCase()] || estado;
}

function inferirTipoProcesoDesdeEventos(eventos) {
  const acciones = eventos.map((ev) =>
    String(ev.accion ?? "").trim().toLowerCase(),
  );
  if (acciones.some((a) => ACCIONES_TIPO_REEMPLAZO.has(a))) {
    return TIPO_PROCESO.REEMPLAZO;
  }
  if (acciones.some((a) => ACCIONES_TIPO_ALTA.has(a))) {
    return TIPO_PROCESO.ALTA;
  }
  return TIPO_PROCESO.ADMINISTRACION;
}

export function inferirTipoProceso(accion) {
  return inferirTipoProcesoDesdeEventos([{ accion }]);
}

/** Identificador estable para agrupar eventos del mismo flujo. */
export function resolverIdProceso(payload) {
  if (payload?.id_proceso) {
    return String(payload.id_proceso).trim();
  }
  if (payload?.id_solicitud != null && payload.id_solicitud !== "") {
    return String(payload.id_solicitud);
  }
  const accion = String(payload?.accion ?? "").trim().toLowerCase();
  const idDoc = String(payload?.id_documento ?? "").trim();
  if (accion === "alta_directa" && idDoc) {
    return `directo-${idDoc}`;
  }
  if (accion === "cambio_estado" || accion === "cambio_descargado") {
    return `admin-${accion}-${idDoc}-${Date.now()}`;
  }
  return null;
}

function fechaMs(fecha) {
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/** Orden lógico dentro del mismo proceso (menor = antes). */
const ORDEN_ACCION_HISTORIAL = {
  solicitud_nuevo: 100,
  solicitud_cambio: 100,
  solicitud_reenviada: 110,
  visto_bueno: 200,
  alta_directa: 300,
  alta_por_aprobacion: 400,
  cambio_archivos: 400,
  solicitud_aprobada: 400,
  solicitud_rechazada: 400,
  rechazo_automatico: 400,
  cambio_estado: 500,
  cambio_descargado: 500,
  solicitud_obsoleta: 600,
  documento_eliminado: 700,
};

function ordenAccionHistorial(accion) {
  return ORDEN_ACCION_HISTORIAL[String(accion ?? "").trim().toLowerCase()] ?? 250;
}

/** Orden cronológico con desempate por tipo de acción e id de registro. */
export function compararEventosHistorial(a, b) {
  const diffFecha = fechaMs(a.fecha_evento) - fechaMs(b.fecha_evento);
  if (diffFecha !== 0) return diffFecha;
  const diffOrden =
    ordenAccionHistorial(a.accion) - ordenAccionHistorial(b.accion);
  if (diffOrden !== 0) return diffOrden;
  return (Number(a.id_historial) || 0) - (Number(b.id_historial) || 0);
}

function procesoEstaFinalizado(eventos) {
  return eventos.some((ev) =>
    ACCIONES_FINALIZAN_PROCESO.has(String(ev.accion ?? "").trim().toLowerCase()),
  );
}

function resumenArchivosProceso(eventos) {
  for (const ev of eventos) {
    const archivos = ev.datos_nuevos?.archivos;
    if (Array.isArray(archivos) && archivos.length > 0) {
      return archivos;
    }
  }
  return [];
}

function resumenMotivoProceso(eventos) {
  for (const ev of eventos) {
    const motivo = ev.datos_nuevos?.motivo;
    if (motivo) return String(motivo);
    if (ev.detalle && String(ev.detalle).includes("Motivo:")) {
      return String(ev.detalle).split("Motivo:").pop().trim();
    }
  }
  return null;
}

/**
 * Agrupa eventos en procesos. Por defecto solo devuelve procesos finalizados.
 */
export function agruparHistorialEnProcesos(eventos, { soloFinalizados = true } = {}) {
  const lista = Array.isArray(eventos) ? eventos : [];
  const mapa = new Map();

  for (const ev of lista) {
    const idProceso =
      ev.id_proceso ??
      (ev.id_solicitud != null ? String(ev.id_solicitud) : null) ??
      `evt-${ev.id_historial}`;

    if (!mapa.has(idProceso)) {
      mapa.set(idProceso, {
        id_proceso: idProceso,
        id_solicitud: ev.id_solicitud ?? null,
        tipo_proceso:
          ev.tipo_proceso ?? inferirTipoProceso(ev.accion),
        eventos: [],
      });
    }

    const grupo = mapa.get(idProceso);
    grupo.eventos.push(ev);
    if (ev.id_solicitud != null) grupo.id_solicitud = ev.id_solicitud;
    if (ev.tipo_proceso) grupo.tipo_proceso = ev.tipo_proceso;
  }

  const procesos = [...mapa.values()].map((grupo) => {
    const eventosOrdenados = [...grupo.eventos].sort(compararEventosHistorial);
    const finalizado = procesoEstaFinalizado(eventosOrdenados);
    const fechaInicio = eventosOrdenados[0]?.fecha_evento ?? null;
    const fechaFin =
      eventosOrdenados[eventosOrdenados.length - 1]?.fecha_evento ?? null;
    const tipoProceso =
      inferirTipoProcesoDesdeEventos(eventosOrdenados) ||
      grupo.tipo_proceso;

    return {
      id_proceso: grupo.id_proceso,
      id_solicitud: grupo.id_solicitud,
      tipo_proceso: tipoProceso,
      titulo: labelTipoProceso(tipoProceso),
      estado: finalizado ? ESTADO_PROCESO.FINALIZADO : ESTADO_PROCESO.EN_CURSO,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      motivo: resumenMotivoProceso(eventosOrdenados),
      archivos: resumenArchivosProceso(eventosOrdenados),
      eventos: eventosOrdenados,
    };
  });

  const filtrados = soloFinalizados
    ? procesos.filter((p) => p.estado === ESTADO_PROCESO.FINALIZADO)
    : procesos;

  return filtrados.sort((a, b) => fechaMs(b.fecha_fin) - fechaMs(a.fecha_fin));
}

export function enriquecerPayloadHistorial(payload) {
  const tipo_proceso =
    payload.tipo_proceso ?? inferirTipoProceso(payload.accion);
  const id_proceso = resolverIdProceso({ ...payload, tipo_proceso });
  return {
    ...payload,
    tipo_proceso,
    id_proceso,
  };
}
