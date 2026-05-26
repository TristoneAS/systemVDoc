import { NextResponse } from "next/server";
import { conn } from "@/libs/system_v_docs";

export async function GET(_request, { params }) {
  const resolved = await params;
  const id_solicitud = parseInt(resolved.id_solicitud, 10);
  if (Number.isNaN(id_solicitud)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const [rows] = await conn.query(
      `SELECT id, id_solicitud, emp_id, emp_nombre, emp_correo, status, tipo_aprobador, comentario
       FROM aprobaciones
       WHERE id_solicitud = ?
       ORDER BY id ASC`,
      [id_solicitud],
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error al listar aprobaciones:", error);
    if (error?.code === "ER_NO_SUCH_TABLE" || error?.errno === 1146) {
      return NextResponse.json(
        {
          error:
            "No existe la tabla aprobaciones. Ejecute database/create_aprobaciones_table.sql.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error: "Error al consultar aprobaciones",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
