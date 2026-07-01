import fs from "fs";
import path from "path";

/** Prefijo público de URLs de archivos de documentos (sin cambiar el frontend). */
export const DOCUMENTOS_URL_PREFIX = "/uploads/documentos";

/**
 * Raíz UNC/local donde se guardan los documentos finales (PDF, Excel, etc.).
 * Variable de entorno: DOCUMENTOS_STORAGE_ROOT
 * Ejemplo producción: \\Tftdelsrv001\del\SystemVdocs
 */
export function getDocumentosStorageRoot() {
  const fromEnv = String(process.env.DOCUMENTOS_STORAGE_ROOT ?? "").trim();
  if (fromEnv) return fromEnv;
  return "\\\\Tftdelsrv001\\del\\SystemVdocs";
}

/** Ruta física de la carpeta de un documento. */
export function getCarpetaDocumentoFisica(idDocumento) {
  return path.join(getDocumentosStorageRoot(), String(idDocumento));
}

/** URL pública de la carpeta del documento (se guarda en BD). */
export function buildRutaCarpetaPublica(idDocumento) {
  return `${DOCUMENTOS_URL_PREFIX}/${idDocumento}`;
}

/** URL pública de un archivo (se guarda en BD). */
export function buildRutaArchivoPublica(idDocumento, nombreArchivo) {
  return `${DOCUMENTOS_URL_PREFIX}/${idDocumento}/${nombreArchivo}`;
}

export function ensureDocumentosDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/** Resuelve URL pública → ruta física en almacén UNC (con respaldo en public/ legacy). */
export function resolveDocumentoFisicoFromPublicUrl(rutaPublica) {
  const rel = String(rutaPublica ?? "")
    .replace(/^\//, "")
    .replace(/\\/g, "/");

  const prefix = `${DOCUMENTOS_URL_PREFIX.replace(/^\//, "")}/`;
  if (rel.startsWith(prefix)) {
    const suffix = rel.slice(prefix.length);
    const segments = suffix.split("/").filter(Boolean);
    if (segments.some((s) => s === ".." || s === ".")) {
      return null;
    }
    return path.join(getDocumentosStorageRoot(), ...segments);
  }

  // Compatibilidad: archivos antiguos en public/uploads/documentos
  const legacyPrefix = "uploads/documentos/";
  if (rel.startsWith(legacyPrefix)) {
    const suffix = rel.slice(legacyPrefix.length);
    const segments = suffix.split("/").filter(Boolean);
    if (segments.some((s) => s === ".." || s === ".")) {
      return null;
    }
    return path.join(process.cwd(), "public", "uploads", "documentos", ...segments);
  }

  return null;
}

/** Busca el archivo en UNC y, si no existe, en public/ (migración gradual). */
export function resolverRutaFisicaDocumento(rutaPublica) {
  const fisica = resolveDocumentoFisicoFromPublicUrl(rutaPublica);
  if (fisica && fs.existsSync(fisica)) return fisica;

  const rel = String(rutaPublica ?? "").replace(/^\//, "");
  const legacy = path.join(process.cwd(), "public", rel);
  if (fs.existsSync(legacy)) return legacy;

  return fisica;
}

export function eliminarCarpetaDocumento(idDocumento) {
  const carpeta = getCarpetaDocumentoFisica(idDocumento);
  if (fs.existsSync(carpeta)) {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }

  // Limpieza legacy en public/
  const legacy = path.join(
    process.cwd(),
    "public",
    "uploads",
    "documentos",
    String(idDocumento),
  );
  if (fs.existsSync(legacy)) {
    fs.rmSync(legacy, { recursive: true, force: true });
  }
}

export function vaciarCarpetaDocumento(idDocumento) {
  const carpeta = getCarpetaDocumentoFisica(idDocumento);
  ensureDocumentosDir(carpeta);
  if (!fs.existsSync(carpeta)) return;

  for (const name of fs.readdirSync(carpeta)) {
    const fp = path.join(carpeta, name);
    try {
      if (fs.statSync(fp).isFile()) fs.unlinkSync(fp);
    } catch {
      /* ignore */
    }
  }
}

const MIME_POR_EXTENSION = {
  ".pdf": "application/pdf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export function mimeDesdeNombreArchivo(nombreArchivo) {
  const ext = path.extname(String(nombreArchivo ?? "")).toLowerCase();
  return MIME_POR_EXTENSION[ext] ?? "application/octet-stream";
}
