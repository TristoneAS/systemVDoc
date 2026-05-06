import { NextResponse } from "next/server";
import { conn } from "@/libs/system_v_docs";

export async function GET() {
  try {
    console.log("Obteniendo lista de aprobadores");

    // Consultar todos los aprobadores
    const [rows] = await conn.query(
      "SELECT emp_id, emp_nombre, emp_correo FROM aprobadores ORDER BY emp_nombre ASC"
    );

    console.log("Aprobadores encontrados:", rows.length);

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Error al obtener aprobadores:", error);
    console.error("Stack trace:", error.stack);
    return NextResponse.json(
      {
        error: "Error al consultar la base de datos",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { emp_id, emp_nombre, emp_correo } = body;

    if (!emp_id || !emp_nombre) {
      return NextResponse.json(
        { error: "emp_id y emp_nombre son requeridos" },
        { status: 400 }
      );
    }

    console.log("Guardando aprobador:", { emp_id, emp_nombre });

    // Verificar si el aprobador ya existe
    const [existing] = await conn.query(
      "SELECT emp_id FROM aprobadores WHERE emp_id = ?",
      [emp_id]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Este empleado ya está registrado como aprobador" },
        { status: 409 }
      );
    }

    // Insertar el nuevo aprobador
    await conn.query(
      "INSERT INTO aprobadores (emp_id, emp_nombre, emp_correo) VALUES (?, ?, ?)",
      [emp_id, emp_nombre, emp_correo ?? null]
    );

    return NextResponse.json({
      success: true,
      message: "Aprobador guardado correctamente",
      data: { emp_id, emp_nombre, emp_correo: emp_correo ?? null },
    });
  } catch (error) {
    console.error("Error al guardar aprobador:", error);
    console.error("Stack trace:", error.stack);
    return NextResponse.json(
      {
        error: "Error al guardar el aprobador",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
