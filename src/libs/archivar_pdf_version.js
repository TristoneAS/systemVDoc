import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const PDF_VERSION_RE = /^(.+)-v(\d+)\.pdf$/i;

export function esNombreArchivoPdf(nombreArchivo, tipoArchivo) {
  const tipo = String(tipoArchivo ?? "").toLowerCase();
  if (tipo.includes("pdf")) return true;
  return String(nombreArchivo ?? "").toLowerCase().endsWith(".pdf");
}

/** Base sin extensión .pdf del archivo activo (sin sufijo -vN). */
export function baseNombrePdfActivo(nombreArchivo) {
  const nombre = String(nombreArchivo ?? "").trim();
  return nombre.replace(/\.pdf$/i, "");
}

/** Siguiente número de versión según archivos `{base}-vN.pdf` en la carpeta. */
export function siguienteVersionPdf(carpeta, baseNombre) {
  const base = String(baseNombre ?? "").trim();
  if (!base || !fs.existsSync(carpeta)) return 1;

  let max = 0;
  for (const entry of fs.readdirSync(carpeta)) {
    const match = entry.match(PDF_VERSION_RE);
    if (!match) continue;
    if (match[1].toLowerCase() !== base.toLowerCase()) continue;
    const n = Number.parseInt(match[2], 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return max + 1;
}

export function nombrePdfVersionado(baseNombre, version) {
  return `${baseNombre}-v${version}.pdf`;
}

function buscarGhostscriptEnProgramFiles() {
  const raiz = "C:\\Program Files\\gs";
  if (!fs.existsSync(raiz)) return null;

  const versiones = fs
    .readdirSync(raiz)
    .filter((d) => fs.statSync(path.join(raiz, d)).isDirectory())
    .sort()
    .reverse();

  for (const dir of versiones) {
    const exe64 = path.join(raiz, dir, "bin", "gswin64c.exe");
    if (fs.existsSync(exe64)) return exe64;
    const exe32 = path.join(raiz, dir, "bin", "gswin32c.exe");
    if (fs.existsSync(exe32)) return exe32;
  }
  return null;
}

export function resolverGhostscriptBin() {
  const fromEnv = String(process.env.GHOSTSCRIPT_BIN ?? "").trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  const enProgramFiles = buscarGhostscriptEnProgramFiles();
  if (enProgramFiles) return enProgramFiles;

  const enPath = ["gswin64c", "gswin32c", "gs"];
  for (const cmd of enPath) {
    try {
      execFileSync(cmd, ["--version"], { stdio: "ignore" });
      return cmd;
    } catch {
      /* siguiente candidato */
    }
  }
  return null;
}

/**
 * Comprime PDF con Ghostscript (/ebook ≈ 150 dpi).
 * Si Ghostscript no está disponible, copia el archivo sin comprimir.
 */
export function comprimirPdfArchivo(origen, destino) {
  const gsBin = resolverGhostscriptBin();
  if (!gsBin) {
    console.warn(
      "[archivar_pdf] Ghostscript no encontrado; se archiva sin comprimir.",
    );
    fs.copyFileSync(origen, destino);
    return { comprimido: false };
  }

  const tmpDestino = `${destino}.tmp.pdf`;
  try {
    execFileSync(
      gsBin,
      [
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        "-dPDFSETTINGS=/ebook",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        `-sOutputFile=${tmpDestino}`,
        origen,
      ],
      { stdio: "ignore", timeout: 120_000 },
    );

    if (!fs.existsSync(tmpDestino) || fs.statSync(tmpDestino).size === 0) {
      throw new Error("Ghostscript no generó salida válida");
    }

    fs.renameSync(tmpDestino, destino);
    return { comprimido: true };
  } catch (error) {
    if (fs.existsSync(tmpDestino)) {
      try {
        fs.unlinkSync(tmpDestino);
      } catch {
        /* ignore */
      }
    }
    console.warn(
      "[archivar_pdf] Falló compresión; se archiva copia original:",
      error?.message ?? error,
    );
    fs.copyFileSync(origen, destino);
    return { comprimido: false };
  }
}

/**
 * Archiva PDFs activos como `{base}-vN.pdf` comprimidos.
 * Elimina archivos activos que no sean PDF.
 * No toca versiones `-vN` ya archivadas.
 */
export function archivarArchivosActivosAntesDeReemplazo(
  carpeta,
  nombresActivos,
  metaPorNombre = {},
) {
  if (!carpeta || !fs.existsSync(carpeta)) return [];

  const lista = Array.isArray(nombresActivos) ? nombresActivos : [];
  const archivados = [];

  for (const nombre of lista) {
    const nombreArchivo = String(nombre ?? "").trim();
    if (!nombreArchivo) continue;

    const rutaOrigen = path.join(carpeta, nombreArchivo);
    if (!fs.existsSync(rutaOrigen) || !fs.statSync(rutaOrigen).isFile()) {
      continue;
    }

    const meta = metaPorNombre[nombreArchivo] ?? {};
    const esPdf = esNombreArchivoPdf(nombreArchivo, meta.tipo_archivo);

    if (esPdf) {
      const base = baseNombrePdfActivo(nombreArchivo);
      const version = siguienteVersionPdf(carpeta, base);
      const nombreVersion = nombrePdfVersionado(base, version);
      const rutaDestino = path.join(carpeta, nombreVersion);

      const { comprimido } = comprimirPdfArchivo(rutaOrigen, rutaDestino);
      fs.unlinkSync(rutaOrigen);

      archivados.push({
        original: nombreArchivo,
        archivado: nombreVersion,
        version,
        comprimido,
      });
    } else {
      fs.unlinkSync(rutaOrigen);
    }
  }

  return archivados;
}
