"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Grid,
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  IconButton,
  Card,
  CardContent,
  Link,
  Stack,
} from "@mui/material";
import {
  CloudUpload,
  Delete,
  InsertDriveFile,
  PictureAsPdf,
  Description,
  DescriptionOutlined,
  Slideshow,
} from "@mui/icons-material";
import { getMiEmpId, parseArchivos } from "./Solicitudes";

const textFieldSx = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "#FFFFFF",
    color: "#212121",
    "& fieldset": { borderColor: "rgba(0, 0, 0, 0.12)" },
    "&:hover fieldset": { borderColor: "#1976D2" },
    "&.Mui-focused fieldset": { borderColor: "#1976D2" },
    "& .MuiInputBase-input": { color: "#212121" },
  },
  "& .MuiInputLabel-root": {
    color: "#757575",
    "&.Mui-focused": { color: "#1976D2" },
  },
  "& .MuiFormHelperText-root": { color: "#757575" },
};

function getFileIcon(file) {
  const type = file.type || "";
  if (type.includes("pdf")) {
    return <PictureAsPdf sx={{ color: "#1976D2" }} />;
  }
  if (type.includes("excel") || type.includes("spreadsheet")) {
    return <DescriptionOutlined sx={{ color: "#1976D2" }} />;
  }
  if (type.includes("word") || type.includes("msword")) {
    return <Description sx={{ color: "#1976D2" }} />;
  }
  if (type.includes("powerpoint") || type.includes("presentation")) {
    return <Slideshow sx={{ color: "#1976D2" }} />;
  }
  return <InsertDriveFile sx={{ color: "#1976D2" }} />;
}

export default function EditarSolicitudRechazadaDialog({
  open,
  solicitud,
  onClose,
  onSuccess,
}) {
  const [motivo, setMotivo] = useState("");
  const [fechaAlta, setFechaAlta] = useState("");
  const [nomenclatura, setNomenclatura] = useState("");
  const [nombreDocumento, setNombreDocumento] = useState("");
  const [idArea, setIdArea] = useState("");
  const [tiempoRetencion, setTiempoRetencion] = useState("");
  const [ubicacionRegistro, setUbicacionRegistro] = useState("");
  const [archivosNuevos, setArchivosNuevos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const archivosExistentes = solicitud
    ? parseArchivos(solicitud.archivos_json)
    : [];
  const esNuevo = solicitud?.tipo === "nuevo";

  useEffect(() => {
    if (!open || !solicitud) return;
    setMotivo(String(solicitud.motivo ?? ""));
    setFechaAlta(
      solicitud.fecha_alta
        ? String(solicitud.fecha_alta).slice(0, 10)
        : new Date().toISOString().split("T")[0],
    );
    setNomenclatura(String(solicitud.nomenclatura ?? ""));
    setNombreDocumento(String(solicitud.nombre_documento ?? ""));
    setIdArea(
      solicitud.id_area != null && solicitud.id_area !== ""
        ? String(solicitud.id_area)
        : "",
    );
    setTiempoRetencion(String(solicitud.tiempo_retencion ?? ""));
    setUbicacionRegistro(String(solicitud.ubicacion_registro ?? ""));
    setArchivosNuevos([]);
    setError("");
  }, [open, solicitud]);

  useEffect(() => {
    if (!open || !esNuevo) return;
    let cancelled = false;
    setAreasLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/areas");
        const data = await res.json();
        if (!cancelled && res.ok && Array.isArray(data.data)) {
          setAreas(data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setAreasLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, esNuevo]);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    const valid = files.filter((file) => {
      if (!allowedTypes.includes(file.type)) {
        alert(
          `El archivo ${file.name} no es un formato válido. Solo Excel, PDF, Word y PowerPoint.`,
        );
        return false;
      }
      return true;
    });
    setArchivosNuevos((prev) => [...prev, ...valid]);
  };

  const handleSubmit = async () => {
    if (!solicitud) return;

    const empId = getMiEmpId();
    if (!empId) {
      setError("No hay emp_id en la sesión. Vuelva a iniciar sesión.");
      return;
    }

    if (solicitud.tipo === "cambio" && !motivo.trim()) {
      setError("Indique el motivo del cambio.");
      return;
    }

    if (esNuevo) {
      if (!nomenclatura.trim() || !nombreDocumento.trim()) {
        setError("Nomenclatura y nombre del documento son requeridos.");
        return;
      }
      if (!idArea.trim()) {
        setError("Seleccione un área.");
        return;
      }
      if (!fechaAlta) {
        setError("La fecha de alta es requerida.");
        return;
      }
    }

    if (archivosNuevos.length === 0 && archivosExistentes.length === 0) {
      setError("Debe conservar o adjuntar al menos un archivo.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("emp_id_actor", empId);
      fd.append("tiempo_retencion", tiempoRetencion);
      fd.append("ubicacion_registro", ubicacionRegistro);

      if (solicitud.tipo === "cambio") {
        fd.append("motivo", motivo.trim());
      } else {
        fd.append("fecha_alta", fechaAlta);
        fd.append("nomenclatura", nomenclatura.trim());
        fd.append("nombre_documento", nombreDocumento.trim());
        fd.append("id_area", idArea);
        const partesMotivo = [
          "Alta de nuevo documento",
          nombreDocumento.trim(),
          nomenclatura.trim(),
        ].filter((x) => x.length > 0);
        fd.append(
          "motivo",
          partesMotivo.join(" · ").slice(0, 300) || "Alta de nuevo documento",
        );
      }

      archivosNuevos.forEach((f) => fd.append("archivos", f));

      const res = await fetch(`/api/solicitudes/${solicitud.id_solicitud}`, {
        method: "PUT",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo reenviar la solicitud");
        return;
      }
      onSuccess?.(data.message);
      onClose();
    } catch {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!solicitud) return null;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
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
        Editar y reenviar solicitud #{solicitud.id_solicitud}
        <Typography
          variant="body2"
          sx={{ mt: 0.5, fontWeight: 400, color: "#757575" }}
        >
          Corrija la información y envíe de nuevo. El flujo reinicia con el
          jefe directo; después pasará al comité y al responsable del área.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="ID documento"
              value={solicitud.id_documento}
              disabled
              sx={textFieldSx}
            />
          </Grid>

          {esNuevo ? (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha de alta"
                  value={fechaAlta}
                  onChange={(e) => setFechaAlta(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={textFieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth sx={textFieldSx} disabled={areasLoading}>
                  <InputLabel id="edit-sol-area-label">Área</InputLabel>
                  <Select
                    labelId="edit-sol-area-label"
                    label="Área"
                    value={idArea}
                    onChange={(e) => setIdArea(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Seleccione un área</em>
                    </MenuItem>
                    {areas.map((a) => (
                      <MenuItem key={a.id_area} value={String(a.id_area)}>
                        {a.area_nombre}
                      </MenuItem>
                    ))}
                  </Select>
                  {areasLoading && (
                    <FormHelperText>Cargando áreas…</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nomenclatura"
                  value={nomenclatura}
                  onChange={(e) => setNomenclatura(e.target.value)}
                  sx={textFieldSx}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nombre del documento"
                  value={nombreDocumento}
                  onChange={(e) => setNombreDocumento(e.target.value)}
                  sx={textFieldSx}
                />
              </Grid>
            </>
          ) : (
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Motivo y descripción del cambio"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                inputProps={{ maxLength: 300 }}
                helperText="Máx. 300 caracteres"
                sx={textFieldSx}
              />
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Tiempo de retención"
              value={tiempoRetencion}
              onChange={(e) => setTiempoRetencion(e.target.value)}
              inputProps={{ maxLength: 200 }}
              sx={textFieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Ubicación del registro"
              value={ubicacionRegistro}
              onChange={(e) => setUbicacionRegistro(e.target.value)}
              inputProps={{ maxLength: 200 }}
              sx={textFieldSx}
            />
          </Grid>

          {archivosExistentes.length > 0 && archivosNuevos.length === 0 && (
            <Grid item xs={12}>
              <Typography
                variant="subtitle2"
                sx={{ color: "#757575", fontWeight: 600, mb: 1 }}
              >
                Archivos actuales (se conservan si no adjunta otros)
              </Typography>
              <Stack spacing={0.75}>
                {archivosExistentes.map((a, idx) => (
                  <Box
                    key={`${a.nombre_archivo}-${idx}`}
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <InsertDriveFile sx={{ color: "#1976D2", fontSize: 20 }} />
                    <Link
                      href={a.ruta_archivo || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      underline="hover"
                      sx={{ fontSize: "0.875rem", color: "#616161" }}
                    >
                      {a.nombre_archivo}
                    </Link>
                  </Box>
                ))}
              </Stack>
            </Grid>
          )}

          <Grid item xs={12}>
            <Typography
              variant="subtitle2"
              sx={{ color: "#757575", fontWeight: 600, mb: 1 }}
            >
              {archivosNuevos.length > 0
                ? "Nuevos archivos (reemplazan los anteriores)"
                : "Adjuntar archivos nuevos (opcional)"}
            </Typography>
            <Box
              sx={{
                p: 2,
                border: "2px dashed rgba(25, 118, 210, 0.2)",
                borderRadius: 2,
                textAlign: "center",
              }}
            >
              <input
                accept=".xlsx,.xls,.pdf,.doc,.docx,.ppt,.pptx"
                style={{ display: "none" }}
                id="edit-sol-rechazada-files"
                multiple
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor="edit-sol-rechazada-files">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUpload />}
                  sx={{
                    color: "#1976D2",
                    borderColor: "#1976D2",
                    textTransform: "none",
                  }}
                >
                  Seleccionar archivos
                </Button>
              </label>
            </Box>
            {archivosNuevos.length > 0 && (
              <Grid container spacing={1} sx={{ mt: 1 }}>
                {archivosNuevos.map((file, index) => (
                  <Grid item xs={12} sm={6} key={`${file.name}-${index}`}>
                    <Card
                      sx={{
                        bgcolor: "#E3F2FD",
                        border: "1px solid rgba(25, 118, 210, 0.16)",
                      }}
                    >
                      <CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              minWidth: 0,
                            }}
                          >
                            {getFileIcon(file)}
                            <Typography
                              variant="body2"
                              noWrap
                              sx={{ color: "#1976D2", maxWidth: 180 }}
                            >
                              {file.name}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() =>
                              setArchivosNuevos((prev) =>
                                prev.filter((_, i) => i !== index),
                              )
                            }
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{ color: "#757575", textTransform: "none" }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{
            bgcolor: "#E3F2FD",
            color: "#1976D2",
            border: "1px solid #1976D2",
            textTransform: "none",
            "&:hover": { bgcolor: "#BBDEFB" },
          }}
        >
          {loading ? (
            <CircularProgress size={22} sx={{ color: "#1976D2" }} />
          ) : (
            "Guardar y reenviar a aprobación"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
