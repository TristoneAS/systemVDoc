import fs from "fs";
import { resolverRutaFisicaDocumento } from "@/libs/almacen_documentos";
import { resolverRutaFisicaSolicitud } from "@/libs/almacen_solicitudes";

/** Busca el archivo en solicitudes o documentos (ruta pública /uploads/...). */
export function resolverRutaFisicaArchivoPublico(rutaPublica) {
  const candidatas = [
    resolverRutaFisicaSolicitud(rutaPublica),
    resolverRutaFisicaDocumento(rutaPublica),
  ].filter(Boolean);

  for (const fisica of candidatas) {
    try {
      if (fs.existsSync(fisica) && fs.statSync(fisica).isFile()) {
        return fisica;
      }
    } catch {
      /* ignore */
    }
  }

  return candidatas[0] ?? null;
}
