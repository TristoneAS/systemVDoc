import fs from "fs";
import { NextResponse } from "next/server";
import {
  DOCUMENTOS_URL_PREFIX,
  mimeDesdeNombreArchivo,
  resolverRutaFisicaDocumento,
} from "@/libs/almacen_documentos";

export async function GET(_request, { params }) {
  try {
    const resolved = await params;
    const segments = Array.isArray(resolved.path) ? resolved.path : [];

    if (
      segments.length < 2 ||
      segments.some((s) => !s || s === "." || s === "..")
    ) {
      return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
    }

    const rutaPublica = `${DOCUMENTOS_URL_PREFIX}/${segments.join("/")}`;
    const fisica = resolverRutaFisicaDocumento(rutaPublica);

    if (!fisica || !fs.existsSync(fisica) || !fs.statSync(fisica).isFile()) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const nombreArchivo = segments[segments.length - 1];
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
    console.error("Error al servir documento:", error);
    return NextResponse.json(
      { error: "Error al leer el archivo" },
      { status: 500 },
    );
  }
}
