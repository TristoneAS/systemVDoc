"use client";

import { useEffect, useState } from "react";
import { ERROR_NOMENCLATURA_YA_REGISTRADA } from "@/libs/nomenclatura_documento";

export function useVerificarNomenclaturaDocumento(
  nomenclatura,
  { habilitado = true, debounceMs = 450 } = {},
) {
  const [verificando, setVerificando] = useState(false);
  const [yaRegistrada, setYaRegistrada] = useState(false);

  useEffect(() => {
    if (!habilitado) {
      setYaRegistrada(false);
      setVerificando(false);
      return undefined;
    }

    const term = String(nomenclatura ?? "").trim();
    if (!term) {
      setYaRegistrada(false);
      setVerificando(false);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setVerificando(true);
      try {
        const res = await fetch(
          `/api/documentos/verificar-nomenclatura?nomenclatura=${encodeURIComponent(term)}`,
        );
        const data = await res.json();
        if (!cancelled) {
          setYaRegistrada(Boolean(res.ok && data.existe));
        }
      } catch {
        if (!cancelled) setYaRegistrada(false);
      } finally {
        if (!cancelled) setVerificando(false);
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [nomenclatura, habilitado, debounceMs]);

  return {
    verificando,
    yaRegistrada,
    mensajeError: yaRegistrada ? ERROR_NOMENCLATURA_YA_REGISTRADA : "",
  };
}
