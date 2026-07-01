import { NextResponse } from "next/server";
import { conn } from "@/libs/system_v_docs";
import { obtenerHistorialProcesosPorDocumento } from "@/libs/historial_archivos";

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const id_documento = resolvedParams.id_documento;

    if (!id_documento) {
      return NextResponse.json(
        { error: "El ID del documento es requerido" },
        { status: 400 },
      );
    }

    const [exists] = await conn.query(
      "SELECT id_documento FROM documentos WHERE id_documento = ?",
      [id_documento],
    );

    if (exists.length === 0) {
      return NextResponse.json(
        { error: "Documento no encontrado" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const incluirEnCurso =
      searchParams.get("incluir_en_curso") === "true" ||
      searchParams.get("incluir_en_curso") === "1";

    const procesos = await obtenerHistorialProcesosPorDocumento(
      conn,
      id_documento,
      { soloFinalizados: !incluirEnCurso },
    );

    return NextResponse.json({
      success: true,
      data: procesos,
    });
  } catch (error) {
    console.error("Error al obtener historial del documento:", error);
    return NextResponse.json(
      {
        error: "Error al consultar el historial",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
