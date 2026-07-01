export const ERROR_NOMENCLATURA_YA_REGISTRADA =
  "Esta nomenclatura ya se encuentra registrada";

export function normalizarNomenclatura(raw) {
  return String(raw ?? "").trim().toUpperCase();
}

/** Indica si la nomenclatura ya existe en el catálogo de documentos. */
export async function existeNomenclaturaDocumento(connection, nomenclatura) {
  const term = normalizarNomenclatura(nomenclatura);
  if (!term) return false;

  const [rows] = await connection.query(
    `SELECT id_documento
     FROM documentos
     WHERE UPPER(TRIM(nomenclatura)) = ?
     LIMIT 1`,
    [term],
  );

  return rows.length > 0;
}
