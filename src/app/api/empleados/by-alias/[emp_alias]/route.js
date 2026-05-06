import { NextResponse } from "next/server";
import { empleados } from "@/libs/empleados";

export async function GET(request, { params }) {
  try {
    // En Next.js 16, params puede ser una Promise, así que lo resolvemos
    const resolvedParams = await params;
    const emp_alias = resolvedParams.emp_alias;

    if (!emp_alias) {
      return NextResponse.json(
        { error: "El alias del empleado es requerido" },
        { status: 400 },
      );
    }

    console.log("Buscando empleado con alias:", emp_alias);

    // Consultar la base de datos - obtener todos los campos de la tabla del_empleados
    const [rows] = await empleados.query(
      "SELECT * FROM del_empleados WHERE emp_alias = ?",
      [emp_alias],
    );

    console.log("Resultados de la consulta:", rows.length);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 },
      );
    }

    const empleado = rows[0];
    return NextResponse.json({
      success: true,
      data: empleado,
    });
  } catch (error) {
    console.error("Error al buscar empleado:", error);
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
