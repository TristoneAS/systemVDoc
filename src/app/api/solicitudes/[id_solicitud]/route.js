import { NextResponse } from "next/server";
import { conn } from "@/libs/system_v_docs";
import fs from "fs";
import path from "path";

const UPLOAD_DOCS = path.join(process.cwd(), "public", "uploads", "documentos");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function publicPathFromUrl(ruta) {
  const rel = String(ruta || "").replace(/^\//, "");
  return path.join(process.cwd(), "public", rel);
}

function normalizeArchivosJson(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function PATCH(request, { params }) {
  const resolved = await params;
  const id_solicitud = parseInt(resolved.id_solicitud, 10);
  if (Number.isNaN(id_solicitud)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
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

  const accion = body.accion;
  if (accion !== "aprobar" && accion !== "rechazar") {
    return NextResponse.json(
      { error: "accion debe ser aprobar o rechazar" },
      { status: 400 },
    );
  }

  const connection = await conn.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT * FROM solicitudes WHERE id_solicitud = ? FOR UPDATE`,
      [id_solicitud],
    );

    if (rows.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: "Solicitud no encontrada" },
        { status: 404 },
      );
    }

    const sol = rows[0];
    if (sol.estado !== "pendiente") {
      await connection.rollback();
      return NextResponse.json(
        { error: "La solicitud ya fue resuelta" },
        { status: 400 },
      );
    }

    if (accion === "rechazar") {
      await connection.query(
        `UPDATE solicitudes SET estado = 'rechazada', fecha_resolucion = NOW() WHERE id_solicitud = ?`,
        [id_solicitud],
      );
      await connection.commit();
      return NextResponse.json({
        success: true,
        message: "Solicitud rechazada",
      });
    }

    const archivosJson = normalizeArchivosJson(sol.archivos_json);
    if (archivosJson.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: "La solicitud no tiene archivos adjuntos" },
        { status: 400 },
      );
    }

    if (sol.tipo === "nuevo") {
      const [exists] = await connection.query(
        `SELECT id_documento FROM documentos WHERE id_documento = ?`,
        [sol.id_documento],
      );
      if (exists.length > 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "Ya existe un documento con ese ID" },
          { status: 409 },
        );
      }

      const carpetaDestino = path.join(UPLOAD_DOCS, sol.id_documento);
      ensureDir(carpetaDestino);

      const valoresArchivos = [];
      for (const a of archivosJson) {
        const src = publicPathFromUrl(a.ruta_archivo);
        if (!fs.existsSync(src)) {
          await connection.rollback();
          return NextResponse.json(
            { error: `Archivo faltante en servidor: ${a.nombre_archivo}` },
            { status: 500 },
          );
        }
        const dest = path.join(carpetaDestino, a.nombre_archivo);
        fs.copyFileSync(src, dest);
        const rutaRel = `/uploads/documentos/${sol.id_documento}/${a.nombre_archivo}`;
        valoresArchivos.push([
          sol.id_documento,
          a.nombre_archivo,
          rutaRel,
          a.tipo_archivo,
          a.tamano_archivo,
        ]);
      }

      await connection.query(
        `INSERT INTO documentos
        (id_documento, fecha_alta, nomenclatura, nombre_documento, id_area,
         ruta_carpeta, fecha_creacion, fecha_actualizacion, estado)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
        [
          sol.id_documento,
          sol.fecha_alta,
          sol.nomenclatura,
          sol.nombre_documento,
          sol.id_area ?? null,
          `/uploads/documentos/${sol.id_documento}`,
          "activo",
        ],
      );

      if (valoresArchivos.length > 0) {
        await connection.query(
          `INSERT INTO archivos_documentos (id_documento, nombre_archivo, ruta_archivo, tipo_archivo, tamano_archivo) VALUES ?`,
          [valoresArchivos],
        );
      }
    } else if (sol.tipo === "cambio") {
      const [docRow] = await connection.query(
        `SELECT id_documento FROM documentos WHERE id_documento = ?`,
        [sol.id_documento],
      );
      if (docRow.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: "El documento a modificar ya no existe en el sistema" },
          { status: 400 },
        );
      }

      const carpetaDestino = path.join(UPLOAD_DOCS, sol.id_documento);
      ensureDir(carpetaDestino);

      const valoresArchivos = [];
      for (const a of archivosJson) {
        const src = publicPathFromUrl(a.ruta_archivo);
        if (!fs.existsSync(src)) {
          await connection.rollback();
          return NextResponse.json(
            { error: `Archivo faltante en servidor: ${a.nombre_archivo}` },
            { status: 500 },
          );
        }
        const dest = path.join(carpetaDestino, a.nombre_archivo);
        fs.copyFileSync(src, dest);
        const rutaRel = `/uploads/documentos/${sol.id_documento}/${a.nombre_archivo}`;
        valoresArchivos.push([
          sol.id_documento,
          a.nombre_archivo,
          rutaRel,
          a.tipo_archivo,
          a.tamano_archivo,
        ]);
      }

      if (valoresArchivos.length > 0) {
        await connection.query(
          `INSERT INTO archivos_documentos (id_documento, nombre_archivo, ruta_archivo, tipo_archivo, tamano_archivo) VALUES ?`,
          [valoresArchivos],
        );
      }
    }

    await connection.query(
      `UPDATE solicitudes SET estado = 'aprobada', fecha_resolucion = NOW() WHERE id_solicitud = ?`,
      [id_solicitud],
    );

    await connection.commit();
    return NextResponse.json({
      success: true,
      message:
        sol.tipo === "nuevo"
          ? "Solicitud aprobada: documento dado de alta"
          : "Solicitud aprobada: archivos incorporados al documento",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error al resolver solicitud:", error);
    return NextResponse.json(
      {
        error: "Error al procesar la solicitud",
        details: error.message,
      },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}
