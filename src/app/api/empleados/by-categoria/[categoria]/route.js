import { NextResponse } from "next/server";
import { empleados } from "@/libs/empleados";

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const categoria = resolvedParams.categoria;

    if (!categoria) {
      return NextResponse.json(
        { error: "La categoría es requerida" },
        { status: 400 },
      );
    }

    console.log("Buscando empleados con categoría:", categoria);

    // Consultar empleados por categoría
    const [rows] = await empleados.query(
      "SELECT emp_id, emp_nombre FROM del_empleados WHERE emp_categoria = ? ORDER BY emp_nombre ASC",
      [categoria],
    );

    console.log("Empleados encontrados:", rows.length);

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Error al buscar empleados por categoría:", error);
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
