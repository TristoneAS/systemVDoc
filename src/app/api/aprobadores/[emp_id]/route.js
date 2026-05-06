import { NextResponse } from "next/server";
import { conn } from "@/libs/system_v_docs";

export async function DELETE(request, { params }) {
  try {
    // En Next.js 16, params puede ser una Promise, así que lo resolvemos
    const resolvedParams = await params;
    const emp_id = resolvedParams.emp_id;

    if (!emp_id) {
      return NextResponse.json(
        { error: "El ID del empleado es requerido" },
        { status: 400 }
      );
    }

    console.log("Eliminando aprobador con ID:", emp_id);

    // Verificar si el aprobador existe
    const [existing] = await conn.query(
      "SELECT emp_id, emp_nombre FROM aprobadores WHERE emp_id = ?",
      [emp_id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Aprobador no encontrado" },
        { status: 404 }
      );
    }

    // Eliminar el aprobador
    await conn.query("DELETE FROM aprobadores WHERE emp_id = ?", [emp_id]);

    return NextResponse.json({
      success: true,
      message: "Aprobador eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar aprobador:", error);
    console.error("Stack trace:", error.stack);
    return NextResponse.json(
      {
        error: "Error al eliminar el aprobador",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

