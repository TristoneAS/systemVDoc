"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Divider,
  FormControlLabel,
  Switch,
  InputAdornment,
  Grid,
} from "@mui/material";
import {
  Archive,
  Check,
  Close,
  Download,
  Edit,
  InsertDriveFile,
  Visibility,
  Search,
} from "@mui/icons-material";
import HexagonMenu from "./HexagonMenu";
import EditarSolicitudRechazadaDialog from "./EditarSolicitudRechazadaDialog";
import {
  esEstadoObsoletaValor,
  filtrarSolicitudesPorObsoletas,
} from "@/libs/solicitudes_estado";
import {
  formatFechaRetencion,
  tieneValorRetencion,
} from "@/libs/tiempo_retencion";
import {
  obtenerBlobArchivoPorRutas,
  rutasCandidatasArchivoSolicitud,
} from "@/libs/archivos_adjuntos";
import { calcularPlazoRechazoAutomatico } from "@/libs/plazo_aprobacion_solicitud";

function formatFecha(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("es-MX");
  } catch {
    return String(v);
  }
}

/** archivos_json desde MySQL puede venir como objeto o string JSON */
export function parseArchivos(archivos_json) {
  if (!archivos_json) return [];
  if (Array.isArray(archivos_json)) return archivos_json;
  if (typeof archivos_json === "string") {
    try {
      const p = JSON.parse(archivos_json);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatTamano(bytes) {
  if (bytes == null || Number.isNaN(Number(bytes))) return "";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function esArchivoPdf(archivo) {
  const tipo = String(archivo?.tipo_archivo ?? "").toLowerCase();
  if (tipo.includes("pdf")) return true;
  const nombre = String(archivo?.nombre_archivo ?? "").toLowerCase();
  return nombre.endsWith(".pdf");
}

function TextoPlazoRechazoAutomatico({ estado, fechaCreacion }) {
  if (String(estado ?? "").trim().toLowerCase() !== "pendiente") {
    return (
      <Typography variant="caption" sx={{ color: "#9e9e9e" }}>
        —
      </Typography>
    );
  }

  const plazo = calcularPlazoRechazoAutomatico(fechaCreacion);
  if (!plazo) {
    return (
      <Typography variant="caption" sx={{ color: "#9e9e9e" }}>
        —
      </Typography>
    );
  }

  const { diasRestantes, fechaLimiteTexto, vencido, urgente } = plazo;
  let lineaDias;
  if (vencido) {
    lineaDias = "Plazo vencido";
  } else if (diasRestantes === 1) {
    lineaDias = "Queda 1 día natural";
  } else {
    lineaDias = `Quedan ${diasRestantes} días naturales`;
  }

  const color = vencido ? "#C62828" : urgente ? "#E65100" : "#616161";

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{
          color,
          display: "block",
          fontWeight: vencido || urgente ? 600 : 500,
          lineHeight: 1.35,
        }}
      >
        {lineaDias}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: "#757575", display: "block", lineHeight: 1.35 }}
      >
        Límite: {fechaLimiteTexto}
      </Typography>
    </Box>
  );
}

function DetalleCampo({ label, children, fullWidth = false }) {
  return (
    <Box sx={{ minWidth: 0, gridColumn: fullWidth ? "1 / -1" : undefined }}>
      <Typography
        variant="caption"
        component="div"
        sx={{
          color: "#757575",
          fontWeight: 600,
          letterSpacing: "0.02em",
          mb: 0.35,
        }}
      >
        {label}
      </Typography>
      <Box sx={{ color: "#212121", fontSize: "0.875rem", lineHeight: 1.45 }}>
        {children}
      </Box>
    </Box>
  );
}

function AlertaPlazoAprobacion({ estado, fechaCreacion }) {
  if (String(estado ?? "").trim().toLowerCase() !== "pendiente") {
    return null;
  }

  const plazo = calcularPlazoRechazoAutomatico(fechaCreacion);
  if (!plazo) return null;

  const { diasRestantes, fechaLimiteTexto, vencido, urgente } = plazo;
  let lineaDias;
  if (vencido) {
    lineaDias = "Plazo vencido";
  } else if (diasRestantes === 1) {
    lineaDias = "Queda 1 día natural";
  } else {
    lineaDias = `Quedan ${diasRestantes} días naturales`;
  }

  const severity = vencido ? "error" : urgente ? "warning" : "info";

  return (
    <Alert severity={severity} sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
        Plazo de aprobación · {lineaDias}
      </Typography>
      <Typography variant="body2" sx={{ color: "inherit", opacity: 0.95 }}>
        Fecha límite: <strong>{fechaLimiteTexto}</strong>
      </Typography>
      <Typography variant="caption" sx={{ display: "block", mt: 0.75, opacity: 0.9 }}>
        Si no se aprueba a tiempo, la solicitud se rechazará en automático.
      </Typography>
    </Alert>
  );
}

function DetalleSolicitudPanel({ solicitud }) {
  if (!solicitud) return null;

  const muestraRetencion =
    tieneValorRetencion(solicitud.tiempo_retencion) ||
    Boolean(String(solicitud.ubicacion_registro ?? "").trim());

  return (
    <Box sx={{ mb: 2 }}>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          borderColor: "rgba(25, 118, 210, 0.18)",
          bgcolor: "#FAFCFF",
        }}
      >
        <Stack
          direction="row"
          flexWrap="wrap"
          gap={1}
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Chip
            size="small"
            label={solicitud.tipo === "nuevo" ? "Nuevo documento" : "Cambio"}
            sx={{
              fontWeight: 600,
              bgcolor: "#E3F2FD",
              color: "#1565C0",
            }}
          />
          <Chip
            size="small"
            label={labelEstadoChip(solicitud.estado)}
            sx={{
              fontWeight: 600,
              color: "#fff",
              bgcolor: colorEstadoSolicitudChip(solicitud.estado),
            }}
          />
          {solicitud.id_documento ? (
            <Typography variant="caption" sx={{ color: "#757575", ml: "auto" }}>
              Doc. {solicitud.id_documento}
            </Typography>
          ) : null}
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <DetalleCampo label="Solicitante">
              {textoSolicitante(solicitud)}
            </DetalleCampo>
          </Grid>
          <Grid item xs={12} sm={6}>
            <DetalleCampo label="Fecha de registro">
              {formatFecha(solicitud.fecha_creacion)}
            </DetalleCampo>
          </Grid>
          {(solicitud.nomenclatura || solicitud.nombre_documento) && (
            <Grid item xs={12}>
              <DetalleCampo label="Documento">
                {[solicitud.nomenclatura, solicitud.nombre_documento]
                  .filter(Boolean)
                  .join(" · ")}
              </DetalleCampo>
            </Grid>
          )}
          {String(solicitud.motivo ?? "").trim() && (
            <Grid item xs={12}>
              <DetalleCampo label="Motivo">
                {String(solicitud.motivo).trim()}
              </DetalleCampo>
            </Grid>
          )}
        </Grid>
      </Paper>

      <AlertaPlazoAprobacion
        estado={solicitud.estado}
        fechaCreacion={solicitud.fecha_creacion}
      />

      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: muestraRetencion ? 2 : 0,
          borderRadius: 2,
          borderColor: "rgba(25, 118, 210, 0.14)",
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ color: "#1976D2", fontWeight: 700, mb: 1.25 }}
        >
          Documentos cargados
        </Typography>
        <ListaArchivosSolicitud
          archivos_json={solicitud.archivos_json}
          solicitud={solicitud}
        />
      </Paper>

      {muestraRetencion && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2,
            borderColor: "rgba(25, 118, 210, 0.14)",
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ color: "#1976D2", fontWeight: 700, mb: 1.25 }}
          >
            Retención y registro
          </Typography>
          <Grid container spacing={2}>
            {tieneValorRetencion(solicitud.tiempo_retencion) && (
              <Grid item xs={12} sm={6}>
                <DetalleCampo label="Fecha de retención">
                  {formatFechaRetencion(solicitud.tiempo_retencion)}
                </DetalleCampo>
              </Grid>
            )}
            {String(solicitud.ubicacion_registro ?? "").trim() && (
              <Grid item xs={12} sm={6}>
                <DetalleCampo label="Ubicación del registro">
                  {String(solicitud.ubicacion_registro).trim()}
                </DetalleCampo>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
    </Box>
  );
}

async function descargarArchivoSolicitud(rutaArchivo, nombreArchivo, solicitud) {
  const resultado = await obtenerBlobArchivoPorRutas(
    rutasCandidatasArchivoSolicitud(
      { ruta_archivo: rutaArchivo, nombre_archivo: nombreArchivo },
      solicitud,
    ),
  );
  if (!resultado) return;

  const blobUrl = URL.createObjectURL(resultado.blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = nombreArchivo || "archivo";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

/** Lista de archivos de una solicitud (modal o reutilizable). */
function ListaArchivosSolicitud({ archivos_json, solicitud = null }) {
  const [archivoPdfVisualizar, setArchivoPdfVisualizar] = useState(null);
  const [errorVisorPdf, setErrorVisorPdf] = useState("");
  const [cargandoPdf, setCargandoPdf] = useState(false);
  const blobUrlRef = useRef(null);
  const archivos = parseArchivos(archivos_json);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  const abrirVisorPdf = async (archivo) => {
    setErrorVisorPdf("");
    setCargandoPdf(true);
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setArchivoPdfVisualizar(null);

    const resultado = await obtenerBlobArchivoPorRutas(
      rutasCandidatasArchivoSolicitud(archivo, solicitud),
    );

    if (!resultado) {
      setErrorVisorPdf(
        "No se pudo cargar el PDF. Verifique que el archivo exista en el servidor.",
      );
      setCargandoPdf(false);
      return;
    }

    const blobUrl = URL.createObjectURL(resultado.blob);
    blobUrlRef.current = blobUrl;
    setArchivoPdfVisualizar({
      ...archivo,
      blobUrl,
      ruta_archivo: resultado.url,
    });
    setCargandoPdf(false);
  };

  const cerrarVisorPdf = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setArchivoPdfVisualizar(null);
    setErrorVisorPdf("");
    setCargandoPdf(false);
  };

  if (archivos.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "#757575" }}>
        No hay archivos adjuntos.
      </Typography>
    );
  }

  return (
    <>
      <Stack spacing={1} alignItems="stretch">
        {archivos.map((a, idx) => {
          const esPdf = esArchivoPdf(a);
          return (
            <Box
              key={`${a.nombre_archivo}-${idx}`}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                maxWidth: "100%",
                p: 1.25,
                borderRadius: 1.5,
                border: "1px solid rgba(25, 118, 210, 0.12)",
                bgcolor: "#FAFAFA",
              }}
            >
              <InsertDriveFile
                sx={{
                  fontSize: 18,
                  color: "#1976D2",
                  flexShrink: 0,
                  mt: 0.15,
                }}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "#616161",
                    fontSize: "0.8125rem",
                    wordBreak: "break-word",
                  }}
                  title={a.nombre_archivo}
                >
                  {a.nombre_archivo || "Archivo"}
                </Typography>
                {a.tamano_archivo != null && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "rgba(117, 117, 117, 0.72)",
                      display: "block",
                      mt: 0.25,
                    }}
                  >
                    {formatTamano(a.tamano_archivo)}
                  </Typography>
                )}
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.25,
                  flexShrink: 0,
                }}
              >
                {esPdf ? (
                  <Tooltip title="Ver PDF">
                    <IconButton
                      size="small"
                      onClick={() => abrirVisorPdf(a)}
                      sx={{ color: "#1976D2" }}
                      aria-label={`Ver ${a.nombre_archivo}`}
                    >
                      <Visibility sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="Descargar archivo">
                    <IconButton
                      size="small"
                      onClick={() =>
                        descargarArchivoSolicitud(
                          a.ruta_archivo,
                          a.nombre_archivo,
                          solicitud,
                        )
                      }
                      disabled={!a.ruta_archivo}
                      sx={{ color: "#1976D2" }}
                      aria-label={`Descargar ${a.nombre_archivo}`}
                    >
                      <Download sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          );
        })}
      </Stack>

      <Dialog
        open={!!archivoPdfVisualizar || cargandoPdf}
        onClose={cerrarVisorPdf}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            border: "1px solid rgba(25, 118, 210, 0.16)",
            borderRadius: 2,
            height: "85vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle
          component="div"
          sx={{
            color: "#1976D2",
            fontWeight: 600,
            fontSize: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            py: 1.5,
          }}
        >
          <Box
            component="span"
            sx={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {archivoPdfVisualizar?.nombre_archivo}
          </Box>
          <IconButton
            size="small"
            onClick={cerrarVisorPdf}
            sx={{ color: "#757575", flexShrink: 0 }}
            aria-label="Cerrar visor"
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{ flex: 1, p: 0, overflow: "hidden", minHeight: 0 }}
        >
          {cargandoPdf ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "60vh",
              }}
            >
              <CircularProgress sx={{ color: "#1976D2" }} />
            </Box>
          ) : archivoPdfVisualizar?.blobUrl ? (
            <iframe
              src={archivoPdfVisualizar.blobUrl}
              title={archivoPdfVisualizar.nombre_archivo}
              style={{
                width: "100%",
                height: "100%",
                minHeight: "60vh",
                border: "none",
              }}
            />
          ) : errorVisorPdf ? (
            <Box sx={{ p: 2 }}>
              <Alert severity="warning" sx={{ mb: 0 }}>
                {errorVisorPdf}
              </Alert>
            </Box>
          ) : (
            <Typography sx={{ p: 2, color: "#757575" }}>
              No hay ruta de archivo disponible.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1 }}>
          <Button
            onClick={cerrarVisorPdf}
            sx={{ color: "#1976D2", textTransform: "none" }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function getMiEmpId() {
  try {
    const raw = localStorage.getItem("infoUser");
    if (!raw) return "";
    const u = JSON.parse(raw);
    return u?.emp_id != null ? String(u.emp_id).trim() : "";
  } catch {
    return "";
  }
}

export function getIsAdmin() {
  try {
    return localStorage.getItem("isAdmin") === "true";
  } catch {
    return false;
  }
}

function esAprobacionPendiente(status) {
  return String(status || "")
    .toLowerCase()
    .trim() === "pendiente";
}

function tipoIncluye(tipoAprobador, tipoBuscado) {
  return String(tipoAprobador ?? "")
    .split(/[,+]/)
    .map((t) => t.trim())
    .includes(tipoBuscado);
}

function existeJefeDirectoAprobadoEnFilas(aprobaciones) {
  return (aprobaciones || []).some(
    (a) =>
      tipoIncluye(a.tipo_aprobador, "jefe_directo") &&
      String(a.status || "")
        .toLowerCase()
        .trim() === "aprobado",
  );
}

/** Admin puede registrar aprobación por ausencia respetando el orden (jefe primero). */
function adminPuedeAprobarAusencia(aprobacion, todasAprobaciones) {
  if (!esAprobacionPendiente(aprobacion.status)) return false;
  const tipo = String(aprobacion.tipo_aprobador ?? "").trim();
  if (tipoIncluye(tipo, "jefe_directo")) return true;
  if (
    tipoIncluye(tipo, "responsable_area") ||
    tipoIncluye(tipo, "forzado")
  ) {
    return existeJefeDirectoAprobadoEnFilas(todasAprobaciones);
  }
  return true;
}

/** Badges de estado: pastilla, texto blanco (referencia UI). */
const chipPillBase = {
  height: 28,
  borderRadius: 999,
  fontWeight: 600,
  fontSize: "0.75rem",
  "& .MuiChip-label": {
    px: 1.5,
    py: 0,
    color: "#ffffff",
  },
};

export function esEstadoRechazada(estado) {
  const e = String(estado || "")
    .toLowerCase()
    .trim();
  return e === "rechazada" || e === "rechazado";
}

export function esEstadoObsoleta(estado) {
  return esEstadoObsoletaValor(estado);
}

function labelEstadoChip(estado) {
  const e = String(estado || "").toLowerCase();
  if (e === "aprobada" || e === "aprobado") return "Aprobado";
  if (e === "rechazada" || e === "rechazado") return "Rechazado";
  if (e === "obsoleta") return "Obsoleta";
  if (e === "pendiente") return "Pendiente";
  return estado || "—";
}

function colorEstadoSolicitudChip(estado) {
  const e = String(estado || "").toLowerCase();
  if (e === "pendiente") return "#FB8500";
  if (e === "aprobada" || e === "aprobado") return "#1B5E20";
  if (e === "rechazada" || e === "rechazado") return "#C62828";
  if (e === "obsoleta") return "#5D4037";
  return "#757575";
}

function buildSolicitudesListUrl({ misSolicitudes, empId, mostrarObsoletas }) {
  const params = new URLSearchParams();
  if (misSolicitudes && empId) {
    params.set("solicitante_emp_id", empId);
  } else if (empId) {
    params.set("for_emp_id", empId);
  }
  if (mostrarObsoletas) {
    params.set("mostrar_obsoletas", "true");
  }
  const q = params.toString();
  return q ? `/api/solicitudes?${q}` : "/api/solicitudes";
}

function backgroundEstadoAprobacion(status) {
  const s = String(status || "")
    .toLowerCase()
    .trim();
  if (s === "pendiente") return "#FB8500";
  if (s === "aprobada" || s === "aprobado") return "#1B5E20";
  if (s === "rechazada" || s === "rechazado") return "#C62828";
  return "#757575";
}

function labelTipoAprobador(tipo) {
  const tipos = String(tipo ?? "")
    .split(/[,+]/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tipos.length === 0) return "—";
  const labels = tipos.map((t) => {
    if (t === "jefe_directo") return "Jefe directo";
    if (t === "responsable_area") return "Responsable de área";
    if (t === "forzado") return "Requerido";
    return t;
  });
  return [...new Set(labels)].join(", ");
}

/**
 * Al crear una solicitud: emp_id y emp_nombre desde `infoUser` (localStorage).
 */
export function getSolicitanteParaSolicitud() {
  try {
    const raw = localStorage.getItem("infoUser");
    if (!raw) return { emp_id_solicitante: "", solicitante: "" };
    const u = JSON.parse(raw);
    const emp_id_solicitante = u?.emp_id != null ? String(u.emp_id).trim() : "";
    const solicitante =
      u?.emp_nombre != null ? String(u.emp_nombre).trim() : "";
    return { emp_id_solicitante, solicitante };
  } catch {
    return { emp_id_solicitante: "", solicitante: "" };
  }
}

/** Texto para tabla / modal a partir de columnas de `solicitudes`. */
function textoSolicitante(r) {
  const nombre = String(r?.solicitante ?? "").trim();
  const emp =
    r?.emp_id_solicitante != null ? String(r.emp_id_solicitante).trim() : "";
  if (nombre && emp) return `${nombre} · ${emp}`;
  if (nombre) return nombre;
  if (emp) return emp;
  return "—";
}

function Solicitudes({ misSolicitudes = false }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState(null);
  const [banner, setBanner] = useState(null);
  const [sinEmpEnSesion, setSinEmpEnSesion] = useState(false);
  const [schemaFase2Pendiente, setSchemaFase2Pendiente] = useState(false);
  const [dialogAprobacionesOpen, setDialogAprobacionesOpen] = useState(false);
  const [dialogAprobacionesId, setDialogAprobacionesId] = useState(null);
  const [dialogAprobacionesRows, setDialogAprobacionesRows] = useState([]);
  const [dialogAprobacionesLoading, setDialogAprobacionesLoading] =
    useState(false);
  const [dialogAprobacionesError, setDialogAprobacionesError] = useState("");
  const [dialogAprobacionesSolicitud, setDialogAprobacionesSolicitud] =
    useState(null);
  const [resolverModalOpen, setResolverModalOpen] = useState(false);
  const [resolverModalAccion, setResolverModalAccion] = useState(null);
  const [resolverModalId, setResolverModalId] = useState(null);
  const [resolverComentario, setResolverComentario] = useState("");
  const [resolverComentarioError, setResolverComentarioError] = useState("");
  const [editarSolicitudOpen, setEditarSolicitudOpen] = useState(false);
  const [solicitudAEditar, setSolicitudAEditar] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminAusenciaLoadingId, setAdminAusenciaLoadingId] = useState(null);
  const [mostrarObsoletas, setMostrarObsoletas] = useState(false);
  const [busquedaSolicitud, setBusquedaSolicitud] = useState("");

  const rowsFiltradas = useMemo(() => {
    const term = String(busquedaSolicitud ?? "").trim().replace(/^#/, "");
    if (!term) return rows;
    return rows.filter((r) => String(r.id_solicitud ?? "").includes(term));
  }, [rows, busquedaSolicitud]);

  const hayFiltroSolicitud = Boolean(String(busquedaSolicitud ?? "").trim());

  const aplicarFilasListado = (data, mostrarObs) =>
    filtrarSolicitudesPorObsoletas(data.data || [], mostrarObs);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSinEmpEnSesion(false);
    setSchemaFase2Pendiente(false);
    try {
      const empId = getMiEmpId();
      if (misSolicitudes) {
        if (!empId) {
          setSinEmpEnSesion(true);
          setRows([]);
          return;
        }
        const url = buildSolicitudesListUrl({
          misSolicitudes: true,
          empId,
          mostrarObsoletas,
        });
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "No se pudieron cargar sus solicitudes");
          setRows([]);
          return;
        }
        setSchemaFase2Pendiente(Boolean(data.schema_fase2_pendiente));
        setRows(aplicarFilasListado(data, mostrarObsoletas));
        return;
      }

      const url = buildSolicitudesListUrl({
        misSolicitudes: false,
        empId,
        mostrarObsoletas,
      });
      if (!empId) setSinEmpEnSesion(true);

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudieron cargar las solicitudes");
        setRows([]);
        return;
      }
      setSchemaFase2Pendiente(Boolean(data.schema_fase2_pendiente));
      setRows(aplicarFilasListado(data, mostrarObsoletas));
    } catch (e) {
      setError("Error de conexión");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [misSolicitudes, mostrarObsoletas]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setIsAdmin(getIsAdmin());
  }, []);

  const abrirModalResolver = (id_solicitud, accion) => {
    const empId = getMiEmpId();
    if (!empId) {
      setBanner({
        severity: "error",
        text: "No hay número de empleado en la sesión. Vuelva a iniciar sesión.",
      });
      return;
    }
    setResolverModalId(id_solicitud);
    setResolverModalAccion(accion);
    setResolverComentario("");
    setResolverComentarioError("");
    setResolverModalOpen(true);
  };

  const cerrarModalResolver = () => {
    if (actionId !== null) return;
    setResolverModalOpen(false);
    setResolverModalId(null);
    setResolverModalAccion(null);
    setResolverComentario("");
    setResolverComentarioError("");
  };

  const resolver = async (id_solicitud, accion, comentario) => {
    const empId = getMiEmpId();
    if (!empId) {
      setBanner({
        severity: "error",
        text: "No hay número de empleado en la sesión. Vuelva a iniciar sesión.",
      });
      return;
    }
    setActionId(id_solicitud);
    setBanner(null);
    try {
      const res = await fetch(`/api/solicitudes/${id_solicitud}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion,
          emp_id_actor: empId,
          comentario,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({
          severity: "error",
          text: data.error || "Error al procesar",
        });
        return;
      }
      setBanner({
        severity: "success",
        text: data.message || "Listo",
      });
      await load();
    } catch (e) {
      setBanner({ severity: "error", text: "Error de conexión" });
    } finally {
      setActionId(null);
    }
  };

  const confirmarModalResolver = async () => {
    const texto = resolverComentario.trim();
    if (!texto) {
      setResolverComentarioError(
        "Indique el motivo de su decisión (comentario obligatorio).",
      );
      return;
    }
    setResolverComentarioError("");
    setResolverModalOpen(false);
    const id = resolverModalId;
    const acc = resolverModalAccion;
    setResolverModalId(null);
    setResolverModalAccion(null);
    setResolverComentario("");
    if (id != null && acc) {
      await resolver(id, acc, texto);
    }
  };

  const cargarAprobacionesModal = async (id_solicitud) => {
    setDialogAprobacionesError("");
    setDialogAprobacionesLoading(true);
    try {
      const res = await fetch(`/api/solicitudes/${id_solicitud}/aprobaciones`);
      const data = await res.json();
      if (!res.ok) {
        setDialogAprobacionesError(
          data.error || "No se pudieron cargar las aprobaciones",
        );
        return;
      }
      setDialogAprobacionesRows(Array.isArray(data.data) ? data.data : []);
    } catch {
      setDialogAprobacionesError("Error de conexión");
    } finally {
      setDialogAprobacionesLoading(false);
    }
  };

  const abrirAprobaciones = async (solicitud) => {
    const id_solicitud = solicitud.id_solicitud;
    setDialogAprobacionesOpen(true);
    setDialogAprobacionesId(id_solicitud);
    setDialogAprobacionesSolicitud(solicitud);
    setDialogAprobacionesRows([]);
    await cargarAprobacionesModal(id_solicitud);
  };

  const cerrarDialogAprobaciones = () => {
    setDialogAprobacionesOpen(false);
    setDialogAprobacionesId(null);
    setDialogAprobacionesSolicitud(null);
    setDialogAprobacionesRows([]);
    setDialogAprobacionesError("");
    setAdminAusenciaLoadingId(null);
  };

  const marcarSolicitudObsoleta = async (id_solicitud) => {
    if (
      !window.confirm(
        "¿Marcar esta solicitud como obsoleta? Dejará de mostrarse en el listado habitual.",
      )
    ) {
      return;
    }
    setActionId(id_solicitud);
    setBanner(null);
    try {
      const res = await fetch(`/api/solicitudes/${id_solicitud}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "marcar_obsoleta",
          is_admin: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({
          severity: "error",
          text: data.error || "No se pudo marcar como obsoleta",
        });
        return;
      }
      setBanner({
        severity: "success",
        text: data.message || "Solicitud marcada como obsoleta",
      });
      await load();
    } catch {
      setBanner({ severity: "error", text: "Error de conexión" });
    } finally {
      setActionId(null);
    }
  };

  const adminAprobarAusencia = async (id_aprobacion) => {
    const empId = getMiEmpId();
    if (!empId) {
      setBanner({
        severity: "error",
        text: "No hay número de empleado en la sesión. Vuelva a iniciar sesión.",
      });
      return;
    }
    if (!dialogAprobacionesId) return;

    setAdminAusenciaLoadingId(id_aprobacion);
    setBanner(null);
    try {
      const res = await fetch(
        `/api/solicitudes/${dialogAprobacionesId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accion: "aprobar_ausencia",
            is_admin: true,
            emp_id_actor: empId,
            id_aprobacion,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setBanner({
          severity: "error",
          text: data.error || "No se pudo registrar la aprobación por ausencia",
        });
        return;
      }
      setBanner({
        severity: "success",
        text: data.message || "Aprobación por ausencia registrada",
      });
      await load();
      const idSol = dialogAprobacionesId;
      const empIdList = getMiEmpId();
      const url = buildSolicitudesListUrl({
        misSolicitudes,
        empId: empIdList,
        mostrarObsoletas,
      });
      const resList = await fetch(url);
      const listData = await resList.json();
      if (resList.ok && Array.isArray(listData.data)) {
        const actualizada = listData.data.find((r) => r.id_solicitud === idSol);
        if (actualizada) {
          setDialogAprobacionesSolicitud(actualizada);
        }
      }
      await cargarAprobacionesModal(idSol);
    } catch {
      setBanner({ severity: "error", text: "Error de conexión" });
    } finally {
      setAdminAusenciaLoadingId(null);
    }
  };

  return (
    <HexagonMenu
      selectedItemId={misSolicitudes ? "mis_solicitudes" : "ver-solicitudes"}
    >
      <Paper
        elevation={6}
        sx={{
          p: 3,
          maxWidth: 1200,
          mx: "auto",
          backgroundColor: "#ffffff",
          border: "1px solid rgba(25, 118, 210, 0.16)",
          borderRadius: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{ color: "#1976D2", fontWeight: 700, mb: 1, textAlign: "center" }}
        >
          {misSolicitudes ? "Mis solicitudes" : "Solicitudes"}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "#757575", textAlign: "center", mb: 3 }}
        >
          {misSolicitudes ? (
            <>
              Consulte el estado de las solicitudes que usted ha creado. Use el
              icono del ojo para ver los documentos adjuntos y el avance de las
              aprobaciones. Si una solicitud fue rechazada, puede editarla y
              reenviarla; el flujo de aprobación reinicia con su jefe directo.
            </>
          ) : (
            <>
              En la primera fase solo puede aprobar el jefe directo del
              solicitante. En la segunda fase deben aprobar{" "}
              <strong>todos</strong> los empleados que están en el listado de
              aprobadores más el responsable del área del trámite; cada uno
              registra su visto bueno. Cuando todos hayan aprobado, el documento
              se da de alta o se incorporan los archivos al documento existente.
            </>
          )}
        </Typography>

        {schemaFase2Pendiente && !misSolicitudes && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Falta crear la tabla <strong>solicitud_aprobaciones_fase2</strong>{" "}
            en la base de datos. El listado se muestra, pero aprobar o rechazar
            en segunda fase fallará hasta ejecutar el script{" "}
            <strong>database/create_solicitud_aprobaciones_fase2.sql</strong> en
            la base configurada (p. ej. <code>v_docs</code>).
          </Alert>
        )}

        {sinEmpEnSesion && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {misSolicitudes ? (
              <>
                No se encontró su <strong>emp_id</strong> en la sesión. No se
                pueden listar sus solicitudes hasta que vuelva a iniciar sesión.
              </>
            ) : (
              <>
                No se encontró su <strong>emp_id</strong> en la sesión. Las
                acciones de aprobar o rechazar pueden no estar disponibles hasta
                que vuelva a iniciar sesión.
              </>
            )}
          </Alert>
        )}

        {banner && (
          <Alert
            severity={banner.severity}
            sx={{ mb: 2 }}
            onClose={() => setBanner(null)}
          >
            {banner.text}
          </Alert>
        )}

        <FormControlLabel
          control={
            <Switch
              checked={mostrarObsoletas}
              onChange={(e) => setMostrarObsoletas(e.target.checked)}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": { color: "#1976D2" },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  backgroundColor: "#1976D2",
                },
              }}
            />
          }
          label={
            <Typography variant="body2" sx={{ color: "#616161" }}>
              Mostrar obsoletas
            </Typography>
          }
          sx={{ mb: 2, ml: 0 }}
        />

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            alignItems: "center",
            mb: 2,
          }}
        >
          <TextField
            size="small"
            label="Buscar solicitud"
            placeholder="Número de solicitud, ej. 1 o #12"
            value={busquedaSolicitud}
            onChange={(e) => setBusquedaSolicitud(e.target.value)}
            sx={{
              flex: "1 1 220px",
              minWidth: 200,
              maxWidth: 360,
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#ffffff",
                fontSize: "0.875rem",
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: "#9E9E9E", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
          {hayFiltroSolicitud && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setBusquedaSolicitud("")}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                color: "#1976D2",
                borderColor: "rgba(25, 118, 210, 0.5)",
              }}
            >
              Limpiar
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: "#1976D2" }} />
          </Box>
        ) : (
          <TableContainer
            sx={{
              backgroundColor: "#ffffff",
              border: "1px solid rgba(0, 0, 0, 0.08)",
              borderRadius: 1,
            }}
          >
            <Table size="small" sx={{ borderCollapse: "collapse" }}>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: "#FAFAFA",
                    "& th": {
                      borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
                      color: "#212121",
                      fontWeight: 600,
                      fontSize: "0.8125rem",
                    },
                  }}
                >
                  <TableCell>ID</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>ID documento</TableCell>
                  <TableCell>Detalle</TableCell>
                  <TableCell>Quién realizó la solicitud</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Plazo aprobación</TableCell>
                  <TableCell align="right">Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rowsFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      sx={{ color: "#757575", border: 0 }}
                    >
                      {hayFiltroSolicitud
                        ? "No hay solicitudes que coincidan con la búsqueda."
                        : misSolicitudes
                          ? "No tiene solicitudes registradas a su nombre."
                          : "No hay solicitudes registradas."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rowsFiltradas.map((r) => {
                    const puedeAprobar = r.puede_aprobar === true;
                    const puedeRechazar = r.puede_rechazar === true;
                    return (
                      <TableRow
                        key={r.id_solicitud}
                        sx={{
                          backgroundColor: "#ffffff",
                          "&:last-child td": {
                            borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
                          },
                          "& td": {
                            color: "#212121",
                            borderColor: "rgba(0, 0, 0, 0.08)",
                            borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
                            verticalAlign: "middle",
                            fontSize: "0.875rem",
                          },
                        }}
                      >
                        <TableCell>
                          <Typography
                            component="span"
                            sx={{ fontWeight: 500, color: "#212121" }}
                          >
                            #{r.id_solicitud}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={r.tipo === "nuevo" ? "Nuevo" : "Cambio"}
                            sx={{
                              height: 26,
                              borderRadius: 999,
                              bgcolor: "#ECEFF1",
                              color: "#37474F",
                              fontWeight: 600,
                              fontSize: "0.72rem",
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={labelEstadoChip(r.estado)}
                            sx={{
                              ...chipPillBase,
                              backgroundColor: colorEstadoSolicitudChip(
                                r.estado,
                              ),
                            }}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 180,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {r.id_documento}
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 280,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {r.tipo === "cambio"
                            ? r.motivo || "—"
                            : r.nombre_documento || "—"}
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 260,
                            verticalAlign: "top",
                            py: 1.5,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#212121",
                              wordBreak: "break-word",
                            }}
                            title={textoSolicitante(r)}
                          >
                            {textoSolicitante(r)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {formatFecha(r.fecha_creacion)}
                        </TableCell>
                        <TableCell sx={{ minWidth: 140 }}>
                          <TextoPlazoRechazoAutomatico
                            estado={r.estado}
                            fechaCreacion={r.fecha_creacion}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 0.5,
                              justifyContent: "flex-end",
                              alignItems: "center",
                            }}
                          >
                            <Tooltip title="Ver solicitante, documentos y aprobaciones">
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={
                                    dialogAprobacionesLoading &&
                                    dialogAprobacionesId === r.id_solicitud
                                  }
                                  onClick={() => abrirAprobaciones(r)}
                                  sx={{ color: "#1976D2" }}
                                  aria-label="Ver detalle de la solicitud"
                                >
                                  {dialogAprobacionesLoading &&
                                  dialogAprobacionesId === r.id_solicitud ? (
                                    <CircularProgress
                                      size={22}
                                      thickness={5}
                                      sx={{ color: "#1976D2" }}
                                    />
                                  ) : (
                                    <Visibility sx={{ fontSize: 22 }} />
                                  )}
                                </IconButton>
                              </span>
                            </Tooltip>
                            {isAdmin && !esEstadoObsoleta(r.estado) && (
                              <Tooltip title="Marcar como obsoleta">
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={actionId !== null}
                                    onClick={() =>
                                      marcarSolicitudObsoleta(r.id_solicitud)
                                    }
                                    sx={{ color: "#5D4037" }}
                                    aria-label="Marcar solicitud como obsoleta"
                                  >
                                    {actionId === r.id_solicitud ? (
                                      <CircularProgress
                                        size={22}
                                        thickness={5}
                                        sx={{ color: "#5D4037" }}
                                      />
                                    ) : (
                                      <Archive sx={{ fontSize: 22 }} />
                                    )}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                            {misSolicitudes && esEstadoRechazada(r.estado) && (
                              <Tooltip title="Editar y reenviar a aprobación">
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={
                                      sinEmpEnSesion || actionId !== null
                                    }
                                    onClick={() => {
                                      setSolicitudAEditar(r);
                                      setEditarSolicitudOpen(true);
                                    }}
                                    sx={{ color: "#F57C00" }}
                                    aria-label="Editar solicitud rechazada"
                                  >
                                    <Edit sx={{ fontSize: 22 }} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                            {!misSolicitudes && (
                              <>
                                <Tooltip
                                  title={
                                    r.estado !== "pendiente"
                                      ? "Solo aplica a solicitudes pendientes"
                                      : !puedeAprobar
                                        ? "No tiene permiso para aprobar esta solicitud"
                                        : sinEmpEnSesion
                                          ? "Inicie sesión de nuevo"
                                          : "Aprobar solicitud"
                                  }
                                >
                                  <span>
                                    <IconButton
                                      size="small"
                                      disabled={
                                        r.estado !== "pendiente" ||
                                        actionId !== null ||
                                        !puedeAprobar ||
                                        sinEmpEnSesion
                                      }
                                      onClick={() =>
                                        abrirModalResolver(
                                          r.id_solicitud,
                                          "aprobar",
                                        )
                                      }
                                      sx={{
                                        color: "#2E7D32",
                                        "&.Mui-disabled": {
                                          color: "rgba(46, 125, 50, 0.28)",
                                        },
                                      }}
                                      aria-label="Aprobar solicitud"
                                    >
                                      {actionId === r.id_solicitud ? (
                                        <CircularProgress
                                          size={22}
                                          thickness={5}
                                          sx={{ color: "#2E7D32" }}
                                        />
                                      ) : (
                                        <Check sx={{ fontSize: 24 }} />
                                      )}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip
                                  title={
                                    r.estado !== "pendiente"
                                      ? "Solo aplica a solicitudes pendientes"
                                      : !puedeRechazar
                                        ? "No tiene permiso para rechazar esta solicitud"
                                        : sinEmpEnSesion
                                          ? "Inicie sesión de nuevo"
                                          : "Rechazar solicitud"
                                  }
                                >
                                  <span>
                                    <IconButton
                                      size="small"
                                      disabled={
                                        r.estado !== "pendiente" ||
                                        actionId !== null ||
                                        !puedeRechazar ||
                                        sinEmpEnSesion
                                      }
                                      onClick={() =>
                                        abrirModalResolver(
                                          r.id_solicitud,
                                          "rechazar",
                                        )
                                      }
                                      sx={{
                                        color: "#D32F2F",
                                        "&.Mui-disabled": {
                                          color: "rgba(211, 47, 47, 0.28)",
                                        },
                                      }}
                                      aria-label="Rechazar solicitud"
                                    >
                                      <Close sx={{ fontSize: 24 }} />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {!misSolicitudes && (
        <Dialog
          open={resolverModalOpen}
          onClose={cerrarModalResolver}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              border: "1px solid rgba(25, 118, 210, 0.16)",
              borderRadius: 2,
            },
          }}
        >
          <DialogTitle sx={{ color: "#1976D2", fontWeight: 700 }}>
            {resolverModalAccion === "rechazar"
              ? "Rechazar solicitud"
              : "Aprobar solicitud"}
          </DialogTitle>
          <DialogContent dividers>
            <Typography
              variant="body2"
              sx={{ color: "rgba(33, 33, 33, 0.88)", mb: 2 }}
            >
              Describa el motivo de su decisión. El comentario quedará
              registrado en la base de datos.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={4}
              label="Comentario"
              placeholder="Ej. Documentación incompleta / Conforme con el cambio propuesto…"
              value={resolverComentario}
              onChange={(e) => {
                setResolverComentario(e.target.value);
                if (resolverComentarioError) setResolverComentarioError("");
              }}
              error={Boolean(resolverComentarioError)}
              helperText={
                resolverComentarioError ||
                `Obligatorio. Máximo 2000 caracteres (${resolverComentario.length}/2000).`
              }
              inputProps={{ maxLength: 2000 }}
              sx={{
                "& .MuiOutlinedInput-root": { color: "#212121" },
                "& .MuiInputLabel-root": { color: "#757575" },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={cerrarModalResolver}
              disabled={actionId !== null}
              sx={{ color: "#757575", textTransform: "none" }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={confirmarModalResolver}
              disabled={actionId !== null}
              sx={{
                bgcolor:
                  resolverModalAccion === "rechazar" ? "#fef2f2" : "#E3F2FD",
                color:
                  resolverModalAccion === "rechazar" ? "#b91c1c" : "#1976D2",
                border:
                  resolverModalAccion === "rechazar"
                    ? "1px solid #fecaca"
                    : "1px solid #1976D2",
                textTransform: "none",
                "&:hover": {
                  bgcolor:
                    resolverModalAccion === "rechazar" ? "#fee2e2" : "#BBDEFB",
                },
              }}
            >
              {resolverModalAccion === "rechazar"
                ? "Confirmar rechazo"
                : "Confirmar aprobación"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Dialog
        open={dialogAprobacionesOpen}
        onClose={cerrarDialogAprobaciones}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            border: "1px solid rgba(25, 118, 210, 0.16)",
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ color: "#1976D2", fontWeight: 700 }}>
          Detalle de la solicitud
          {dialogAprobacionesId != null && (
            <Typography
              component="span"
              variant="body2"
              sx={{
                display: "block",
                mt: 0.5,
                fontWeight: 400,
                color: "#757575",
              }}
            >
              Solicitud #{dialogAprobacionesId}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <DetalleSolicitudPanel solicitud={dialogAprobacionesSolicitud} />
          {dialogAprobacionesSolicitud && <Divider sx={{ my: 2 }} />}
          <Typography
            variant="subtitle2"
            sx={{ color: "#757575", fontWeight: 600, mb: 1.5 }}
          >
            Aprobaciones
          </Typography>
          {isAdmin &&
            dialogAprobacionesSolicitud?.estado === "pendiente" &&
            !dialogAprobacionesLoading && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Como administrador puede aprobar en nombre de un aprobador
                ausente. El comentario quedará registrado como{" "}
                <strong>aprobado por ausencia</strong>. Respete el orden: primero
                jefe directo, luego el resto.
              </Alert>
            )}
          {dialogAprobacionesLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress sx={{ color: "#1976D2" }} />
            </Box>
          ) : dialogAprobacionesError ? (
            <Alert severity="error">{dialogAprobacionesError}</Alert>
          ) : dialogAprobacionesRows.length === 0 ? (
            <Typography sx={{ color: "#757575" }}>
              No hay registros de aprobación para esta solicitud.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: "#757575" }}>
                      ID
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#757575" }}>
                      Tipo
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#757575" }}>
                      Empleado
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#757575" }}>
                      Nombre
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#757575" }}>
                      Correo
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#757575" }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#757575" }}>
                      Comentario
                    </TableCell>
                    {isAdmin &&
                      dialogAprobacionesSolicitud?.estado === "pendiente" && (
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 600, color: "#757575" }}
                        >
                          Admin
                        </TableCell>
                      )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dialogAprobacionesRows.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell sx={{ color: "#1976D2" }}>{a.id}</TableCell>
                      <TableCell sx={{ color: "#616161" }}>
                        {labelTipoAprobador(a.tipo_aprobador)}
                      </TableCell>
                      <TableCell sx={{ color: "#1976D2" }}>
                        {a.emp_id}
                      </TableCell>
                      <TableCell sx={{ color: "#616161" }}>
                        {a.emp_nombre || "—"}
                      </TableCell>
                      <TableCell
                        sx={{ color: "#616161", wordBreak: "break-all" }}
                      >
                        {a.emp_correo || "—"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={labelEstadoChip(a.status)}
                          sx={{
                            ...chipPillBase,
                            backgroundColor: backgroundEstadoAprobacion(
                              a.status,
                            ),
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "#616161",
                          maxWidth: 220,
                          wordBreak: "break-word",
                          verticalAlign: "top",
                        }}
                      >
                        {a.comentario?.trim() ? a.comentario : "—"}
                      </TableCell>
                      {isAdmin &&
                        dialogAprobacionesSolicitud?.estado === "pendiente" && (
                          <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                            {adminPuedeAprobarAusencia(
                              a,
                              dialogAprobacionesRows,
                            ) ? (
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={adminAusenciaLoadingId !== null}
                                onClick={() => adminAprobarAusencia(a.id)}
                                sx={{
                                  textTransform: "none",
                                  fontSize: "0.72rem",
                                  color: "#1976D2",
                                  borderColor: "#1976D2",
                                  py: 0.25,
                                  px: 1,
                                }}
                              >
                                {adminAusenciaLoadingId === a.id ? (
                                  <CircularProgress
                                    size={18}
                                    sx={{ color: "#1976D2" }}
                                  />
                                ) : (
                                  "Aprobar por ausencia"
                                )}
                              </Button>
                            ) : esAprobacionPendiente(a.status) ? (
                              <Typography
                                variant="caption"
                                sx={{ color: "#757575" }}
                              >
                                Pendiente jefe
                              </Typography>
                            ) : null}
                          </TableCell>
                        )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={cerrarDialogAprobaciones}
            sx={{ color: "#1976D2", textTransform: "none" }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {misSolicitudes && (
        <EditarSolicitudRechazadaDialog
          open={editarSolicitudOpen}
          solicitud={solicitudAEditar}
          onClose={() => {
            setEditarSolicitudOpen(false);
            setSolicitudAEditar(null);
          }}
          onSuccess={(message) => {
            setBanner({
              severity: "success",
              text:
                message ||
                "Solicitud actualizada y reenviada. Pendiente de aprobación.",
            });
            load();
          }}
        />
      )}
    </HexagonMenu>
  );
}

export default Solicitudes;
