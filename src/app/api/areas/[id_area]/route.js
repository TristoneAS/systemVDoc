import { NextResponse } from "next/server";
import { conn } from "@/libs/system_v_docs";

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const id_area = resolvedParams.id_area;

    if (!id_area) {
      return NextResponse.json(
        { error: "El ID del área es requerido" },
        { status: 400 },
      );
    }

    console.log("Obteniendo área con ID:", id_area);

    const [rows] = await conn.query(
      "SELECT id_area, area_nombre, emp_id, emp_correo, emp_nombre FROM areas WHERE id_area = ? AND estado = 'activo'",
      [id_area],
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Área no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Error al obtener área:", error);
    console.error("Stack trace:", error.stack);
    return NextResponse.json(
      {
        error: "Error al consultar la base de datos",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const resolvedParams = await params;
    const id_area = resolvedParams.id_area;
    const body = await request.json();
    const { area_nombre, emp_id, emp_nombre, emp_correo } = body;

    if (!id_area) {
      return NextResponse.json(
        { error: "El ID del área es requerido" },
        { status: 400 },
      );
    }

    if (!area_nombre || emp_id == null || String(emp_id).trim() === "") {
      return NextResponse.json(
        { error: "area_nombre y emp_id son requeridos" },
        { status: 400 },
      );
    }

    if (!emp_nombre || String(emp_nombre).trim() === "") {
      return NextResponse.json(
        { error: "emp_nombre es requerido" },
        { status: 400 },
      );
    }

    const empIdStr = String(emp_id).trim();
    const empNombreStr = String(emp_nombre).trim();

    console.log("Modificando área:", {
      id_area,
      area_nombre,
      emp_id: empIdStr,
      emp_nombre: empNombreStr,
      emp_correo,
    });

    const [existing] = await conn.query(
      "SELECT id_area FROM areas WHERE id_area = ? AND estado = 'activo'",
      [id_area],
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Área no encontrada" },
        { status: 404 },
      );
    }

    const [duplicate] = await conn.query(
      "SELECT id_area FROM areas WHERE area_nombre = ? AND id_area != ? AND estado = 'activo'",
      [area_nombre, id_area],
    );

    if (duplicate.length > 0) {
      return NextResponse.json(
        { error: "Ya existe otro área con este nombre" },
        { status: 409 },
      );
    }

    await conn.query(
      "UPDATE areas SET area_nombre = ?, emp_id = ?, emp_correo = ?, emp_nombre = ? WHERE id_area = ?",
      [area_nombre, empIdStr, emp_correo ?? null, empNombreStr, id_area],
    );

    return NextResponse.json({
      success: true,
      message: "Área modificada correctamente",
      data: {
        id_area,
        area_nombre,
        emp_id: empIdStr,
        emp_correo: emp_correo ?? null,
        emp_nombre: empNombreStr,
      },
    });
  } catch (error) {
    console.error("Error al modificar área:", error);
    console.error("Stack trace:", error.stack);
    return NextResponse.json(
      {
        error: "Error al modificar el área",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await params;
    const id_area = resolvedParams.id_area;

    if (!id_area) {
      return NextResponse.json(
        { error: "El ID del área es requerido" },
        { status: 400 },
      );
    }

    console.log("Eliminando área con ID:", id_area);

    const [existing] = await conn.query(
      "SELECT id_area, area_nombre FROM areas WHERE id_area = ? AND estado = 'activo'",
      [id_area],
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Área no encontrada" },
        { status: 404 },
      );
    }

    await conn.query("UPDATE areas SET estado = 'inactivo' WHERE id_area = ?", [
      id_area,
    ]);

    return NextResponse.json({
      success: true,
      message: `Área "${existing[0].area_nombre}" eliminada correctamente`,
    });
  } catch (error) {
    console.error("Error al eliminar área:", error);
    console.error("Stack trace:", error.stack);
    return NextResponse.json(
      {
        error: "Error al eliminar el área",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
