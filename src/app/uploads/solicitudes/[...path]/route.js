import fs from "fs";
import { NextResponse } from "next/server";
import {
  SOLICITUDES_URL_PREFIX,
  mimeDesdeNombreArchivo,
  resolverRutaFisicaSolicitud,
} from "@/libs/almacen_solicitudes";

export async function GET(_request, { params }) {
  try {
    const resolved = await params;
    const segmentos = Array.isArray(resolved.path) ? resolved.path : [];

    if (
      segmentos.length < 3 ||
      segmentos.some((s) => !s || s === "." || s === "..")
    ) {
      return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
    }

    const rutaPublica = `${SOLICITUDES_URL_PREFIX}/${segmentos.join("/")}`;
    const fisica = resolverRutaFisicaSolicitud(rutaPublica);

    if (!fisica || !fs.existsSync(fisica) || !fs.statSync(fisica).isFile()) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const nombreArchivo = segmentos[segmentos.length - 1];
    const buffer = fs.readFileSync(fisica);
    const contentType = mimeDesdeNombreArchivo(nombreArchivo);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(nombreArchivo)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error al servir archivo de solicitud:", error);
    return NextResponse.json(
      { error: "Error al leer el archivo" },
      { status: 500 },
    );
  }
}
