import { NextResponse } from "next/server";
import { conn } from "@/libs/system_v_docs";
import { obtenerDocumentoConArchivos } from "@/libs/documento_detalle";
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

    const documento = await obtenerDocumentoConArchivos(id_documento);

    if (!documento) {
      return NextResponse.json(
        { error: "Documento no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: documento,
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

export async function PATCH(request, { params }) {
  try {
    const resolvedParams = await params;
    const id_documento = resolvedParams.id_documento;

    if (!id_documento) {
      return NextResponse.json(
        { error: "El ID del documento es requerido" },
        { status: 400 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Cuerpo JSON inválido" },
        { status: 400 },
      );
    }

    if (body.is_admin !== true) {
      return NextResponse.json(
        { error: "Solo un administrador puede cambiar el estado del documento." },
        { status: 403 },
      );
    }

    const estadoRaw = String(body.estado ?? "").trim().toLowerCase();
    if (estadoRaw !== "activo" && estadoRaw !== "inactivo") {
      return NextResponse.json(
        { error: "estado debe ser activo o inactivo" },
        { status: 400 },
      );
    }

    const [existing] = await conn.query(
      "SELECT id_documento, estado FROM documentos WHERE id_documento = ?",
      [id_documento],
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Documento no encontrado" },
        { status: 404 },
      );
    }

    const estadoActual = String(existing[0].estado ?? "activo")
      .trim()
      .toLowerCase();
    if (estadoActual === estadoRaw) {
      return NextResponse.json({
        success: true,
        message:
          estadoRaw === "activo"
            ? "El documento ya está activo"
            : "El documento ya está inactivo",
        data: { id_documento, estado: estadoRaw },
      });
    }

    await conn.query(
      `UPDATE documentos SET estado = ?, fecha_actualizacion = NOW() WHERE id_documento = ?`,
      [estadoRaw, id_documento],
    );

    return NextResponse.json({
      success: true,
      message:
        estadoRaw === "activo"
          ? "Documento habilitado correctamente"
          : "Documento deshabilitado correctamente",
      data: { id_documento, estado: estadoRaw },
    });
  } catch (error) {
    console.error("Error al actualizar estado del documento:", error);
    return NextResponse.json(
      {
        error: "Error al actualizar el estado del documento",
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
