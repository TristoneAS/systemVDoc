export const PREFILL_SOLICITUD_CAMBIO_KEY = "prefill_solicitud_cambio";

function motivoPrefillPorVencimiento(doc) {
  const nom = String(doc?.nomenclatura ?? doc?.id_documento ?? "").trim();
  return nom
    ? `Actualización por vencimiento de retención del documento ${nom}.`
    : "Actualización por vencimiento de retención del documento.";
}

export function prepararPayloadPrefillSolicitudCambio(doc, opciones = {}) {
  const archivos = Array.isArray(doc?.archivos) ? doc.archivos : [];
  const { archivos: _a, ...documento } = doc ?? {};

  return {
    documento,
    archivos: archivos.map((a) => ({
      nombre_archivo: a.nombre_archivo,
      ruta_archivo: a.ruta_archivo,
      tipo_archivo: a.tipo_archivo,
    })),
    motivo: opciones.motivo ?? motivoPrefillPorVencimiento(doc),
    ubicacion_registro: String(
      opciones.ubicacion_registro ?? doc?.ubicacion_registro ?? "",
    ).trim(),
  };
}

export function guardarPrefillSolicitudCambio(payload) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(PREFILL_SOLICITUD_CAMBIO_KEY, JSON.stringify(payload));
}

export function tienePrefillSolicitudCambio() {
  if (typeof sessionStorage === "undefined") return false;
  return Boolean(sessionStorage.getItem(PREFILL_SOLICITUD_CAMBIO_KEY));
}

export function leerPrefillSolicitudCambio() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PREFILL_SOLICITUD_CAMBIO_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function limpiarPrefillSolicitudCambio() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(PREFILL_SOLICITUD_CAMBIO_KEY);
}

export function consumirPrefillSolicitudCambio() {
  const data = leerPrefillSolicitudCambio();
  if (data) limpiarPrefillSolicitudCambio();
  return data;
}

/** Descarga archivos del catálogo como objetos File para el formulario. */
export async function descargarArchivosDocumentoComoFiles(archivosMeta) {
  const lista = Array.isArray(archivosMeta) ? archivosMeta : [];
  const files = [];

  for (const meta of lista) {
    const ruta = String(meta?.ruta_archivo ?? "").trim();
    if (!ruta) continue;

    const res = await fetch(ruta, {
      signal:
        typeof AbortSignal !== "undefined" && AbortSignal.timeout
          ? AbortSignal.timeout(30000)
          : undefined,
    });
    if (!res.ok) {
      throw new Error(
        `No se pudo cargar el archivo "${meta?.nombre_archivo ?? ruta}".`,
      );
    }

    const blob = await res.blob();
    const nombre =
      String(meta?.nombre_archivo ?? "archivo").trim() || "archivo";
    const tipo =
      String(meta?.tipo_archivo ?? blob.type ?? "").trim() ||
      "application/octet-stream";

    files.push(new File([blob], nombre, { type: tipo }));
  }

  return files;
}
