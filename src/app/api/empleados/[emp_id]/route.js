import { NextResponse } from "next/server";
import { empleados } from "@/libs/empleados";

export async function GET(request, { params }) {
  try {
    // En Next.js 16, params puede ser una Promise, así que lo resolvemos
    const resolvedParams = await params;
    const emp_id = resolvedParams.emp_id;

    if (!emp_id) {
      return NextResponse.json(
        { error: "El número de empleado es requerido" },
        { status: 400 }
      );
    }

    console.log("Buscando empleado con ID:", emp_id);

    // Consultar la base de datos
    const [rows] = await empleados.query(
      "SELECT * FROM del_empleados WHERE emp_id = ?",
      [emp_id]
    );

    console.log("Resultados de la consulta:", rows);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 }
      );
    }

    const empleado = rows[0];
    return NextResponse.json({
      emp_id: empleado.emp_id,
      nombre: empleado.emp_nombre,
      emp_correo: empleado.emp_correo ?? null,
    });
  } catch (error) {
    console.error("Error al buscar empleado:", error);
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
