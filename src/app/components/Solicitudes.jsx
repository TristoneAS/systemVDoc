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
} from "@mui/material";
import { Check, Close, InsertDriveFile, ListAlt } from "@mui/icons-material";
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

/**
 * Al crear una solicitud: emp_id y emp_nombre desde `infoUser` (localStorage).
 */
export function getSolicitanteParaSolicitud() {
  try {
    const raw = localStorage.getItem("infoUser");
    if (!raw) return { emp_id_solicitante: "", solicitante: "" };
    const u = JSON.parse(raw);
    const emp_id_solicitante =
      u?.emp_id != null ? String(u.emp_id).trim() : "";
    const solicitante =
      u?.emp_nombre != null ? String(u.emp_nombre).trim() : "";
    return { emp_id_solicitante, solicitante };
  } catch {
    return { emp_id_solicitante: "", solicitante: "" };
  }
}

function Solicitudes() {
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
  }, []);

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
        setBanner({ severity: "error", text: data.error || "Error al procesar" });
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

  const abrirAprobaciones = async (id_solicitud) => {
    setDialogAprobacionesOpen(true);
    setDialogAprobacionesId(id_solicitud);
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
    setDialogAprobacionesRows([]);
    setDialogAprobacionesError("");
  };

  return (
    <HexagonMenu selectedItemId="ver-solicitudes">
      <Paper
        elevation={6}
        sx={{
          p: 3,
          maxWidth: 1200,
          mx: "auto",
          backgroundColor: "#ffffff",
          border: "1px solid rgba(65, 105, 225, 0.16)",
          borderRadius: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{ color: "#1e3a8a", fontWeight: 700, mb: 1, textAlign: "center" }}
        >
          Solicitudes
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "rgba(30, 58, 138, 0.75)", textAlign: "center", mb: 3 }}
        >
          En la primera fase solo puede aprobar el jefe directo del solicitante.
          En la segunda fase deben aprobar <strong>todos</strong> los empleados que
          están en el listado de aprobadores más el responsable del área del
          trámite; cada uno registra su visto bueno. Cuando todos hayan
          aprobado, el documento se da de alta o se incorporan los archivos al
          documento existente.
        </Typography>

        {schemaFase2Pendiente && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Falta crear la tabla <strong>solicitud_aprobaciones_fase2</strong> en
            la base de datos. El listado se muestra, pero aprobar o rechazar en
            segunda fase fallará hasta ejecutar el script{" "}
            <strong>database/create_solicitud_aprobaciones_fase2.sql</strong> en
            la base configurada (p. ej. <code>v_docs</code>).
          </Alert>
        )}

        {sinEmpEnSesion && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No se encontró su <strong>emp_id</strong> en la sesión. Las acciones
            de aprobar o rechazar pueden no estar disponibles hasta que vuelva a
            iniciar sesión.
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
            <CircularProgress sx={{ color: "#1e3a8a" }} />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: "rgba(30, 58, 138, 0.75)", fontWeight: 600 }}>
                    ID
                  </TableCell>
                  <TableCell sx={{ color: "rgba(30, 58, 138, 0.75)", fontWeight: 600 }}>
                    Tipo
                  </TableCell>
                  <TableCell sx={{ color: "rgba(30, 58, 138, 0.75)", fontWeight: 600 }}>
                    Estado
                  </TableCell>
                  <TableCell sx={{ color: "rgba(30, 58, 138, 0.75)", fontWeight: 600 }}>
                    Fase
                  </TableCell>
                  <TableCell sx={{ color: "rgba(30, 58, 138, 0.75)", fontWeight: 600 }}>
                    ID documento
                  </TableCell>
                  <TableCell sx={{ color: "rgba(30, 58, 138, 0.75)", fontWeight: 600 }}>
                    Detalle
                  </TableCell>
                  <TableCell sx={{ color: "rgba(30, 58, 138, 0.75)", fontWeight: 600 }}>
                    Documentos cargados
                  </TableCell>
                  <TableCell sx={{ color: "rgba(30, 58, 138, 0.75)", fontWeight: 600 }}>
                    Fecha
                  </TableCell>
                  <TableCell align="right" sx={{ color: "rgba(30, 58, 138, 0.75)", fontWeight: 600 }}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ color: "rgba(30, 58, 138, 0.75)", border: 0 }}>
                      No hay solicitudes registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
                    const archivos = parseArchivos(r.archivos_json);
                    const puedeAprobar = r.puede_aprobar === true;
                    const puedeRechazar = r.puede_rechazar === true;
                    const faseLabel = labelFaseAprobacion(r);
                    return (
                    <TableRow
                      key={r.id_solicitud}
                      sx={{
                        "&:last-child td": { border: 0 },
                        "& td": {
                          color: "#1e3a8a",
                          borderColor: "rgba(65, 105, 225, 0.14)",
                        },
                      }}
                    >
                      <TableCell>{r.id_solicitud}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={r.tipo === "nuevo" ? "Nuevo" : "Cambio"}
                          sx={{
                            bgcolor:
                              r.tipo === "nuevo"
                                ? "rgba(65, 105, 225, 0.12)"
                                : "rgba(65, 105, 225, 0.1)",
                            color:
                              r.tipo === "nuevo" ? "#1e3a8a" : "#334155",
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={r.estado}
                          sx={{
                            bgcolor:
                              r.estado === "pendiente"
                                ? "rgba(65, 105, 225, 0.12)"
                                : r.estado === "aprobada"
                                  ? "rgba(65, 105, 225, 0.12)"
                                  : "rgba(65, 105, 225, 0.12)",
                            color:
                              r.estado === "pendiente"
                                ? "#1e3a8a"
                                : r.estado === "aprobada"
                                  ? "#1e3a8a"
                                  : "#b91c1c",
                            textTransform: "capitalize",
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200, verticalAlign: "top" }}>
                        {r.estado === "pendiente" ? (
                          <Box>
                            <Chip
                              size="small"
                              label={faseLabel}
                              sx={{
                                bgcolor: "rgba(65, 105, 225, 0.1)",
                                color: "#334155",
                                fontWeight: 500,
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
                                    color: "rgba(30, 58, 138, 0.8)",
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
                        {archivos.length === 0 ? (
                          <Typography variant="body2" sx={{ color: "rgba(30, 58, 138, 0.45)" }}>
                            —
                          </Typography>
                        ) : (
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
                                    color: "#1e3a8a",
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
                                      color: "#334155",
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
                                        color: "rgba(30, 58, 138, 0.55)",
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
                        )}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {formatFecha(r.fecha_creacion)}
                      </TableCell>
                      <TableCell align="right">
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            justifyContent: "flex-end",
                            flexWrap: "wrap",
                          }}
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ListAlt />}
                            disabled={
                              dialogAprobacionesLoading &&
                              dialogAprobacionesId === r.id_solicitud
                            }
                            onClick={() => abrirAprobaciones(r.id_solicitud)}
                            sx={{
                              color: "#1e3a8a",
                              borderColor: "rgba(65, 105, 225, 0.35)",
                              textTransform: "none",
                              "&:hover": {
                                borderColor: "#4169E1",
                                bgcolor: "rgba(65, 105, 225, 0.06)",
                              },
                            }}
                          >
                            Ver aprobaciones
                          </Button>
                          {r.estado === "pendiente" ? (
                            <>
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={
                                  actionId === r.id_solicitud ? (
                                    <CircularProgress
                                      size={16}
                                      sx={{ color: "#1e3a8a" }}
                                    />
                                  ) : (
                                    <Check />
                                  )
                                }
                                disabled={
                                  actionId !== null ||
                                  !puedeAprobar ||
                                  sinEmpEnSesion
                                }
                                onClick={() =>
                                  abrirModalResolver(r.id_solicitud, "aprobar")
                                }
                                sx={{
                                  bgcolor: "#e0e7ff",
                                  color: "#1e3a8a",
                                  border: "1px solid #4169E1",
                                  textTransform: "none",
                                  "&:hover": {
                                    bgcolor: "#c7d2fe",
                                    color: "#1e3a8a",
                                  },
                                }}
                              >
                                Aprobar
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<Close />}
                                disabled={
                                  actionId !== null ||
                                  !puedeRechazar ||
                                  sinEmpEnSesion
                                }
                                onClick={() =>
                                  abrirModalResolver(r.id_solicitud, "rechazar")
                                }
                                sx={{ textTransform: "none" }}
                              >
                                Rechazar
                              </Button>
                            </>
                          ) : null}
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

      <Dialog
        open={resolverModalOpen}
        onClose={cerrarModalResolver}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            border: "1px solid rgba(65, 105, 225, 0.16)",
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ color: "#1e3a8a", fontWeight: 700 }}>
          {resolverModalAccion === "rechazar"
            ? "Rechazar solicitud"
            : "Aprobar solicitud"}
        </DialogTitle>
        <DialogContent dividers>
          <Typography
            variant="body2"
            sx={{ color: "rgba(30, 58, 138, 0.85)", mb: 2 }}
          >
            Describa el motivo de su decisión. El comentario quedará registrado en
            la base de datos.
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
              "& .MuiOutlinedInput-root": { color: "#1e3a8a" },
              "& .MuiInputLabel-root": { color: "rgba(30, 58, 138, 0.75)" },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={cerrarModalResolver}
            disabled={actionId !== null}
            sx={{ color: "#475569", textTransform: "none" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={confirmarModalResolver}
            disabled={actionId !== null}
            sx={{
              bgcolor:
                resolverModalAccion === "rechazar" ? "#fef2f2" : "#e0e7ff",
              color: resolverModalAccion === "rechazar" ? "#b91c1c" : "#1e3a8a",
              border:
                resolverModalAccion === "rechazar"
                  ? "1px solid #fecaca"
                  : "1px solid #4169E1",
              textTransform: "none",
              "&:hover": {
                bgcolor:
                  resolverModalAccion === "rechazar" ? "#fee2e2" : "#c7d2fe",
              },
            }}
          >
            {resolverModalAccion === "rechazar"
              ? "Confirmar rechazo"
              : "Confirmar aprobación"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogAprobacionesOpen}
        onClose={cerrarDialogAprobaciones}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            border: "1px solid rgba(65, 105, 225, 0.16)",
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ color: "#1e3a8a", fontWeight: 700 }}>
          Aprobaciones
          {dialogAprobacionesId != null && (
            <Typography
              component="span"
              variant="body2"
              sx={{
                display: "block",
                mt: 0.5,
                fontWeight: 400,
                color: "rgba(30, 58, 138, 0.75)",
              }}
            >
              Solicitud #{dialogAprobacionesId} · tabla{" "}
              <code style={{ fontSize: "0.85em" }}>aprobaciones</code>
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {dialogAprobacionesLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress sx={{ color: "#1e3a8a" }} />
            </Box>
          ) : dialogAprobacionesError ? (
            <Alert severity="error">{dialogAprobacionesError}</Alert>
          ) : dialogAprobacionesRows.length === 0 ? (
            <Typography sx={{ color: "rgba(30, 58, 138, 0.75)" }}>
              No hay registros de aprobación para esta solicitud.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: "#475569" }}>
                      ID
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#475569" }}>
                      Empleado
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#475569" }}>
                      Nombre
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#475569" }}>
                      Correo
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#475569" }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#475569" }}>
                      Comentario
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dialogAprobacionesRows.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell sx={{ color: "#1e3a8a" }}>{a.id}</TableCell>
                      <TableCell sx={{ color: "#1e3a8a" }}>{a.emp_id}</TableCell>
                      <TableCell sx={{ color: "#334155" }}>
                        {a.emp_nombre || "—"}
                      </TableCell>
                      <TableCell sx={{ color: "#334155", wordBreak: "break-all" }}>
                        {a.emp_correo || "—"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={a.status || "—"}
                          sx={{
                            textTransform: "capitalize",
                            bgcolor: "rgba(65, 105, 225, 0.12)",
                            color: "#1e3a8a",
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "#334155",
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
            sx={{ color: "#1e3a8a", textTransform: "none" }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </HexagonMenu>
  );
}

export default Solicitudes;
