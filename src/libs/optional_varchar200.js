/** Normaliza texto opcional: trim, máx. 200 caracteres; null si queda vacío. */
export function optionalVarchar200(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  return s.length > 200 ? s.slice(0, 200) : s;
}
