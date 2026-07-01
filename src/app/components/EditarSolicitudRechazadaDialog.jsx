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
import FormSection, {
  textFieldSx,
  disabledFieldSx,
  sectionTitleSx,
} from "./FormSection";
import LoadingModal from "./LoadingModal";
import {
  combinarArchivosAlSubir,
  renombrarArchivosDocumento,
} from "@/libs/archivos_adjuntos";
import CampoFechaRetencion from "./CampoFechaRetencion";
import { retencionValorParaForm } from "@/libs/tiempo_retencion";
import { useVerificarNomenclaturaDocumento } from "@/app/hooks/useVerificarNomenclaturaDocumento";
import { ERROR_NOMENCLATURA_YA_REGISTRADA } from "@/libs/nomenclatura_documento";

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

  const { verificando: nomenclaturaVerificando, yaRegistrada: nomenclaturaYaRegistrada } =
    useVerificarNomenclaturaDocumento(nomenclatura, {
      habilitado: open && esNuevo,
    });

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
    setTiempoRetencion(retencionValorParaForm(solicitud.tiempo_retencion));
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

  const ctxRenombreArchivos = () => ({
    nomenclatura: esNuevo ? nomenclatura : String(solicitud?.nomenclatura ?? ""),
    nombreDocumento: esNuevo
      ? nombreDocumento
      : String(solicitud?.nombre_documento ?? ""),
  });

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    event.target.value = "";
    const { archivos, mensajes } = combinarArchivosAlSubir(
      archivosNuevos,
      files,
      ctxRenombreArchivos(),
    );
    mensajes.forEach((m) => alert(m));
    setArchivosNuevos(archivos);
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
      if (nomenclaturaVerificando) {
        setError("Verificando nomenclatura…");
        return;
      }
      if (nomenclaturaYaRegistrada) {
        setError(ERROR_NOMENCLATURA_YA_REGISTRADA);
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

      renombrarArchivosDocumento(archivosNuevos, ctxRenombreArchivos()).forEach(
        (f) => fd.append("archivos", f),
      );

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
      <DialogTitle
        component="div"
        sx={{ color: "#1976D2", fontWeight: 700 }}
      >
        Editar y reenviar solicitud #{solicitud.id_solicitud}
        <Typography
          variant="body2"
          sx={{ mt: 0.5, fontWeight: 400, color: "#757575" }}
        >
          Corrija la información y envíe de nuevo. El flujo reinicia con el jefe
          directo; después pasará al comité y al responsable del área.
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: "#FAFAFA" }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <FormSection title="Identificación">
          <TextField
            fullWidth
            label="ID documento"
            value={solicitud.id_documento}
            disabled
            sx={disabledFieldSx}
          />
        </FormSection>

        {esNuevo ? (
          <>
            <FormSection
              title="Datos del documento"
              subtitle="Información principal del registro."
            >
              <Grid container spacing={2.5}>
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
                  <FormControl
                    fullWidth
                    required
                    sx={textFieldSx}
                    disabled={areasLoading}
                  >
                    <InputLabel id="edit-sol-area-label">
                      Área responsable
                    </InputLabel>
                    <Select
                      labelId="edit-sol-area-label"
                      label="Área responsable"
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
                    onChange={(e) =>
                      setNomenclatura(e.target.value.toUpperCase())
                    }
                    error={nomenclaturaYaRegistrada}
                    helperText={
                      nomenclaturaVerificando
                        ? "Verificando nomenclatura…"
                        : nomenclaturaYaRegistrada
                          ? ERROR_NOMENCLATURA_YA_REGISTRADA
                          : undefined
                    }
                    sx={{
                      ...textFieldSx,
                      "& .MuiFormHelperText-root": {
                        color: nomenclaturaYaRegistrada ? "#b91c1c" : "#757575",
                      },
                    }}
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
              </Grid>
            </FormSection>
          </>
        ) : (
          <FormSection
            title="Descripción del cambio"
            subtitle="Explique qué debe actualizarse y el contexto del cambio."
          >
            <TextField
              fullWidth
              multiline
              minRows={4}
              label="Motivo y descripción del cambio"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              sx={textFieldSx}
            />
          </FormSection>
        )}

        <FormSection
          title="Información adicional"
          subtitle="Campos opcionales de retención y ubicación."
        >
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <CampoFechaRetencion
                value={tiempoRetencion}
                onChange={setTiempoRetencion}
                textFieldSx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Ubicación del registro"
                value={ubicacionRegistro}
                onChange={(e) => setUbicacionRegistro(e.target.value)}
                placeholder="Ej. Servidor / carpeta"
                sx={textFieldSx}
              />
            </Grid>
          </Grid>
        </FormSection>

        <FormSection
          title="Archivos"
          subtitle={
            archivosNuevos.length > 0
              ? "Los archivos nuevos reemplazan a los anteriores al reenviar."
              : "Adjunte archivos nuevos o conserve los actuales."
          }
        >
          {archivosExistentes.length > 0 && archivosNuevos.length === 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="body2"
                sx={{ color: "#757575", fontWeight: 600, mb: 1 }}
              >
                Archivos actuales
              </Typography>
              <Stack spacing={0.75}>
                {archivosExistentes.map((a, idx) => (
                  <Box
                    key={`${a.nombre_archivo}-${idx}`}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      p: 1,
                      borderRadius: 1,
                      bgcolor: "#FFFFFF",
                      border: "1px solid rgba(25, 118, 210, 0.12)",
                    }}
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
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              p: 3,
              border: "2px dashed rgba(25, 118, 210, 0.25)",
              borderRadius: 2,
              bgcolor: "#FFFFFF",
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: "#1976D2",
                bgcolor: "rgba(25, 118, 210, 0.06)",
              },
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
                variant="contained"
                component="span"
                startIcon={<CloudUpload />}
                sx={{
                  backgroundColor: "#FFFFFF",
                  color: "#212121",
                  border: "1px solid #1976D2",
                  py: 1.25,
                  px: 3,
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "#BBDEFB",
                    color: "#1976D2",
                  },
                }}
              >
                Seleccionar archivos
              </Button>
            </label>
            <Typography variant="caption" sx={{ color: "#757575", mt: 1.5 }}>
              Excel, PDF, Word y PowerPoint
            </Typography>
          </Box>

          {archivosNuevos.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ ...sectionTitleSx, mb: 1.5, fontSize: "0.875rem" }}>
                Archivos nuevos ({archivosNuevos.length})
              </Typography>
              <Grid container spacing={1.5}>
                {archivosNuevos.map((file, index) => (
                  <Grid item xs={12} sm={6} key={`${file.name}-${index}`}>
                    <Card
                      sx={{
                        bgcolor: "#FFFFFF",
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
                            sx={{ color: "#1976D2" }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </FormSection>
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
          Guardar y reenviar a aprobación
        </Button>
      </DialogActions>

      <LoadingModal
        open={loading}
        message="Guardando y reenviando solicitud…"
      />
    </Dialog>
  );
}
