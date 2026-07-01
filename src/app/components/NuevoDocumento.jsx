"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  TextField,
  Grid,
  Alert,
  Card,
  CardContent,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from "@mui/material";
import {
  CloudUpload,
  Delete,
  Description,
  DescriptionOutlined,
  PictureAsPdf,
  InsertDriveFile,
  Slideshow,
} from "@mui/icons-material";
import HexagonMenu from "./HexagonMenu";
import ModalConfirmarCorreoAprobadores from "./ModalConfirmarCorreoAprobadores";
import LoadingModal from "./LoadingModal";
import { getSolicitanteParaSolicitud } from "./Solicitudes";
import FormSection, {
  textFieldSx,
  disabledFieldSx,
  sectionTitleSx,
  stepperSx,
  splitRowSx,
  splitCol35Sx,
  splitCol65Sx,
} from "./FormSection";
import CampoFechaRetencion from "./CampoFechaRetencion";
import { useVerificarNomenclaturaDocumento } from "@/app/hooks/useVerificarNomenclaturaDocumento";
import { ERROR_NOMENCLATURA_YA_REGISTRADA } from "@/libs/nomenclatura_documento";
import {
  ACCEPT_ARCHIVOS_ADJUNTOS,
  ARCHIVOS_ADJUNTOS_HINT,
  MAX_ARCHIVOS_ADJUNTOS,
  combinarArchivosAlSubir,
  validarArchivosAdjuntos,
  renombrarArchivosDocumento,
} from "@/libs/archivos_adjuntos";

const steps = ["Información Básica", "Cargar Archivos"];

function NuevoDocumento({
  hideHexagonMenu = false,
  pageTitle = "Nuevo Documento",
  successMessage = "Documento guardado exitosamente",
  submitButtonText = "Guardar Documento",
  savingLabel = "Guardando...",
  /** Si es true, guarda en tabla solicitudes (pendiente de aprobación) en lugar de documentos */
  saveAsSolicitud = false,
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    id_documento: "",
    fecha_alta: new Date().toISOString().split("T")[0],
    nomenclatura: "",
    confirmar_nomenclatura: "",
    nombre_documento: "",
    tiempo_retencion: "",
    ubicacion_registro: "",
    id_area: "",
    archivos: [],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [modalCorreoOpen, setModalCorreoOpen] = useState(false);
  const [previewCorreoParams, setPreviewCorreoParams] = useState(null);
  const [areas, setAreas] = useState([]);
  const [areasLoading, setAreasLoading] = useState(true);

  const { verificando: nomenclaturaVerificando, yaRegistrada: nomenclaturaYaRegistrada } =
    useVerificarNomenclaturaDocumento(formData.nomenclatura);

  useEffect(() => {
    const cargarVistaPreliaId = async () => {
      try {
        const res = await fetch("/api/documentos/next-id");
        const data = await res.json();
        if (res.ok && data.next_id) {
          setFormData((prev) => ({
            ...prev,
            id_documento: String(data.next_id),
          }));
        }
      } catch (e) {
        console.error("No se pudo obtener vista previa de ID:", e);
      }
    };
    cargarVistaPreliaId();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/areas");
        const data = await res.json();
        if (!cancelled && res.ok && Array.isArray(data.data)) {
          setAreas(data.data);
        }
      } catch (e) {
        console.error("No se pudieron cargar las áreas:", e);
      } finally {
        if (!cancelled) setAreasLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInputChange = (field, value) => {
    let nextValue = value;
    if (field === "nomenclatura" || field === "confirmar_nomenclatura") {
      nextValue = value.toUpperCase();
    }
    setFormData((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
    // Limpiar error del campo cuando se modifica
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.nomenclatura.trim()) {
      newErrors.nomenclatura = "La nomenclatura es requerida";
    } else if (nomenclaturaYaRegistrada) {
      newErrors.nomenclatura = ERROR_NOMENCLATURA_YA_REGISTRADA;
    } else if (nomenclaturaVerificando) {
      newErrors.nomenclatura = "Verificando nomenclatura…";
    }
    if (!formData.confirmar_nomenclatura.trim()) {
      newErrors.confirmar_nomenclatura = "Debe confirmar la nomenclatura";
    }
    if (
      formData.nomenclatura !== formData.confirmar_nomenclatura &&
      formData.nomenclatura.trim() &&
      formData.confirmar_nomenclatura.trim()
    ) {
      newErrors.confirmar_nomenclatura = "Las nomenclaturas no coinciden";
    }
    if (!formData.nombre_documento.trim()) {
      newErrors.nombre_documento = "El nombre del documento es requerido";
    }
    if (
      formData.id_area === "" ||
      formData.id_area == null ||
      String(formData.id_area).trim() === ""
    ) {
      newErrors.id_area = "Debe seleccionar un área";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const validacion = validarArchivosAdjuntos(formData.archivos);
    if (!validacion.ok) {
      setSubmitError(validacion.error);
      return false;
    }
    setSubmitError("");
    return true;
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateStep1()) {
      return;
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const ctxRenombreArchivos = () => ({
    nomenclatura: formData.nomenclatura,
    nombreDocumento: formData.nombre_documento,
  });

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    event.target.value = "";
    const { archivos, mensajes } = combinarArchivosAlSubir(
      formData.archivos,
      files,
      ctxRenombreArchivos(),
    );
    mensajes.forEach((m) => alert(m));
    setFormData((prev) => ({ ...prev, archivos }));
  };

  const handleRemoveFile = (index) => {
    setFormData((prev) => {
      const archivos = prev.archivos.filter((_, i) => i !== index);
      return {
        ...prev,
        archivos: renombrarArchivosDocumento(archivos, ctxRenombreArchivos()),
      };
    });
  };

  const getFileIcon = (file) => {
    if (file.type.includes("pdf")) {
      return <PictureAsPdf sx={{ color: "#1976D2" }} />;
    } else if (
      file.type.includes("excel") ||
      file.type.includes("spreadsheet")
    ) {
      return <DescriptionOutlined sx={{ color: "#1976D2" }} />;
    } else if (file.type.includes("word") || file.type.includes("msword")) {
      return <Description sx={{ color: "#1976D2" }} />;
    } else if (
      file.type.includes("powerpoint") ||
      file.type.includes("presentation")
    ) {
      return <Slideshow sx={{ color: "#1976D2" }} />;
    }
    return <InsertDriveFile />;
  };

  const handleAbrirConfirmacionCorreo = () => {
    setSubmitError("");
    if (!validateStep1()) {
      setSubmitError("Complete o corrija la información básica");
      setActiveStep(0);
      return;
    }
    if (!validateStep2()) return;
    const { emp_id_solicitante } = getSolicitanteParaSolicitud();
    if (!emp_id_solicitante?.trim()) {
      setSubmitError(
        "No se encontró emp_id en la sesión (infoUser). Vuelva a iniciar sesión.",
      );
      return;
    }
    setPreviewCorreoParams({
      emp_id_solicitante: emp_id_solicitante.trim(),
      id_area: formData.id_area,
      id_documento: formData.id_documento || "",
    });
    setModalCorreoOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitError("");
    if (!validateStep1()) {
      setSubmitError("Complete o corrija la información básica");
      setActiveStep(0);
      return false;
    }
    if (!validateStep2()) {
      return false;
    }

    setLoading(true);
    setSubmitSuccess(false);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("fecha_alta", formData.fecha_alta);
      formDataToSend.append("nomenclatura", formData.nomenclatura);
      formDataToSend.append("nombre_documento", formData.nombre_documento);
      formDataToSend.append("id_area", String(formData.id_area));
      formDataToSend.append("tiempo_retencion", formData.tiempo_retencion);
      formDataToSend.append("ubicacion_registro", formData.ubicacion_registro);

      renombrarArchivosDocumento(formData.archivos, ctxRenombreArchivos()).forEach(
        (archivo) => {
          formDataToSend.append("archivos", archivo);
        },
      );

      if (saveAsSolicitud) {
        formDataToSend.append("tipo", "nuevo");
        const { emp_id_solicitante, solicitante } =
          getSolicitanteParaSolicitud();
        if (!emp_id_solicitante || !solicitante) {
          setSubmitError(
            "No se encontró emp_id o emp_nombre en la sesión (infoUser). Vuelva a iniciar sesión.",
          );
          setLoading(false);
          return false;
        }
        formDataToSend.append("emp_id_solicitante", emp_id_solicitante);
        formDataToSend.append("solicitante", solicitante);
        const partesMotivo = [
          "Alta de nuevo documento",
          formData.nombre_documento.trim(),
          formData.nomenclatura.trim(),
        ].filter((x) => x.length > 0);
        const motivoSolicitud =
          partesMotivo.join(" · ").slice(0, 300) || "Alta de nuevo documento";
        formDataToSend.append("motivo", motivoSolicitud);
      }

      const response = await fetch(
        saveAsSolicitud ? "/api/solicitudes" : "/api/documentos",
        {
          method: "POST",
          body: formDataToSend,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setSubmitError(
          data.error ||
            (saveAsSolicitud
              ? "Error al enviar la solicitud"
              : "Error al guardar el documento"),
        );
        return false;
      }

      setSubmitSuccess(true);
      setTimeout(async () => {
        let siguiente = "";
        try {
          const nr = await fetch("/api/documentos/next-id");
          const nd = await nr.json();
          if (nr.ok && nd.next_id) siguiente = String(nd.next_id);
        } catch {
          /* ignore */
        }
        setFormData({
          id_documento: siguiente,
          fecha_alta: new Date().toISOString().split("T")[0],
          nomenclatura: "",
          confirmar_nomenclatura: "",
          nombre_documento: "",
          tiempo_retencion: "",
          ubicacion_registro: "",
          id_area: "",
          archivos: [],
        });
        setErrors({});
        setActiveStep(0);
        setSubmitSuccess(false);
      }, 2000);
      return true;
    } catch (error) {
      console.error("Error al guardar documento:", error);
      setSubmitError("Error de conexión. Intente nuevamente.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <FormSection
              title="Identificación"
              subtitle="Datos generados automáticamente al registrar el documento."
            >
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="ID documento"
                    value={formData.id_documento}
                    disabled
                    sx={disabledFieldSx}
                    helperText="Consecutivo automático"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Fecha de alta"
                    type="date"
                    value={formData.fecha_alta}
                    disabled
                    InputLabelProps={{ shrink: true }}
                    sx={disabledFieldSx}
                  />
                </Grid>
              </Grid>
            </FormSection>

            <FormSection
              title="Nomenclatura"
              subtitle="Ingrese el código del documento y confírmelo."
            >
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nomenclatura"
                    value={formData.nomenclatura}
                    onChange={(e) =>
                      handleInputChange("nomenclatura", e.target.value)
                    }
                    error={!!errors.nomenclatura || nomenclaturaYaRegistrada}
                    helperText={
                      errors.nomenclatura ||
                      (nomenclaturaVerificando
                        ? "Verificando nomenclatura…"
                        : nomenclaturaYaRegistrada
                          ? ERROR_NOMENCLATURA_YA_REGISTRADA
                          : undefined)
                    }
                    required
                    sx={{
                      ...textFieldSx,
                      "& .MuiFormHelperText-root": {
                        color:
                          errors.nomenclatura || nomenclaturaYaRegistrada
                            ? "#b91c1c"
                            : "#757575",
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Confirmar nomenclatura"
                    value={formData.confirmar_nomenclatura}
                    onChange={(e) =>
                      handleInputChange(
                        "confirmar_nomenclatura",
                        e.target.value,
                      )
                    }
                    error={!!errors.confirmar_nomenclatura}
                    helperText={errors.confirmar_nomenclatura}
                    required
                    sx={{
                      ...textFieldSx,
                      "& .MuiFormHelperText-root": {
                        color: errors.confirmar_nomenclatura
                          ? "#b91c1c"
                          : "#757575",
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </FormSection>

            <FormSection
              title="Datos del documento"
              subtitle="Información principal del registro."
            >
              <Box sx={splitRowSx}>
                <Box sx={splitCol35Sx}>
                  <FormControl
                    fullWidth
                    required
                    error={!!errors.id_area}
                    disabled={areasLoading}
                    sx={{
                      ...textFieldSx,
                      "& .MuiSelect-icon": { color: "#757575" },
                    }}
                  >
                    <InputLabel id="nuevo-doc-id-area-label">
                      Área responsable
                    </InputLabel>
                    <Select
                      labelId="nuevo-doc-id-area-label"
                      label="Área responsable"
                      value={
                        formData.id_area === "" ? "" : String(formData.id_area)
                      }
                      onChange={(e) =>
                        handleInputChange("id_area", e.target.value)
                      }
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
                    {errors.id_area ? (
                      <FormHelperText sx={{ color: "#b91c1c" }}>
                        {errors.id_area}
                      </FormHelperText>
                    ) : areasLoading ? (
                      <FormHelperText>Cargando áreas…</FormHelperText>
                    ) : null}
                  </FormControl>
                </Box>
                <Box sx={splitCol65Sx}>
                  <TextField
                    fullWidth
                    label="Nombre del documento"
                    value={formData.nombre_documento}
                    onChange={(e) =>
                      handleInputChange("nombre_documento", e.target.value)
                    }
                    error={!!errors.nombre_documento}
                    helperText={errors.nombre_documento}
                    required
                    sx={{
                      ...textFieldSx,
                      "& .MuiFormHelperText-root": {
                        color: errors.nombre_documento ? "#b91c1c" : "#757575",
                      },
                    }}
                  />
                </Box>
              </Box>
            </FormSection>

            <FormSection
              title="Información adicional"
              subtitle="Campos opcionales de retención y ubicación."
            >
              <Box sx={splitRowSx}>
                <Box sx={splitCol35Sx}>
                  <CampoFechaRetencion
                    value={formData.tiempo_retencion}
                    onChange={(v) => handleInputChange("tiempo_retencion", v)}
                    textFieldSx={textFieldSx}
                  />
                </Box>
                <Box sx={splitCol65Sx}>
                  <TextField
                    fullWidth
                    label="Ubicación del registro"
                    value={formData.ubicacion_registro}
                    onChange={(e) =>
                      handleInputChange("ubicacion_registro", e.target.value)
                    }
                    placeholder="Ej. Servidor / carpeta"
                    sx={textFieldSx}
                  />
                </Box>
              </Box>
            </FormSection>
          </Box>
        );

      case 1:
        return (
          <Box>
            <FormSection
              title="Archivos del documento"
              subtitle={ARCHIVOS_ADJUNTOS_HINT}
            >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 4,
                border: "2px dashed rgba(25, 118, 210, 0.25)",
                borderRadius: 2,
                backgroundColor: "#FFFFFF",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "#1976D2",
                  backgroundColor: "rgba(25, 118, 210, 0.06)",
                },
              }}
            >
              <input
                accept={ACCEPT_ARCHIVOS_ADJUNTOS}
                style={{ display: "none" }}
                id="file-upload"
                multiple
                type="file"
                onChange={handleFileUpload}
                disabled={formData.archivos.length >= MAX_ARCHIVOS_ADJUNTOS}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<CloudUpload />}
                  disabled={formData.archivos.length >= MAX_ARCHIVOS_ADJUNTOS}
                  sx={{
                    backgroundColor: "#FFFFFF",
                    color: "#212121",
                    border: "1px solid #1976D2",
                    py: 1.5,
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
                  Cargar Archivos (Excel, PDF, Word, PowerPoint)
                </Button>
              </label>
              <Typography variant="caption" sx={{ color: "#757575", mt: 2 }}>
                {ARCHIVOS_ADJUNTOS_HINT}
              </Typography>
            </Box>
            </FormSection>

            {formData.archivos.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography sx={{ ...sectionTitleSx, mb: 1.5 }}>
                  Archivos cargados ({formData.archivos.length}/{MAX_ARCHIVOS_ADJUNTOS})
                </Typography>
                <Grid container spacing={2}>
                  {formData.archivos.map((file, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card
                        sx={{
                          backgroundColor: "#E3F2FD",
                          border: "1px solid rgba(25, 118, 210, 0.16)",
                        }}
                      >
                        <CardContent>
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
                              }}
                            >
                              {getFileIcon(file)}
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: "#1976D2",
                                    fontWeight: 500,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    maxWidth: "150px",
                                  }}
                                >
                                  {file.name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: "#757575" }}
                                >
                                  {(file.size / 1024).toFixed(2)} KB
                                </Typography>
                              </Box>
                            </Box>
                            <IconButton
                              onClick={() => handleRemoveFile(index)}
                              sx={{
                                color: "#1976D2",
                                "&:hover": {
                                  backgroundColor: "rgba(25, 118, 210, 0.09)",
                                },
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const paperContent = (
    <Paper
      elevation={8}
      sx={{
        p: 4,
        backgroundColor: "#ffffff",
        border: "1px solid rgba(25, 118, 210, 0.16)",
        borderRadius: 3,
        maxWidth: "960px",
        mx: "auto",
      }}
    >
      <Typography
        variant="h4"
        sx={{
          color: "#1976D2",
          fontWeight: 700,
          mb: 1,
          textAlign: "center",
        }}
      >
        {pageTitle}
      </Typography>
      {!saveAsSolicitud ? (
        <Typography
          variant="body2"
          sx={{
            color: "#757575",
            textAlign: "center",
            mb: 4,
          }}
        >
          Alta directa al catálogo de documentos.
        </Typography>
      ) : (
        <Typography
          variant="body2"
          sx={{
            color: "#757575",
            textAlign: "center",
            mb: 4,
          }}
        >
          Se guardará como solicitud hasta que sea aprobada en &quot;Ver
          solicitudes&quot;.
        </Typography>
      )}

      <Stepper activeStep={activeStep} sx={stepperSx}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ mb: 4, minHeight: 320 }}>
        {renderStepContent(activeStep)}
      </Box>

      {submitError && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            backgroundColor: "rgba(25, 118, 210, 0.09)",
            color: "#b91c1c",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            "& .MuiAlert-icon": {
              color: "#b91c1c",
            },
          }}
          onClose={() => setSubmitError("")}
        >
          {submitError}
        </Alert>
      )}

      {submitSuccess && (
        <Alert
          severity="success"
          sx={{
            mb: 2,
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            color: "#1976D2",
            border: "1px solid rgba(25, 118, 210, 0.22)",
            "& .MuiAlert-icon": {
              color: "#1976D2",
            },
          }}
        >
          {successMessage}
        </Alert>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: activeStep > 0 ? "space-between" : "flex-end",
        }}
      >
        {activeStep > 0 && (
          <Button
            disabled={loading}
            onClick={handleBack}
            sx={{ color: "#1976D2" }}
          >
            Atrás
          </Button>
        )}
        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={saveAsSolicitud ? handleAbrirConfirmacionCorreo : handleSubmit}
            disabled={loading}
            sx={{
              backgroundColor: "#E3F2FD",
              color: "#1976D2",
              border: "1px solid #1976D2",
              px: 4,
              py: 1,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: "none",
              "&:hover": {
                backgroundColor: "#BBDEFB",
                color: "#1976D2",
              },
              "&:disabled": {
                backgroundColor: "#e2e8f0",
                color: "#757575",
                borderColor: "#E0E0E0",
              },
            }}
          >
            {submitButtonText}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            sx={{
              backgroundColor: "#FFFFFF",
              color: "#212121",
              border: "1px solid #1976D2",
              px: 4,
              py: 1,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: "none",
              "&:hover": {
                backgroundColor: "#BBDEFB",
                color: "#1976D2",
              },
            }}
          >
            Siguiente
          </Button>
        )}
      </Box>

      <LoadingModal open={loading && !(saveAsSolicitud && modalCorreoOpen)} message={savingLabel} />

      {saveAsSolicitud && (
        <ModalConfirmarCorreoAprobadores
          open={modalCorreoOpen}
          onClose={() => setModalCorreoOpen(false)}
          onConfirm={async () => {
            const ok = await handleSubmit();
            if (ok) setModalCorreoOpen(false);
          }}
          previewParams={previewCorreoParams}
          confirming={loading}
          confirmingMessage={savingLabel}
        />
      )}
    </Paper>
  );

  if (hideHexagonMenu) {
    return paperContent;
  }

  return (
    <HexagonMenu selectedItemId="nuevo-documento">{paperContent}</HexagonMenu>
  );
}

export default NuevoDocumento;
