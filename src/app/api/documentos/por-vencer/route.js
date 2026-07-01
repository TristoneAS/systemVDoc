import { NextResponse } from "next/server";
import { conn } from "@/libs/system_v_docs";
import { empleados } from "@/libs/empleados";
import { listarDocumentosRetencionPorVencer } from "@/libs/documentos_por_vencer";
import { DIAS_AVISO_RETENCION } from "@/libs/tiempo_retencion";
import { resolverAreaPorJerarquiaJefe } from "@/libs/area_por_jerarquia";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const empId = String(searchParams.get("emp_id") || "").trim();
    const isAdmin =
      searchParams.get("is_admin") === "true" ||
      searchParams.get("is_admin") === "1";
    let idArea = String(searchParams.get("id_area") || "").trim();
    const diasRaw = searchParams.get("dias");
    const dias = diasRaw != null ? parseInt(diasRaw, 10) : DIAS_AVISO_RETENCION;
    const vigencia = searchParams.get("vigencia") || "";

    let areaAsignada = null;
    let sinArea = false;
    let filtradoPorArea = false;

    if (!isAdmin) {
      if (!empId) {
        return NextResponse.json(
          {
            error:
              "No se recibió emp_id del usuario. Vuelva a iniciar sesión.",
          },
          { status: 400 },
        );
      }

      areaAsignada = await resolverAreaPorJerarquiaJefe(empleados, conn, empId);

      if (!areaAsignada?.id_area) {
        sinArea = true;
        return NextResponse.json({
          success: true,
          data: [],
          dias: Number.isNaN(dias) ? DIAS_AVISO_RETENCION : dias,
          area_asignada: null,
          sin_area: true,
          filtrado_por_area: false,
        });
      }

      idArea = String(areaAsignada.id_area);
      filtradoPorArea = true;
    } else if (idArea) {
      filtradoPorArea = true;
    }

    const data = await listarDocumentosRetencionPorVencer(conn, {
      dias: Number.isNaN(dias) ? DIAS_AVISO_RETENCION : dias,
      idArea,
      vigencia,
    });

    return NextResponse.json({
      success: true,
      data,
      dias: Number.isNaN(dias) ? DIAS_AVISO_RETENCION : dias,
      vigencia,
      area_asignada: areaAsignada,
      sin_area: sinArea,
      filtrado_por_area: filtradoPorArea,
    });
  } catch (error) {
    console.error("Error al listar documentos por vencer retención:", error);
    return NextResponse.json(
      { error: "Error al consultar documentos por vencer" },
      { status: 500 },
    );
  }
}
