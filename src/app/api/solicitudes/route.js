import { NextResponse } from "next/server";
import { conn } from "@/libs/system_v_docs";
import { empleados } from "@/libs/empleados";
import { getNextIdDocumento } from "@/libs/next_id_documento";
import { resolveIdAreaRequerido } from "@/libs/id_area";
import { crearAprobacionesSolicitud } from "@/libs/aprobaciones";
import fs from "fs";
import path from "path";

const UPLOAD_BASE = path.join(
  process.cwd(),
  "public",
  "uploads",
  "solicitudes",
);

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/** Tu tabla usa `motivo` VARCHAR(300) NOT NULL. */
const MOTIVO_SOLICITUD_MAX = 300;

function normalizeMotivoSolicitud(raw, fallbackSiVacio = "Sin descripción") {
  let s = String(raw ?? "").trim();
  if (!s) s = String(fallbackSiVacio ?? "").trim();
  if (!s) s = "Sin descripción";
  if (s.length > MOTIVO_SOLICITUD_MAX) {
    s = s.slice(0, MOTIVO_SOLICITUD_MAX);
  }
  return s;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const forEmpId = String(searchParams.get("for_emp_id") || "").trim();
    const solicitanteEmpId = String(
      searchParams.get("solicitante_emp_id") || "",
    ).trim();

    let sql = `SELECT * FROM solicitudes`;
    const sqlParams = [];
    if (solicitanteEmpId) {
      sql += ` WHERE TRIM(COALESCE(emp_id_solicitante, '')) = ?`;
      sqlParams.push(solicitanteEmpId);
    }
    sql += ` ORDER BY fecha_creacion DESC`;

    const [rows] = await conn.query(sql, sqlParams);

    const pendienteIds = rows
      .filter((r) => r.estado === "pendiente")
      .map((r) => r.id_solicitud);

    /** Solicitudes donde `forEmpId` tiene al menos una fila pendiente en `aprobaciones`. */
    const solicitudesDondePuedoActuar = new Set();
    if (forEmpId && pendienteIds.length > 0) {
      try {
        const placeholders = pendienteIds.map(() => "?").join(",");
        const [apRows] = await conn.query(
          `SELECT DISTINCT id_solicitud FROM aprobaciones
           WHERE id_solicitud IN (${placeholders})
             AND TRIM(emp_id) = ?
             AND status = 'pendiente'`,
          [...pendienteIds, forEmpId],
        );
        for (const row of apRows) {
          solicitudesDondePuedoActuar.add(row.id_solicitud);
        }
      } catch (e) {
        if (e?.code !== "ER_NO_SUCH_TABLE" && e?.errno !== 1146) {
          throw e;
        }
      }
    }

    const data = rows.map((r) => {
      const puedo =
        Boolean(forEmpId) &&
        r.estado === "pendiente" &&
        solicitudesDondePuedoActuar.has(r.id_solicitud);
      return {
        ...r,
        puede_aprobar: puedo,
        puede_rechazar: puedo,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error al listar solicitudes:", error);
    return NextResponse.json(
      {
        error: "Error al consultar solicitudes",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const tipo = formData.get("tipo");

    if (tipo === "nuevo") {
      const fecha_alta = formData.get("fecha_alta");
      const nomenclatura = formData.get("nomenclatura");
      const nombre_documento = formData.get("nombre_documento");
      const id_area_raw = formData.get("id_area");
      const emp_id_solicitante = String(
        formData.get("emp_id_solicitante") || "",
      ).trim();
      const solicitante = String(formData.get("solicitante") || "").trim();
      const archivos = formData.getAll("archivos");

      if (!fecha_alta || !nomenclatura || !nombre_documento) {
        return NextResponse.json(
          {
            error: "fecha_alta, nomenclatura y nombre_documento son requeridos",
          },
          { status: 400 },
        );
      }

      if (!emp_id_solicitante || !solicitante) {
        return NextResponse.json(
          {
            error:
              "emp_id_solicitante y solicitante son requeridos para crear aprobaciones",
          },
          { status: 400 },
        );
      }

      const areaRes = await resolveIdAreaRequerido(id_area_raw);
      if (areaRes.error) {
        return NextResponse.json({ error: areaRes.error }, { status: 400 });
      }
      const { id_area } = areaRes;

      const id_documento = await getNextIdDocumento();

      const motivoNorm = normalizeMotivoSolicitud(
        formData.get("motivo"),
        `Alta de nuevo documento: ${nombre_documento}`,
      );

      const [ins] = await conn.query(
        `INSERT INTO solicitudes
        (tipo, estado, id_documento, fecha_alta, emp_id_solicitante, solicitante,
         nomenclatura, nombre_documento, id_area, motivo, status)
        VALUES ('nuevo', 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
        [
          id_documento,
          fecha_alta,
          emp_id_solicitante,
          solicitante,
          nomenclatura,
          nombre_documento,
          id_area,
          motivoNorm,
        ],
      );

      const id_solicitud = ins.insertId;
      const carpeta = path.join(UPLOAD_BASE, "nuevo", String(id_solicitud));
      ensureDir(carpeta);

      const archivosGuardados = [];
      for (const archivo of archivos) {
        if (archivo instanceof File && archivo.size > 0) {
          const nombreArchivo = archivo.name;
          const buffer = Buffer.from(await archivo.arrayBuffer());
          fs.writeFileSync(path.join(carpeta, nombreArchivo), buffer);
          archivosGuardados.push({
            nombre_archivo: nombreArchivo,
            ruta_archivo: `/uploads/solicitudes/nuevo/${id_solicitud}/${nombreArchivo}`,
            tipo_archivo: archivo.type || path.extname(nombreArchivo),
            tamano_archivo: archivo.size,
          });
        }
      }

      const ruta_carpeta = `/uploads/solicitudes/nuevo/${id_solicitud}`;
      await conn.query(
        `UPDATE solicitudes SET ruta_carpeta = ?, archivos_json = ? WHERE id_solicitud = ?`,
        [ruta_carpeta, JSON.stringify(archivosGuardados), id_solicitud],
      );

      if (archivosGuardados.length === 0) {
        await conn.query(`DELETE FROM solicitudes WHERE id_solicitud = ?`, [
          id_solicitud,
        ]);
        if (fs.existsSync(carpeta)) {
          fs.rmSync(carpeta, { recursive: true, force: true });
        }
        return NextResponse.json(
          { error: "Debe adjuntar al menos un archivo" },
          { status: 400 },
        );
      }

      try {
        await crearAprobacionesSolicitud(conn, empleados, {
          solicitudId: id_solicitud,
          empIdSolicitante: emp_id_solicitante,
          idArea: id_area,
          idDocumento: id_documento,
        });
      } catch (e) {
        await conn.query(`DELETE FROM solicitudes WHERE id_solicitud = ?`, [
          id_solicitud,
        ]);
        if (fs.existsSync(carpeta)) {
          fs.rmSync(carpeta, { recursive: true, force: true });
        }
        return NextResponse.json(
          { error: e.message || "Error al crear aprobaciones" },
          { status: 400 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Solicitud registrada. Pendiente de aprobación.",
        data: { id_solicitud, id_documento },
      });
    }

    if (tipo === "cambio") {
      const id_documento = formData.get("id_documento");
      const motivo = formData.get("motivo");
      const emp_id_solicitante = formData.get("emp_id_solicitante");
      const solicitante = formData.get("solicitante");
      const id_area_raw = formData.get("id_area");
      const nomenclatura = formData.get("nomenclatura") || "";
      const nombre_documento = formData.get("nombre_documento") || "";

      if (!id_documento || !String(motivo || "").trim()) {
        return NextResponse.json(
          { error: "Documento y motivo del cambio son requeridos" },
          { status: 400 },
        );
      }
      if (!emp_id_solicitante || !solicitante) {
        return NextResponse.json(
          { error: "Datos del solicitante son requeridos" },
          { status: 400 },
        );
      }

      const archivos = formData.getAll("archivos");

      const motivoNorm = normalizeMotivoSolicitud(motivo);

      const [ins] = await conn.query(
        `INSERT INTO solicitudes
        (tipo, estado, id_documento, fecha_alta, emp_id_solicitante, solicitante,
         nomenclatura, nombre_documento, id_area, motivo, status)
        VALUES ('cambio', 'pendiente', ?, CURDATE(), ?, ?, ?, ?, ?, ?, 'pendiente')`,
        [
          id_documento,
          emp_id_solicitante,
          solicitante,
          nomenclatura || null,
          nombre_documento || null,
          id_area_raw || null,
          motivoNorm,
        ],
      );

      const id_solicitud = ins.insertId;
      const carpeta = path.join(UPLOAD_BASE, "cambio", String(id_solicitud));
      ensureDir(carpeta);

      const archivosGuardados = [];
      for (const archivo of archivos) {
        if (archivo instanceof File && archivo.size > 0) {
          const nombreArchivo = archivo.name;
          const buffer = Buffer.from(await archivo.arrayBuffer());
          fs.writeFileSync(path.join(carpeta, nombreArchivo), buffer);
          archivosGuardados.push({
            nombre_archivo: nombreArchivo,
            ruta_archivo: `/uploads/solicitudes/cambio/${id_solicitud}/${nombreArchivo}`,
            tipo_archivo: archivo.type || path.extname(nombreArchivo),
            tamano_archivo: archivo.size,
          });
        }
      }

      const ruta_carpeta = `/uploads/solicitudes/cambio/${id_solicitud}`;
      await conn.query(
        `UPDATE solicitudes SET ruta_carpeta = ?, archivos_json = ? WHERE id_solicitud = ?`,
        [ruta_carpeta, JSON.stringify(archivosGuardados), id_solicitud],
      );

      if (archivosGuardados.length === 0) {
        await conn.query(`DELETE FROM solicitudes WHERE id_solicitud = ?`, [
          id_solicitud,
        ]);
        if (fs.existsSync(carpeta)) {
          fs.rmSync(carpeta, { recursive: true, force: true });
        }
        return NextResponse.json(
          { error: "Debe adjuntar al menos un archivo" },
          { status: 400 },
        );
      }

      try {
        await crearAprobacionesSolicitud(conn, empleados, {
          solicitudId: id_solicitud,
          empIdSolicitante: emp_id_solicitante,
          idArea: id_area_raw,
          idDocumento: id_documento,
        });
      } catch (e) {
        await conn.query(`DELETE FROM solicitudes WHERE id_solicitud = ?`, [
          id_solicitud,
        ]);
        if (fs.existsSync(carpeta)) {
          fs.rmSync(carpeta, { recursive: true, force: true });
        }
        return NextResponse.json(
          { error: e.message || "Error al crear aprobaciones" },
          { status: 400 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Solicitud de cambio registrada. Pendiente de aprobación.",
        data: { id_solicitud, id_documento },
      });
    }

    return NextResponse.json(
      { error: "Tipo de solicitud no válido" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error al registrar solicitud:", error);
    return NextResponse.json(
      { error: "Error al registrar la solicitud", details: error.message },
      { status: 500 },
    );
  }
}
