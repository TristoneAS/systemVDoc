import { NextResponse } from "next/server";
import { conn } from "@/libs/system_v_docs";
import { obtenerDocumentoConArchivos } from "@/libs/documento_detalle";
import {
  ACCION_HISTORIAL,
  registrarHistorial,
  resumenArchivosHistorial,
} from "@/libs/historial_archivos";
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
        {
          error:
            "Solo un administrador puede modificar el documento desde esta acción.",
        },
        { status: 403 },
      );
    }

    const tieneEstado = body.estado !== undefined && body.estado !== null;
    const tieneDescargado =
      body.descargado !== undefined && body.descargado !== null;

    if (!tieneEstado && !tieneDescargado) {
      return NextResponse.json(
        { error: "Indique estado o descargado para actualizar" },
        { status: 400 },
      );
    }

    const [existing] = await conn.query(
      `SELECT id_documento, estado, descargado, nomenclatura, nombre_documento
       FROM documentos WHERE id_documento = ?`,
      [id_documento],
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Documento no encontrado" },
        { status: 404 },
      );
    }

    const respuesta = { id_documento };
    let message = "Documento actualizado";
    const empIdActor = String(body.emp_id_actor ?? "").trim() || null;
    const empNombreActor = String(body.emp_nombre_actor ?? "").trim() || null;

    if (tieneEstado) {
      const estadoRaw = String(body.estado ?? "").trim().toLowerCase();
      if (estadoRaw !== "activo" && estadoRaw !== "inactivo") {
        return NextResponse.json(
          { error: "estado debe ser activo o inactivo" },
          { status: 400 },
        );
      }
      const estadoActual = String(existing[0].estado ?? "activo")
        .trim()
        .toLowerCase();
      if (estadoActual !== estadoRaw) {
        await conn.query(
          `UPDATE documentos SET estado = ?, fecha_actualizacion = NOW() WHERE id_documento = ?`,
          [estadoRaw, id_documento],
        );
        await registrarHistorial(conn, {
          id_documento,
          accion: ACCION_HISTORIAL.CAMBIO_ESTADO,
          emp_id_actor: empIdActor,
          emp_nombre_actor: empNombreActor,
          detalle:
            estadoRaw === "activo"
              ? "Documento habilitado"
              : "Documento deshabilitado",
          datos_anteriores: { estado: estadoActual },
          datos_nuevos: { estado: estadoRaw },
        });
        message =
          estadoRaw === "activo"
            ? "Documento habilitado correctamente"
            : "Documento deshabilitado correctamente";
      } else {
        message =
          estadoRaw === "activo"
            ? "El documento ya está activo"
            : "El documento ya está inactivo";
      }
      respuesta.estado = estadoRaw;
    }

    if (tieneDescargado) {
      const descargadoRaw = body.descargado === true || body.descargado === 1;
      const descargadoActual = Boolean(Number(existing[0].descargado));
      if (descargadoActual !== descargadoRaw) {
        await conn.query(
          `UPDATE documentos SET descargado = ?, fecha_actualizacion = NOW() WHERE id_documento = ?`,
          [descargadoRaw ? 1 : 0, id_documento],
        );
        await registrarHistorial(conn, {
          id_documento,
          accion: ACCION_HISTORIAL.CAMBIO_DESCARGADO,
          emp_id_actor: empIdActor,
          emp_nombre_actor: empNombreActor,
          detalle: descargadoRaw
            ? "Marcado como descargado"
            : "Marcado como pendiente de descarga",
          datos_anteriores: { descargado: descargadoActual },
          datos_nuevos: { descargado: descargadoRaw },
        });
        message = descargadoRaw
          ? "Marcado como descargado"
          : "Marcado como pendiente de descarga";
      } else {
        message = descargadoRaw
          ? "El documento ya estaba marcado como descargado"
          : "El documento ya estaba pendiente de descarga";
      }
      respuesta.descargado = descargadoRaw;
    }

    return NextResponse.json({
      success: true,
      message,
      data: respuesta,
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
    const documento = await obtenerDocumentoConArchivos(id_documento);

    if (!documento) {
      return NextResponse.json(
        { error: "Documento no encontrado" },
        { status: 404 },
      );
    }

    await registrarHistorial(conn, {
      id_documento,
      accion: ACCION_HISTORIAL.DOCUMENTO_ELIMINADO,
      detalle: `Eliminación del documento: ${documento.nombre_documento}`,
      datos_anteriores: {
        nomenclatura: documento.nomenclatura,
        nombre_documento: documento.nombre_documento,
        archivos: resumenArchivosHistorial(documento.archivos),
      },
    });

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
