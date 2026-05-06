import { NextResponse } from "next/server";
import { conn } from "@/libs/system_v_docs";

export async function GET() {
  try {
    console.log("Obteniendo lista de áreas");

    const [rows] = await conn.query(
      "SELECT id_area, area_nombre, emp_id, emp_correo, emp_nombre FROM areas WHERE estado = 'activo' ORDER BY area_nombre ASC",
    );

    console.log("Áreas encontradas:", rows.length);

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Error al obtener áreas:", error);
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

export async function POST(request) {
  try {
    const body = await request.json();
    const { area_nombre, emp_id, emp_nombre, emp_correo } = body;

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

    console.log("Guardando área:", {
      area_nombre,
      emp_id: empIdStr,
      emp_nombre: empNombreStr,
      emp_correo,
    });

    const [existing] = await conn.query(
      "SELECT id_area FROM areas WHERE area_nombre = ? AND estado = 'activo'",
      [area_nombre],
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Ya existe un área con este nombre" },
        { status: 409 },
      );
    }

    const [result] = await conn.query(
      "INSERT INTO areas (area_nombre, emp_id, emp_correo, emp_nombre) VALUES (?, ?, ?, ?)",
      [area_nombre, empIdStr, emp_correo ?? null, empNombreStr],
    );

    return NextResponse.json({
      success: true,
      message: "Área guardada correctamente",
      data: {
        id_area: result.insertId,
        area_nombre,
        emp_id: empIdStr,
        emp_correo: emp_correo ?? null,
        emp_nombre: empNombreStr,
      },
    });
  } catch (error) {
    console.error("Error al guardar área:", error);
    console.error("Stack trace:", error.stack);
    return NextResponse.json(
      {
        error: "Error al guardar el área",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
