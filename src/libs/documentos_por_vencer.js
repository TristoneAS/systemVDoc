import {
  DIAS_AVISO_RETENCION,
  RETENCION_AL_MAS_ACTUAL_FECHA,
} from "@/libs/tiempo_retencion";
import {
  cargarMapaAreas,
  enriquecerDocumentosConArea,
} from "@/libs/documentos_area";

export const VIGENCIA_RETENCION = {
  POR_VENCER: "por_vencer",
  VENCIDOS: "vencidos",
  TODOS: "todos",
};

export function normalizarVigenciaRetencion(raw) {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === VIGENCIA_RETENCION.VENCIDOS || s === "vencido") {
    return VIGENCIA_RETENCION.VENCIDOS;
  }
  if (s === VIGENCIA_RETENCION.TODOS || s === "ambos") {
    return VIGENCIA_RETENCION.TODOS;
  }
  return VIGENCIA_RETENCION.POR_VENCER;
}

/**
 * Documentos activos según vigencia de retención.
 * - por_vencer: entre hoy y hoy + dias
 * - vencidos: fecha de retención anterior a hoy
 * - todos: vencidos + por vencer (ventana de dias hacia adelante)
 */
export async function listarDocumentosRetencionPorVencer(
  connection,
  {
    dias = DIAS_AVISO_RETENCION,
    idArea = "",
    vigencia = VIGENCIA_RETENCION.POR_VENCER,
  } = {},
) {
  const diasNum = Math.max(
    1,
    Math.min(365, Number(dias) || DIAS_AVISO_RETENCION),
  );
  const vigenciaNorm = normalizarVigenciaRetencion(vigencia);

  const whereParts = [
    "d.estado = 'activo'",
    "d.tiempo_retencion IS NOT NULL",
    "d.tiempo_retencion <> ?",
  ];
  const params = [RETENCION_AL_MAS_ACTUAL_FECHA];

  if (vigenciaNorm === VIGENCIA_RETENCION.VENCIDOS) {
    whereParts.push("d.tiempo_retencion < CURDATE()");
  } else if (vigenciaNorm === VIGENCIA_RETENCION.POR_VENCER) {
    whereParts.push("d.tiempo_retencion >= CURDATE()");
    whereParts.push(
      "d.tiempo_retencion <= DATE_ADD(CURDATE(), INTERVAL ? DAY)",
    );
    params.push(diasNum);
  } else {
    whereParts.push(
      `(d.tiempo_retencion < CURDATE()
        OR (d.tiempo_retencion >= CURDATE()
            AND d.tiempo_retencion <= DATE_ADD(CURDATE(), INTERVAL ? DAY)))`,
    );
    params.push(diasNum);
  }

  const areaId = String(idArea ?? "").trim();
  if (areaId) {
    whereParts.push("d.id_area = ?");
    params.push(areaId);
  }

  const [rows] = await connection.query(
    `SELECT d.*,
       DATEDIFF(d.tiempo_retencion, CURDATE()) AS dias_restantes,
       (SELECT COUNT(*)
        FROM archivos_documentos ad
        WHERE ad.id_documento = d.id_documento) AS total_archivos
     FROM documentos d
     WHERE ${whereParts.join(" AND ")}
     ORDER BY d.tiempo_retencion ASC, d.nomenclatura ASC`,
    params,
  );

  const mapaAreas = await cargarMapaAreas(connection);
  return enriquecerDocumentosConArea(rows, mapaAreas);
}
