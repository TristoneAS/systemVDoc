"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Link,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";
import { Check, Close, InsertDriveFile, Visibility } from "@mui/icons-material";
import HexagonMenu from "./HexagonMenu";

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
function parseArchivos(archivos_json) {
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

/** Lista de archivos de una solicitud (modal o reutilizable). */
function ListaArchivosSolicitud({ archivos_json }) {
  const archivos = parseArchivos(archivos_json);
  if (archivos.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "#757575" }}>
        No hay archivos adjuntos.
      </Typography>
    );
  }
  return (
    <Stack spacing={0.75} alignItems="flex-start">
      {archivos.map((a, idx) => (
        <Box
          key={`${a.nombre_archivo}-${idx}`}
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 0.5,
            maxWidth: "100%",
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
          <Box sx={{ minWidth: 0 }}>
            <Link
              href={a.ruta_archivo || "#"}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{
                color: "#616161",
                fontSize: "0.8125rem",
                wordBreak: "break-word",
                display: "block",
              }}
              title={a.nombre_archivo}
            >
              {a.nombre_archivo || "Archivo"}
            </Link>
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
        </Box>
      ))}
    </Stack>
  );
}

function labelFaseAprobacion(r) {
  if (r.estado !== "pendiente") return "—";
  if (r.fase_aprobacion === "jefe") return "Jefe directo";
  if (r.fase_aprobacion === "final") return "Comité / área";
  const jefe =
    r.emp_id_jefe_aprobador != null &&
    String(r.emp_id_jefe_aprobador).trim() !== "";
  if (jefe && !r.aprobacion_jefe_en) return "Jefe directo";
  return "Comité / área";
}

function getMiEmpId() {
  try {
    const raw = localStorage.getItem("infoUser");
    if (!raw) return "";
    const u = JSON.parse(raw);
    return u?.emp_id != null ? String(u.emp_id).trim() : "";
  } catch {
    return "";
  }
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

function labelEstadoChip(estado) {
  const e = String(estado || "").toLowerCase();
  if (e === "aprobada" || e === "aprobado") return "Aprobado";
  if (e === "rechazada" || e === "rechazado") return "Rechazado";
  if (e === "pendiente") return "Pendiente";
  return estado || "—";
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
  const t = String(tipo ?? "").trim();
  if (t === "jefe_directo") return "Jefe directo";
  if (t === "responsable_area") return "Responsable de área";
  if (t === "forzado") return "Requerido";
  if (!t) return "—";
  return t;
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
        const url = `/api/solicitudes?solicitante_emp_id=${encodeURIComponent(empId)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "No se pudieron cargar sus solicitudes");
          setRows([]);
          return;
        }
        setSchemaFase2Pendiente(Boolean(data.schema_fase2_pendiente));
        setRows(data.data || []);
        return;
      }

      const url = empId
        ? `/api/solicitudes?for_emp_id=${encodeURIComponent(empId)}`
        : "/api/solicitudes";
      if (!empId) setSinEmpEnSesion(true);

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudieron cargar las solicitudes");
        setRows([]);
        return;
      }
      setSchemaFase2Pendiente(Boolean(data.schema_fase2_pendiente));
      setRows(data.data || []);
    } catch (e) {
      setError("Error de conexión");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [misSolicitudes]);

  useEffect(() => {
    load();
  }, [load]);

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

  const abrirAprobaciones = async (solicitud) => {
    const id_solicitud = solicitud.id_solicitud;
    setDialogAprobacionesOpen(true);
    setDialogAprobacionesId(id_solicitud);
    setDialogAprobacionesSolicitud(solicitud);
    setDialogAprobacionesRows([]);
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

  const cerrarDialogAprobaciones = () => {
    setDialogAprobacionesOpen(false);
    setDialogAprobacionesId(null);
    setDialogAprobacionesSolicitud(null);
    setDialogAprobacionesRows([]);
    setDialogAprobacionesError("");
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
              aprobaciones.
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
                  {!misSolicitudes && <TableCell>Fase</TableCell>}
                  <TableCell>ID documento</TableCell>
                  <TableCell>Detalle</TableCell>
                  <TableCell>Quién realizó la solicitud</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell align="right">Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={misSolicitudes ? 8 : 9}
                      sx={{ color: "#757575", border: 0 }}
                    >
                      {misSolicitudes
                        ? "No tiene solicitudes registradas a su nombre."
                        : "No hay solicitudes registradas."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
                    const puedeAprobar = r.puede_aprobar === true;
                    const puedeRechazar = r.puede_rechazar === true;
                    const faseLabel = misSolicitudes
                      ? null
                      : labelFaseAprobacion(r);
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
                              backgroundColor:
                                r.estado === "pendiente"
                                  ? "#FB8500"
                                  : r.estado === "aprobada"
                                    ? "#1B5E20"
                                    : "#C62828",
                            }}
                          />
                        </TableCell>
                        {!misSolicitudes && (
                          <TableCell sx={{ maxWidth: 200, verticalAlign: "top" }}>
                            {r.estado === "pendiente" ? (
                              <Box>
                                <Chip
                                  size="small"
                                  label={faseLabel}
                                  sx={{
                                    height: 26,
                                    borderRadius: 999,
                                    bgcolor: "#ECEFF1",
                                    color: "#37474F",
                                    fontWeight: 500,
                                    fontSize: "0.72rem",
                                  }}
                                />
                                {faseLabel === "Comité / área" &&
                                  r.fase2_total != null &&
                                  Number(r.fase2_total) > 0 && (
                                    <Typography
                                      variant="caption"
                                      component="div"
                                      sx={{
                                        mt: 0.75,
                                        color: "rgba(33, 33, 33, 0.82)",
                                        lineHeight: 1.35,
                                      }}
                                    >
                                      {Number(r.fase2_completadas) || 0} /{" "}
                                      {Number(r.fase2_total)} aprobaciones
                                    </Typography>
                                  )}
                              </Box>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        )}
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
        <DialogContent dividers>
          {dialogAprobacionesSolicitud && (
            <Stack spacing={1.5} sx={{ mb: 2 }}>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "#757575", fontWeight: 600, mb: 0.5 }}
                >
                  Quién realizó la solicitud
                </Typography>
                <Typography variant="body2" sx={{ color: "#212121" }}>
                  {textoSolicitante(dialogAprobacionesSolicitud)}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "#757575", fontWeight: 600, mb: 0.5 }}
                >
                  Documentos cargados
                </Typography>
                <ListaArchivosSolicitud
                  archivos_json={dialogAprobacionesSolicitud.archivos_json}
                />
              </Box>
              {(dialogAprobacionesSolicitud.tiempo_retencion?.trim() ||
                dialogAprobacionesSolicitud.ubicacion_registro?.trim()) && (
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: "#757575", fontWeight: 600, mb: 0.5 }}
                  >
                    Retención y registro
                  </Typography>
                  {dialogAprobacionesSolicitud.tiempo_retencion?.trim() ? (
                    <Typography variant="body2" sx={{ color: "#212121" }}>
                      Tiempo de retención:{" "}
                      {dialogAprobacionesSolicitud.tiempo_retencion}
                    </Typography>
                  ) : null}
                  {dialogAprobacionesSolicitud.ubicacion_registro?.trim() ? (
                    <Typography variant="body2" sx={{ color: "#212121" }}>
                      Ubicación del registro:{" "}
                      {dialogAprobacionesSolicitud.ubicacion_registro}
                    </Typography>
                  ) : null}
                </Box>
              )}
            </Stack>
          )}
          {dialogAprobacionesSolicitud && <Divider sx={{ my: 2 }} />}
          <Typography
            variant="subtitle2"
            sx={{ color: "#757575", fontWeight: 600, mb: 1.5 }}
          >
            Aprobaciones
          </Typography>
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
    </HexagonMenu>
  );
}

export default Solicitudes;
