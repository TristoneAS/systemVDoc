import { NextResponse } from "next/server";
import { conn } from "@/libs/system_v_docs";
import {
  normalizeEmpId,
  actualizarEstadoSolicitudPorAprobaciones,
  STATUS_APROBACION_APROBADO,
  STATUS_APROBACION_RECHAZADO,
  obtenerAprobacionPendienteDelActor,
  requiereAprobacionJefePrevio,
  existeJefeDirectoAprobado,
  TIPO_APROBADOR_JEFE_DIRECTO,
} from "@/libs/aprobaciones";
import fs from "fs";
import path from "path";
import { optionalVarchar200 } from "@/libs/optional_varchar200";
import {
  notificarDemasAprobadoresTrasJefe,
  resolveAppBaseUrl,
} from "@/libs/notificar_aprobadores_solicitud";

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

const COMENTARIO_DECISION_MAX = 2000;

function normalizeComentarioDecision(raw) {
  const s = String(raw ?? "").trim();
  if (!s) {
    return {
      error: "Debe escribir un comentario con el motivo de su decisión.",
    };
  }
  return {
    value:
      s.length > COMENTARIO_DECISION_MAX
        ? s.slice(0, COMENTARIO_DECISION_MAX)
        : s,
  };
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

  const comentarioRes = normalizeComentarioDecision(body.comentario);
  if (comentarioRes.error) {
    return NextResponse.json({ error: comentarioRes.error }, { status: 400 });
  }
  const comentario = comentarioRes.value;

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

    let sol = rows[0];
    if (sol.estado !== "pendiente") {
      await connection.rollback();
      return NextResponse.json(
        { error: "La solicitud ya fue resuelta" },
        { status: 400 },
      );
    }

    const emp_id_actor = normalizeEmpId(body.emp_id_actor);

    if (accion === "rechazar") {
      if (!emp_id_actor) {
        await connection.rollback();
        return NextResponse.json(
          {
            error:
              "emp_id_actor es requerido para registrar el rechazo con su comentario",
          },
          { status: 400 },
        );
      }
      const filaPend = await obtenerAprobacionPendienteDelActor(
        connection,
        id_solicitud,
        emp_id_actor,
      );
      if (!filaPend) {
        await connection.rollback();
        return NextResponse.json(
          {
            error:
              "No tiene una aprobación pendiente para esta solicitud o ya registró su decisión.",
          },
          { status: 400 },
        );
      }
      if (
        requiereAprobacionJefePrevio(filaPend.tipo_aprobador) &&
        !(await existeJefeDirectoAprobado(connection, id_solicitud))
      ) {
        await connection.rollback();
        return NextResponse.json(
          {
            error:
              "Aún no puede actuar: debe aprobar primero el jefe directo del solicitante.",
          },
          { status: 400 },
        );
      }
      const [rejResult] = await connection.query(
        `UPDATE aprobaciones SET status = ?, comentario = ? WHERE id = ? AND status = 'pendiente'`,
        [STATUS_APROBACION_RECHAZADO, comentario, filaPend.id],
      );
      if (!rejResult.affectedRows) {
        await connection.rollback();
        return NextResponse.json(
          {
            error:
              "No tiene una aprobación pendiente para esta solicitud o ya registró su decisión.",
          },
          { status: 400 },
        );
      }
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

    if (!emp_id_actor) {
      await connection.rollback();
      return NextResponse.json(
        { error: "emp_id_actor es requerido para registrar una aprobación" },
        { status: 400 },
      );
    }

    const filaPend = await obtenerAprobacionPendienteDelActor(
      connection,
      id_solicitud,
      emp_id_actor,
    );
    if (!filaPend) {
      await connection.rollback();
      return NextResponse.json(
        {
          error:
            "No tiene una aprobación pendiente para esta solicitud o ya registró su visto bueno.",
        },
        { status: 400 },
      );
    }
    if (
      requiereAprobacionJefePrevio(filaPend.tipo_aprobador) &&
      !(await existeJefeDirectoAprobado(connection, id_solicitud))
    ) {
      await connection.rollback();
      return NextResponse.json(
        {
          error:
            "Aún no puede actuar: debe aprobar primero el jefe directo del solicitante.",
        },
        { status: 400 },
      );
    }

    const [updResult] = await connection.query(
      `UPDATE aprobaciones SET status = ?, comentario = ? WHERE id = ? AND status = 'pendiente'`,
      [STATUS_APROBACION_APROBADO, comentario, filaPend.id],
    );

    if (!updResult.affectedRows) {
      await connection.rollback();
      return NextResponse.json(
        {
          error:
            "No tiene una aprobación pendiente para esta solicitud o ya registró su visto bueno.",
        },
        { status: 400 },
      );
    }

    await actualizarEstadoSolicitudPorAprobaciones(connection, id_solicitud);

    const [solRefreshed] = await connection.query(
      `SELECT * FROM solicitudes WHERE id_solicitud = ?`,
      [id_solicitud],
    );
    sol = solRefreshed[0];

    if (sol.estado !== "aprobada") {
      await connection.commit();

      let notificacionCorreo = null;
      if (filaPend.tipo_aprobador === TIPO_APROBADOR_JEFE_DIRECTO) {
        try {
          notificacionCorreo = await notificarDemasAprobadoresTrasJefe(
            connection,
            id_solicitud,
            { appBaseUrl: resolveAppBaseUrl(request) },
          );
        } catch (mailErr) {
          console.error(
            "Error al notificar aprobadores tras jefe directo:",
            mailErr,
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: "Visto bueno registrado. Quedan aprobaciones pendientes.",
        notificacion_correo: notificacionCorreo,
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

      const tiempoIns = optionalVarchar200(sol.tiempo_retencion);
      const ubicIns = optionalVarchar200(sol.ubicacion_registro);

      await connection.query(
        `INSERT INTO documentos
        (id_documento, fecha_alta, nomenclatura, nombre_documento, id_area,
         ruta_carpeta, fecha_creacion, fecha_actualizacion, estado,
         tiempo_retencion, ubicacion_registro)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)`,
        [
          sol.id_documento,
          sol.fecha_alta,
          sol.nomenclatura,
          sol.nombre_documento,
          sol.id_area ?? null,
          `/uploads/documentos/${sol.id_documento}`,
          "activo",
          tiempoIns,
          ubicIns,
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

      await connection.query(
        `DELETE FROM archivos_documentos WHERE id_documento = ?`,
        [sol.id_documento],
      );

      const carpetaDestino = path.join(UPLOAD_DOCS, sol.id_documento);
      ensureDir(carpetaDestino);
      if (fs.existsSync(carpetaDestino)) {
        for (const name of fs.readdirSync(carpetaDestino)) {
          const fp = path.join(carpetaDestino, name);
          try {
            if (fs.statSync(fp).isFile()) fs.unlinkSync(fp);
          } catch {
            /* ignore */
          }
        }
      }

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

      const trCambio = optionalVarchar200(sol.tiempo_retencion);
      const urCambio = optionalVarchar200(sol.ubicacion_registro);
      if (trCambio !== null || urCambio !== null) {
        await connection.query(
          `UPDATE documentos SET
            tiempo_retencion = COALESCE(?, tiempo_retencion),
            ubicacion_registro = COALESCE(?, ubicacion_registro)
           WHERE id_documento = ?`,
          [trCambio, urCambio, sol.id_documento],
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
