const EXT_POR_MIME = {
  "application/pdf": ".pdf",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    ".pptx",
};

export function sanitizarSegmentoNombreArchivo(texto) {
  return String(texto ?? "")
    .trim()
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\.+$/, "")
    .slice(0, 100);
}

export function obtenerExtensionArchivo(archivo) {
  const name = String(archivo?.name ?? "");
  const match = name.match(/(\.[a-z0-9]{2,5})$/i);
  if (match) return match[1].toLowerCase();

  const type = String(archivo?.type ?? "").toLowerCase();
  return EXT_POR_MIME[type] || "";
}

export function baseNombreArchivoDocumento(nomenclatura, nombreDocumento) {
  const nom = sanitizarSegmentoNombreArchivo(nomenclatura);
  const nombre = sanitizarSegmentoNombreArchivo(nombreDocumento);
  if (nom && nombre) return `${nom}-${nombre}`;
  if (nom) return nom;
  if (nombre) return nombre;
  return "documento";
}

export function asignarNombresArchivosDocumento(
  archivos,
  { nomenclatura, nombreDocumento },
) {
  const lista = (Array.isArray(archivos) ? archivos : []).filter(Boolean);
  const base = baseNombreArchivoDocumento(nomenclatura, nombreDocumento);
  const usados = new Set();

  return lista.map((archivo) => {
    const ext = obtenerExtensionArchivo(archivo) || "";
    let candidato = `${base}${ext}`;
    let n = 2;
    while (usados.has(candidato.toLowerCase())) {
      candidato = `${base}-${n}${ext}`;
      n += 1;
    }
    usados.add(candidato.toLowerCase());
    return candidato;
  });
}

export function renombrarArchivoFile(archivo, nuevoNombre) {
  if (!archivo || !nuevoNombre) return archivo;
  if (archivo.name === nuevoNombre) return archivo;
  if (typeof File === "undefined") return archivo;
  return new File([archivo], nuevoNombre, {
    type: archivo.type,
    lastModified: archivo.lastModified,
  });
}

function normalizarSegmentoRuta(segmento) {
  try {
    return encodeURIComponent(decodeURIComponent(String(segmento ?? "")));
  } catch {
    return encodeURIComponent(String(segmento ?? ""));
  }
}

/** Codifica segmentos de una ruta pública (/uploads/...) para URLs con espacios o caracteres especiales. */
export function codificarRutaPublicaArchivo(rutaPublica) {
  const raw = String(rutaPublica ?? "").trim();
  if (!raw) return "";
  if (!raw.startsWith("/")) return raw;
  const segmentos = raw.split("/").filter(Boolean);
  return `/${segmentos.map(normalizarSegmentoRuta).join("/")}`;
}

/** Rutas posibles de un archivo de solicitud (cambio puede estar en solicitudes o documentos). */
export function rutasCandidatasArchivoSolicitud(archivo, solicitud = {}) {
  const candidatas = [];
  const push = (ruta) => {
    const r = String(ruta ?? "").trim();
    if (r && !candidatas.includes(r)) candidatas.push(r);
  };

  push(archivo?.ruta_archivo);

  const nombre = String(archivo?.nombre_archivo ?? "").trim();
  const idSol = solicitud?.id_solicitud;
  const idDoc = solicitud?.id_documento;
  const tipo = String(solicitud?.tipo ?? "").trim().toLowerCase();
  const tipoCarpeta = tipo === "cambio" ? "cambio" : "nuevo";

  if (nombre && idSol != null && String(idSol) !== "") {
    push(`/uploads/solicitudes/${tipoCarpeta}/${idSol}/${nombre}`);
  }
  if (nombre && idDoc != null && String(idDoc) !== "" && tipo === "cambio") {
    push(`/uploads/documentos/${idDoc}/${nombre}`);
  }

  return candidatas;
}

export async function obtenerBlobArchivoPorRutas(candidatas) {
  const rutas = Array.isArray(candidatas) ? candidatas : [];
  for (const ruta of rutas) {
    const url = codificarRutaPublicaArchivo(ruta);
    if (!url) continue;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (!blob.size) continue;
      return { blob, url };
    } catch {
      /* siguiente candidata */
    }
  }
  return null;
}

export function renombrarArchivosDocumento(archivos, ctx) {
  const lista = (Array.isArray(archivos) ? archivos : []).filter(Boolean);
  if (!lista.length) return [];
  const nombres = asignarNombresArchivosDocumento(lista, ctx);
  return lista.map((archivo, index) =>
    renombrarArchivoFile(archivo, nombres[index]),
  );
}

export const MAX_ARCHIVOS_ADJUNTOS = 2;

export const ACCEPT_ARCHIVOS_ADJUNTOS =
  ".xlsx,.xls,.pdf,.doc,.docx,.ppt,.pptx";

export const ARCHIVOS_ADJUNTOS_HINT =
  "Máximo 2 archivos. Debe incluir al menos un PDF.";

const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export function esArchivoPdf(archivo) {
  const type = String(archivo?.type ?? "").toLowerCase();
  if (type.includes("pdf")) return true;
  const name = String(archivo?.name ?? "").toLowerCase();
  return name.endsWith(".pdf");
}

export function esTipoArchivoPermitido(archivo) {
  const type = String(archivo?.type ?? "").toLowerCase();
  if (ALLOWED_MIME_TYPES.has(type)) return true;
  const name = String(archivo?.name ?? "").toLowerCase();
  return (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".pdf") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    name.endsWith(".ppt") ||
    name.endsWith(".pptx")
  );
}

export function validarArchivosAdjuntos(archivos) {
  const list = (Array.isArray(archivos) ? archivos : []).filter(
    (a) => a && (a.size == null || a.size > 0),
  );

  if (list.length === 0) {
    return { ok: false, error: "Debe adjuntar al menos un archivo" };
  }
  if (list.length > MAX_ARCHIVOS_ADJUNTOS) {
    return {
      ok: false,
      error: `Solo puede adjuntar hasta ${MAX_ARCHIVOS_ADJUNTOS} archivos`,
    };
  }

  for (const archivo of list) {
    if (!esTipoArchivoPermitido(archivo)) {
      return {
        ok: false,
        error: `Formato no permitido: ${archivo.name || "archivo"}`,
      };
    }
  }

  if (!list.some(esArchivoPdf)) {
    return {
      ok: false,
      error: "Debe adjuntar al menos un archivo PDF",
    };
  }

  return { ok: true };
}

export function combinarArchivosAlSubir(actuales, nuevosArchivos, ctx) {
  const mensajes = [];
  const actualesList = Array.isArray(actuales) ? actuales : [];
  const nuevosList = Array.isArray(nuevosArchivos) ? nuevosArchivos : [];

  if (actualesList.length >= MAX_ARCHIVOS_ADJUNTOS) {
    mensajes.push(
      `Solo puede adjuntar hasta ${MAX_ARCHIVOS_ADJUNTOS} archivos.`,
    );
    return { archivos: actualesList, mensajes };
  }

  const permitidos = nuevosList.filter((file) => {
    if (!esTipoArchivoPermitido(file)) {
      mensajes.push(
        `El archivo ${file.name} no es un formato válido. Solo Excel, PDF, Word y PowerPoint.`,
      );
      return false;
    }
    return true;
  });

  const espacio = MAX_ARCHIVOS_ADJUNTOS - actualesList.length;
  const aAgregar = permitidos.slice(0, espacio);

  if (permitidos.length > espacio) {
    mensajes.push(
      `Solo se agregaron ${espacio} archivo(s); el máximo permitido es ${MAX_ARCHIVOS_ADJUNTOS}.`,
    );
  }

  let archivos = [...actualesList, ...aAgregar];
  if (ctx && (ctx.nomenclatura || ctx.nombreDocumento)) {
    archivos = renombrarArchivosDocumento(archivos, ctx);
  }

  return { archivos, mensajes };
}
