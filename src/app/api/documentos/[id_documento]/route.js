import { NextResponse } from "next/server";
import { conn } from "@/libs/system_v_docs";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "documentos");

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

    // Obtener documento con sus archivos
    const [documento] = await conn.query(
      `SELECT d.*,
       MAX(ar.area_nombre) AS area_nombre,
       COALESCE(
         JSON_ARRAYAGG(
           JSON_OBJECT(
             'id_archivo', a.id_archivo,
             'nombre_archivo', a.nombre_archivo,
             'ruta_archivo', a.ruta_archivo,
             'tipo_archivo', a.tipo_archivo,
             'tamano_archivo', a.tamano_archivo,
             'fecha_subida', a.fecha_subida
           )
         ),
         JSON_ARRAY()
       ) AS archivos
       FROM documentos d
       LEFT JOIN areas ar ON d.id_area = ar.id_area
       LEFT JOIN archivos_documentos a ON d.id_documento = a.id_documento
       WHERE d.id_documento = ?
       GROUP BY d.id_documento`,
      [id_documento],
    );

    if (documento.length === 0) {
      return NextResponse.json(
        { error: "Documento no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: documento[0],
    });
  } catch (error) {
    console.error("Error al obtener documento:", error);
    return NextResponse.json(
      {
        error: "Error al consultar la base de datos",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await params;
    const id_documento = resolvedParams.id_documento;

    if (!id_documento) {
      return NextResponse.json(
        { error: "El ID del documento es requerido" },
        { status: 400 },
      );
    }

    // Verificar si el documento existe
    const [existing] = await conn.query(
      "SELECT id_documento, ruta_carpeta FROM documentos WHERE id_documento = ?",
      [id_documento],
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Documento no encontrado" },
        { status: 404 },
      );
    }

    // Eliminar archivos físicos
    const carpetaDocumento = path.join(UPLOAD_DIR, id_documento);
    if (fs.existsSync(carpetaDocumento)) {
      fs.rmSync(carpetaDocumento, { recursive: true, force: true });
    }

    // Eliminar registros de la base de datos (CASCADE eliminará los archivos automáticamente)
    await conn.query("DELETE FROM documentos WHERE id_documento = ?", [
      id_documento,
    ]);

    return NextResponse.json({
      success: true,
      message: "Documento eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar documento:", error);
    return NextResponse.json(
      {
        error: "Error al eliminar el documento",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
