import fs from "fs";
import path from "path";
import { mimeDesdeNombreArchivo } from "@/libs/almacen_documentos";

export const SOLICITUDES_URL_PREFIX = "/uploads/solicitudes";

export function getSolicitudesStorageRoot() {
  return path.join(process.cwd(), "public", "uploads", "solicitudes");
}

/** Resuelve URL pública → ruta física en public/uploads/solicitudes. */
export function resolverRutaFisicaSolicitud(rutaPublica) {
  const rel = String(rutaPublica ?? "")
    .replace(/^\//, "")
    .replace(/\\/g, "/");

  const prefix = `${SOLICITUDES_URL_PREFIX.replace(/^\//, "")}/`;
  if (!rel.startsWith(prefix)) return null;

  const suffix = rel.slice(prefix.length);
  const segmentos = suffix.split("/").filter(Boolean);
  if (segmentos.length < 3) return null;
  if (segmentos.some((s) => s === "." || s === "..")) return null;

  const fisica = path.join(getSolicitudesStorageRoot(), ...segmentos);
  if (fs.existsSync(fisica) && fs.statSync(fisica).isFile()) return fisica;

  return fisica;
}

export { mimeDesdeNombreArchivo };
