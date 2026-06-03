import { NextResponse } from "next/server";
import { obtenerPreviewAprobadoresSolicitud } from "@/libs/preview_aprobadores_solicitud";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const empIdSolicitante = String(
      searchParams.get("emp_id_solicitante") || "",
    ).trim();
    const idArea = searchParams.get("id_area");
    const idDocumento = searchParams.get("id_documento");

    if (!empIdSolicitante) {
      return NextResponse.json(
        { error: "emp_id_solicitante es requerido" },
        { status: 400 },
      );
    }

    const data = await obtenerPreviewAprobadoresSolicitud({
      empIdSolicitante,
      idArea: idArea != null ? String(idArea) : "",
      idDocumento: idDocumento != null ? String(idDocumento) : "",
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error en preview aprobadores:", error);
    return NextResponse.json(
      {
        error: error.message || "No se pudo obtener el listado de aprobadores",
      },
      { status: 400 },
    );
  }
}
