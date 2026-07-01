import { NextResponse } from "next/server";
import { conn } from "@/libs/system_v_docs";
import { getNextIdDocumento } from "@/libs/next_id_documento";
import { resolveIdAreaRequerido } from "@/libs/id_area";
import { optionalVarchar200 } from "@/libs/optional_varchar200";
import { parseOptionalFechaRetencion } from "@/libs/tiempo_retencion";
import {
  existeNomenclaturaDocumento,
  ERROR_NOMENCLATURA_YA_REGISTRADA,
  normalizarNomenclatura,
} from "@/libs/nomenclatura_documento";
import {
  validarArchivosAdjuntos,
  asignarNombresArchivosDocumento,
} from "@/libs/archivos_adjuntos";
import { obtenerDocumentoConArchivos } from "@/libs/documento_detalle";
import {
  cargarMapaAreas,
  enriquecerDocumentosConArea,
} from "@/libs/documentos_area";
import {
  ACCION_HISTORIAL,
  registrarHistorial,
  resumenArchivosHistorial,
} from "@/libs/historial_archivos";
import {
  buildRutaArchivoPublica,
  buildRutaCarpetaPublica,
  ensureDocumentosDir,
  getCarpetaDocumentoFisica,
} from "@/libs/almacen_documentos";
import fs from "fs";
import path from "path";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id_documento = searchParams.get("id_documento");
    const nomenclatura = searchParams.get("nomenclatura");
    const estadoFiltro = String(searchParams.get("estado") || "")
      .trim()
      .toLowerCase();

    const filtroEstadoValido =
      estadoFiltro === "activo" || estadoFiltro === "inactivo";

    if (nomenclatura !== null && nomenclatura !== undefined) {
      const term = String(nomenclatura).trim();
      if (!term) {
        return NextResponse.json(
          { error: "Ingrese una nomenclatura para buscar" },
          { status: 400 },
        );
      }
      const whereParts = ["d.nomenclatura = ?"];
      const queryParams = [term];
      if (filtroEstadoValido) {
        whereParts.push("d.estado = ?");
        queryParams.push(estadoFiltro);
      } else {
        whereParts.push("d.estado = 'activo'");
      }
      const [documentos] = await conn.query(
        `SELECT d.*,
         (SELECT COUNT(*)
          FROM archivos_documentos ad
          WHERE ad.id_documento = d.id_documento) AS total_archivos
         FROM documentos d
         WHERE ${whereParts.join(" AND ")}
         ORDER BY d.fecha_creacion DESC`,
        queryParams,
      );
      const mapaAreas = await cargarMapaAreas(conn);
      return NextResponse.json({
        success: true,
        data: enriquecerDocumentosConArea(documentos, mapaAreas),
      });
    }

    if (id_documento) {
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
    } else {
      const whereClause = filtroEstadoValido ? " WHERE d.estado = ?" : "";
      const listParams = filtroEstadoValido ? [estadoFiltro] : [];
      const [documentos] = await conn.query(
        `SELECT d.*,
         (SELECT COUNT(*)
          FROM archivos_documentos ad
          WHERE ad.id_documento = d.id_documento) AS total_archivos
         FROM documentos d
         ${whereClause}
         ORDER BY d.fecha_creacion DESC`,
        listParams,
      );

      const mapaAreas = await cargarMapaAreas(conn);
      return NextResponse.json({
        success: true,
        data: enriquecerDocumentosConArea(documentos, mapaAreas),
      });
    }
  } catch (error) {
    console.error("Error al obtener documentos:", error);
    return NextResponse.json(
      {
        error: "Error al consultar la base de datos",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();

    const fecha_alta = formData.get("fecha_alta");
    const nomenclatura = normalizarNomenclatura(formData.get("nomenclatura"));
    const nombre_documento = formData.get("nombre_documento");
    const id_area_raw = formData.get("id_area");
    const tiempoRetencionRes = parseOptionalFechaRetencion(
      formData.get("tiempo_retencion"),
    );
    if (tiempoRetencionRes.error) {
      return NextResponse.json(
        { error: tiempoRetencionRes.error },
        { status: 400 },
      );
    }
    const tiempo_retencion = tiempoRetencionRes.value;
    const ubicacion_registro = optionalVarchar200(
      formData.get("ubicacion_registro"),
    );
    const archivos = formData
      .getAll("archivos")
      .filter((a) => a instanceof File && a.size > 0);

    const validacionArchivos = validarArchivosAdjuntos(archivos);
    if (!validacionArchivos.ok) {
      return NextResponse.json(
        { error: validacionArchivos.error },
        { status: 400 },
      );
    }

    if (!fecha_alta || !nomenclatura || !nombre_documento) {
      return NextResponse.json(
        { error: "fecha_alta, nomenclatura y nombre_documento son requeridos" },
        { status: 400 },
      );
    }

    const areaRes = await resolveIdAreaRequerido(id_area_raw);
    if (areaRes.error) {
      return NextResponse.json({ error: areaRes.error }, { status: 400 });
    }
    const { id_area } = areaRes;

    if (await existeNomenclaturaDocumento(conn, nomenclatura)) {
      return NextResponse.json(
        { error: ERROR_NOMENCLATURA_YA_REGISTRADA },
        { status: 409 },
      );
    }

    const id_documento = await getNextIdDocumento();

    const carpetaDocumento = getCarpetaDocumentoFisica(id_documento);
    ensureDocumentosDir(carpetaDocumento);

    // Guardar archivos y obtener sus rutas
    const archivosGuardados = [];
    const archivosValidos = archivos.filter(
      (archivo) => archivo instanceof File && archivo.size > 0,
    );
    const nombresArchivo = asignarNombresArchivosDocumento(archivosValidos, {
      nomenclatura,
      nombreDocumento: nombre_documento,
    });

    for (let i = 0; i < archivosValidos.length; i++) {
      const archivo = archivosValidos[i];
      const nombreArchivo = nombresArchivo[i];
      const buffer = Buffer.from(await archivo.arrayBuffer());
      const rutaArchivo = path.join(carpetaDocumento, nombreArchivo);

      // Guardar archivo en el sistema de archivos
      fs.writeFileSync(rutaArchivo, buffer);

      // Guardar información del archivo
      archivosGuardados.push({
        nombre_archivo: nombreArchivo,
        ruta_archivo: buildRutaArchivoPublica(id_documento, nombreArchivo),
        tipo_archivo: archivo.type || path.extname(nombreArchivo),
        tamano_archivo: archivo.size,
      });
    }

    // Guardar documento en la base de datos
    const estadoAlta = "activo";
    await conn.query(
      `INSERT INTO documentos
       (id_documento, fecha_alta, nomenclatura, nombre_documento, id_area,
        ruta_carpeta, fecha_creacion, fecha_actualizacion, estado,
        tiempo_retencion, ubicacion_registro)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)`,
      [
        id_documento,
        fecha_alta,
        nomenclatura,
        nombre_documento,
        id_area,
        buildRutaCarpetaPublica(id_documento),
        estadoAlta,
        tiempo_retencion,
        ubicacion_registro,
      ],
    );

    // Guardar información de archivos en la base de datos
    if (archivosGuardados.length > 0) {
      const valoresArchivos = archivosGuardados.map((archivo) => [
        id_documento,
        archivo.nombre_archivo,
        archivo.ruta_archivo,
        archivo.tipo_archivo,
        archivo.tamano_archivo,
      ]);

      await conn.query(
        `INSERT INTO archivos_documentos 
         (id_documento, nombre_archivo, ruta_archivo, tipo_archivo, tamano_archivo)
         VALUES ?`,
        [valoresArchivos],
      );
    }

    const empIdActor =
      String(formData.get("emp_id_actor") || formData.get("emp_id_solicitante") || "").trim() ||
      null;
    const empNombreActor =
      String(formData.get("emp_nombre_actor") || formData.get("solicitante") || "").trim() ||
      null;

    await registrarHistorial(conn, {
      id_documento,
      accion: ACCION_HISTORIAL.ALTA_DIRECTA,
      emp_id_actor: empIdActor,
      emp_nombre_actor: empNombreActor,
      detalle: `Alta directa: ${nombre_documento}`,
      datos_nuevos: {
        nomenclatura,
        nombre_documento,
        id_area,
        tiempo_retencion,
        ubicacion_registro,
        archivos: resumenArchivosHistorial(archivosGuardados),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Documento guardado correctamente",
      data: {
        id_documento,
        ruta_carpeta: buildRutaCarpetaPublica(id_documento),
        id_area,
        archivos: archivosGuardados.length,
      },
    });
  } catch (error) {
    console.error("Error al guardar documento:", error);
    console.error("Stack trace:", error.stack);
    return NextResponse.json(
      {
        error: "Error al guardar el documento",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
