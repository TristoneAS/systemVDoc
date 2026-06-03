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
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Chip,
} from "@mui/material";
import {
  CloudUpload,
  Delete,
  Description,
  DescriptionOutlined,
  PictureAsPdf,
  InsertDriveFile,
  Slideshow,
  Search,
  EditNote,
  PostAdd,
  ArrowBack,
} from "@mui/icons-material";
import HexagonMenu from "./HexagonMenu";
import NuevoDocumento from "./NuevoDocumento";
import ModalConfirmarCorreoAprobadores from "./ModalConfirmarCorreoAprobadores";
import { getSolicitanteParaSolicitud } from "./Solicitudes";

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

const stepsCambio = ["Documento y motivo", "Cargar archivos"];

function SolicitudCambioDocumento({ onVolver }) {
  const [activeStep, setActiveStep] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [tiempo_retencion, setTiempoRetencion] = useState("");
  const [ubicacion_registro, setUbicacionRegistro] = useState("");
  const [formData, setFormData] = useState({
    archivos: [],
  });
  const [empIdSolicitante, setEmpIdSolicitante] = useState("");
  const [nombreSolicitante, setNombreSolicitante] = useState("");
  const [loadingSolicitante, setLoadingSolicitante] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [modalCorreoOpen, setModalCorreoOpen] = useState(false);
  const [previewCorreoParams, setPreviewCorreoParams] = useState(null);

  useEffect(() => {
    try {
      const infoUserStr = localStorage.getItem("infoUser");
      if (infoUserStr) {
        const infoUser = JSON.parse(infoUserStr);
        if (infoUser.emp_id) {
          const id = infoUser.emp_id.toString();
          setEmpIdSolicitante(id);
        }
        if (infoUser.emp_nombre) {
          setNombreSolicitante(String(infoUser.emp_nombre).trim());
        } else if (infoUser.emp_id) {
          setTimeout(
            () => buscarEmpleadoSolicitante(String(infoUser.emp_id)),
            100,
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const buscarEmpleadoSolicitante = async (empId) => {
    if (!empId?.trim()) return;
    setLoadingSolicitante(true);
    try {
      const response = await fetch(`/api/empleados/${empId.trim()}`);
      const data = await response.json();
      if (response.ok) {
        setNombreSolicitante(data.nombre || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSolicitante(false);
    }
  };

  const handleBuscarDocumentos = async () => {
    const q = busqueda.trim();
    if (!q) {
      setErrorBusqueda("Escriba una nomenclatura o parte de ella");
      return;
    }
    setBuscando(true);
    setErrorBusqueda("");
    setResultados([]);
    setDocumentoSeleccionado(null);
    setTiempoRetencion("");
    setUbicacionRegistro("");
    try {
      const response = await fetch(
        `/api/documentos?nomenclatura=${encodeURIComponent(q)}`,
      );
      const json = await response.json();
      if (!response.ok) {
        setErrorBusqueda(json.error || "Error al buscar");
        return;
      }
      const list = json.data || [];
      setResultados(list);
      if (list.length === 0) {
        setErrorBusqueda("No se encontraron documentos con esa nomenclatura");
      } else if (list.length === 1) {
        setDocumentoSeleccionado(list[0]);
        setTiempoRetencion(String(list[0].tiempo_retencion ?? ""));
        setUbicacionRegistro(String(list[0].ubicacion_registro ?? ""));
      }
    } catch (e) {
      setErrorBusqueda("Error de conexión al buscar documentos");
    } finally {
      setBuscando(false);
    }
  };

  const validateStep0 = () => {
    const e = {};
    if (!documentoSeleccionado) {
      e.documento = "Seleccione un documento de la lista";
    }
    if (!motivo.trim()) {
      e.motivo = "Describa el motivo o alcance del cambio";
    }
    const { emp_id_solicitante: eid, solicitante: nom } =
      getSolicitanteParaSolicitud();
    if (!eid.trim() || !nom.trim()) {
      e.solicitante =
        "No hay emp_id o emp_nombre en la sesión (infoUser). Inicie sesión de nuevo.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep1 = () => {
    if (formData.archivos.length === 0) {
      setSubmitError("Adjunte al menos un archivo de referencia o borrador");
      return false;
    }
    setSubmitError("");
    return true;
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateStep0()) return;
    setActiveStep((s) => s + 1);
  };

  const handleBack = () => {
    setActiveStep((s) => s - 1);
  };

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
    const validFiles = files.filter((file) => {
      if (!allowedTypes.includes(file.type)) {
        alert(
          `El archivo ${file.name} no es un formato válido. Solo Excel, PDF, Word y PowerPoint.`,
        );
        return false;
      }
      return true;
    });
    setFormData((prev) => ({
      ...prev,
      archivos: [...prev.archivos, ...validFiles],
    }));
  };

  const handleRemoveFile = (index) => {
    setFormData((prev) => ({
      ...prev,
      archivos: prev.archivos.filter((_, i) => i !== index),
    }));
  };

  const getFileIcon = (file) => {
    if (file.type.includes("pdf")) {
      return <PictureAsPdf sx={{ color: "#1976D2" }} />;
    }
    if (file.type.includes("excel") || file.type.includes("spreadsheet")) {
      return <DescriptionOutlined sx={{ color: "#1976D2" }} />;
    }
    if (file.type.includes("word") || file.type.includes("msword")) {
      return <Description sx={{ color: "#1976D2" }} />;
    }
    if (
      file.type.includes("powerpoint") ||
      file.type.includes("presentation")
    ) {
      return <Slideshow sx={{ color: "#1976D2" }} />;
    }
    return <InsertDriveFile />;
  };

  const handleAbrirConfirmacionCorreo = () => {
    if (!validateStep1()) return;
    const { emp_id_solicitante } = getSolicitanteParaSolicitud();
    if (!emp_id_solicitante?.trim()) {
      setSubmitError(
        "No hay emp_id del solicitante en la sesión (infoUser). Inicie sesión de nuevo.",
      );
      return;
    }
    setPreviewCorreoParams({
      emp_id_solicitante: emp_id_solicitante.trim(),
      id_area: documentoSeleccionado?.id_area ?? "",
      id_documento: documentoSeleccionado?.id_documento ?? "",
    });
    setModalCorreoOpen(true);
  };

  const handleSubmit = async () => {
    if (!validateStep1()) {
      return;
    }

    setLoading(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const fd = new FormData();
      fd.append("tipo", "cambio");
      fd.append("id_documento", documentoSeleccionado.id_documento);
      fd.append("id_area", documentoSeleccionado.id_area || "");
      fd.append("nomenclatura", documentoSeleccionado.nomenclatura || "");
      fd.append(
        "nombre_documento",
        documentoSeleccionado.nombre_documento || "",
      );
      fd.append("motivo", motivo);
      const { emp_id_solicitante, solicitante } = getSolicitanteParaSolicitud();
      if (!emp_id_solicitante?.trim() || !solicitante?.trim()) {
        setSubmitError(
          "No hay emp_id o emp_nombre del solicitante en la sesión (infoUser). Inicie sesión de nuevo.",
        );
        setLoading(false);
        return;
      }
      fd.append("emp_id_solicitante", emp_id_solicitante.trim());
      fd.append("solicitante", solicitante.trim());
      fd.append("tiempo_retencion", tiempo_retencion);
      fd.append("ubicacion_registro", ubicacion_registro);
      formData.archivos.forEach((f) => fd.append("archivos", f));

      const response = await fetch("/api/solicitudes", {
        method: "POST",
        body: fd,
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data.error || "Error al enviar la solicitud");
        return;
      }
      setSubmitSuccess(true);
      setTimeout(() => {
        setMotivo("");
        setTiempoRetencion("");
        setUbicacionRegistro("");
        setDocumentoSeleccionado(null);
        setResultados([]);
        setBusqueda("");
        setFormData({ archivos: [] });
        setActiveStep(0);
        setSubmitSuccess(false);
      }, 2200);
    } catch (e) {
      setSubmitError("Error de conexión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <TextField
                  fullWidth
                  label="Buscar por nomenclatura"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleBuscarDocumentos()
                  }
                  placeholder="Ej. código o parte del código"
                  sx={{ flex: 1, minWidth: 200, ...textFieldSx }}
                />
                <Button
                  variant="contained"
                  startIcon={
                    buscando ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <Search />
                    )
                  }
                  onClick={handleBuscarDocumentos}
                  disabled={buscando}
                  sx={{
                    backgroundColor: "#E3F2FD",
                    color: "#1976D2",
                    border: "1px solid #1976D2",
                    textTransform: "none",
                    fontWeight: 600,
                    px: 3,
                    alignSelf: "flex-start",
                    mt: 0.5,
                    "&:hover": { backgroundColor: "#BBDEFB", color: "#1976D2" },
                  }}
                >
                  Buscar
                </Button>
              </Box>
              {errorBusqueda && (
                <Typography sx={{ color: "#b91c1c", mt: 1 }} variant="body2">
                  {errorBusqueda}
                </Typography>
              )}
            </Grid>
            {resultados.length > 1 && (
              <Grid item xs={12}>
                <Typography sx={{ color: "#757575", mb: 1 }}>
                  Seleccione el documento:
                </Typography>
                <List
                  dense
                  sx={{
                    bgcolor: "#E3F2FD",
                    borderRadius: 2,
                    border: "1px solid rgba(25, 118, 210, 0.16)",
                  }}
                >
                  {resultados.map((doc) => (
                    <ListItemButton
                      key={doc.id_documento}
                      selected={
                        documentoSeleccionado?.id_documento === doc.id_documento
                      }
                      onClick={() => {
                        setDocumentoSeleccionado(doc);
                        setTiempoRetencion(String(doc.tiempo_retencion ?? ""));
                        setUbicacionRegistro(
                          String(doc.ubicacion_registro ?? ""),
                        );
                      }}
                    >
                      <ListItemText
                        primary={doc.nombre_documento}
                        secondary={`${doc.nomenclatura} · ${doc.id_documento}`}
                        primaryTypographyProps={{ sx: { color: "#1976D2" } }}
                        secondaryTypographyProps={{ sx: { color: "#757575" } }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Grid>
            )}
            {documentoSeleccionado && (
              <Grid item xs={12}>
                <Card
                  sx={{
                    bgcolor: "#E3F2FD",
                    border: "1px solid rgba(25, 118, 210, 0.2)",
                  }}
                >
                  <CardContent>
                    <Typography
                      sx={{ color: "#616161", fontWeight: 600, mb: 1 }}
                    >
                      Documento seleccionado
                    </Typography>
                    <Typography sx={{ color: "#1976D2" }}>
                      {documentoSeleccionado.nombre_documento}
                    </Typography>
                    <Box
                      sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}
                    >
                      <Chip
                        size="small"
                        label={documentoSeleccionado.nomenclatura}
                        sx={{
                          bgcolor: "rgba(25, 118, 210, 0.14)",
                          color: "#BBDEFB",
                        }}
                      />
                      <Chip
                        size="small"
                        label={documentoSeleccionado.id_documento}
                        sx={{
                          bgcolor: "rgba(25, 118, 210, 0.14)",
                          color: "#1976D2",
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tiempo de retención"
                value={tiempo_retencion}
                onChange={(e) => setTiempoRetencion(e.target.value)}
                inputProps={{ maxLength: 200 }}
                helperText="Si informa valores, al aprobar el cambio se actualizarán en el catálogo (opcional)"
                sx={{ ...textFieldSx }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ubicación del registro"
                value={ubicacion_registro}
                onChange={(e) => setUbicacionRegistro(e.target.value)}
                inputProps={{ maxLength: 200 }}
                helperText="Opcional · máx. 200 caracteres"
                sx={{ ...textFieldSx }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={4}
                label="Motivo y descripción del cambio"
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  if (errors.motivo) {
                    setErrors((prev) => {
                      const n = { ...prev };
                      delete n.motivo;
                      return n;
                    });
                  }
                }}
                inputProps={{ maxLength: 300 }}
                error={!!errors.motivo}
                helperText={
                  errors.motivo ||
                  "Indique qué debe actualizarse y el contexto del cambio (máx. 300 caracteres)"
                }
                required
                sx={{
                  ...textFieldSx,
                  "& .MuiFormHelperText-root": {
                    color: errors.motivo ? "#b91c1c" : "#757575",
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ID Empleado Solicitante"
                value={empIdSolicitante}
                disabled
                helperText={
                  errors.solicitante ||
                  (loadingSolicitante ? "Cargando…" : "Desde tu perfil")
                }
                sx={textFieldSx}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Solicitante"
                value={nombreSolicitante}
                disabled
                sx={textFieldSx}
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Box>
            <Box
              sx={{
                mb: 3,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                p: 4,
                border: "2px dashed rgba(25, 118, 210, 0.16)",
                borderRadius: 3,
                bgcolor: "rgba(25, 118, 210, 0.08)",
              }}
            >
              <input
                accept=".xlsx,.xls,.pdf,.doc,.docx,.ppt,.pptx"
                style={{ display: "none" }}
                id="file-upload-cambio"
                multiple
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor="file-upload-cambio">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<CloudUpload />}
                  sx={{
                    backgroundColor: "#E3F2FD",
                    color: "#1976D2",
                    border: "1px solid #1976D2",
                    py: 1.5,
                    px: 3,
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: "none",
                    "&:hover": { backgroundColor: "#BBDEFB", color: "#1976D2" },
                  }}
                >
                  Adjuntar archivos (borradores o evidencia)
                </Button>
              </label>
              <Typography variant="caption" sx={{ color: "#757575", mt: 2 }}>
                .xlsx, .xls, .pdf, .doc, .docx, .ppt, .pptx
              </Typography>
            </Box>
            {formData.archivos.length > 0 && (
              <Grid container spacing={2}>
                {formData.archivos.map((file, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card
                      sx={{
                        bgcolor: "#E3F2FD",
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
                                  maxWidth: 150,
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
                            sx={{ color: "#1976D2" }}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Paper
      elevation={8}
      sx={{
        p: 4,
        backgroundColor: "#ffffff",
        border: "1px solid rgba(25, 118, 210, 0.16)",
        borderRadius: 3,
        maxWidth: "900px",
        mx: "auto",
      }}
    >
      <Button
        startIcon={<ArrowBack />}
        onClick={onVolver}
        sx={{ color: "#616161", mb: 2, textTransform: "none" }}
      >
        Volver a opciones
      </Button>
      <Typography
        variant="h4"
        sx={{ color: "#1976D2", fontWeight: 700, mb: 1, textAlign: "center" }}
      >
        Cambio de documento existente
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: "#757575", textAlign: "center", mb: 3 }}
      >
        Busque el documento por nomenclatura, describa el cambio y adjunte los
        archivos para enviar la solicitud.
      </Typography>

      <Stepper
        activeStep={activeStep}
        sx={{
          mb: 4,
          "& .MuiStepLabel-root .Mui-completed": { color: "#1976D2" },
          "& .MuiStepLabel-label.Mui-completed": { color: "#757575" },
          "& .MuiStepLabel-root .Mui-active": { color: "#1976D2" },
          "& .MuiStepLabel-label.Mui-active": { color: "#1976D2" },
          "& .MuiStepIcon-root": {
            color: "rgba(255,255,255,0.5)",
            "&.Mui-active, &.Mui-completed": { color: "#1976D2" },
          },
        }}
      >
        {stepsCambio.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ mb: 4, minHeight: 280 }}>{renderStep()}</Box>

      {submitError && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            bgcolor: "rgba(25, 118, 210, 0.09)",
            color: "#b91c1c",
            border: "1px solid rgba(239, 68, 68, 0.3)",
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
            bgcolor: "rgba(34, 197, 94, 0.1)",
            color: "#1976D2",
            border: "1px solid rgba(34, 197, 94, 0.3)",
          }}
        >
          Solicitud registrada. Queda pendiente de aprobación.
        </Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Button
          disabled={activeStep === 0 || loading}
          onClick={handleBack}
          sx={{ color: "#1976D2" }}
        >
          Atrás
        </Button>
        {activeStep === stepsCambio.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleAbrirConfirmacionCorreo}
            disabled={loading}
            sx={{
              backgroundColor: loading ? "#E0E0E0" : "#E3F2FD",
              color: "#1976D2",
              border: loading ? "1px solid #9E9E9E" : "1px solid #1976D2",
              px: 4,
              py: 1,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: "none",
              "&:hover": {
                backgroundColor: loading ? "#E0E0E0" : "#BBDEFB",
                color: "#1976D2",
              },
            }}
          >
            {loading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                Enviando…
              </Box>
            ) : (
              "Enviar solicitud de cambio"
            )}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            sx={{
              backgroundColor: "#E3F2FD",
              color: "#1976D2",
              border: "1px solid #1976D2",
              px: 4,
              py: 1,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: "none",
              "&:hover": { backgroundColor: "#BBDEFB", color: "#1976D2" },
            }}
          >
            Siguiente
          </Button>
        )}
      </Box>

      <ModalConfirmarCorreoAprobadores
        open={modalCorreoOpen}
        onClose={() => setModalCorreoOpen(false)}
        onConfirm={async () => {
          setModalCorreoOpen(false);
          await handleSubmit();
        }}
        previewParams={previewCorreoParams}
        confirming={loading}
      />
    </Paper>
  );
}

function CrearSolicitud() {
  const [opcion, setOpcion] = useState(null);

  return (
    <HexagonMenu selectedItemId="crear-solicitud">
      <Box sx={{ maxWidth: 960, mx: "auto", px: { xs: 1, sm: 2 } }}>
        {opcion === null && (
          <>
            <Typography
              variant="h4"
              sx={{
                color: "#1976D2",
                fontWeight: 700,
                mb: 1,
                textAlign: "center",
              }}
            >
              Crear solicitud
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: "#757575", textAlign: "center", mb: 4 }}
            >
              Elija el tipo de trámite que desea iniciar.
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    height: "100%",
                    cursor: "pointer",
                    backgroundColor: "#E3F2FD",
                    border: "1px solid rgba(25, 118, 210, 0.2)",
                    borderRadius: 3,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: "#1976D2",
                      boxShadow: "0 8px 32px rgba(25, 118, 210, 0.1)",
                    },
                  }}
                  onClick={() => setOpcion("cambio")}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: "rgba(25, 118, 210, 0.1)",
                          color: "#1976D2",
                        }}
                      >
                        <EditNote sx={{ fontSize: 36 }} />
                      </Box>
                      <Typography
                        variant="h6"
                        sx={{ color: "#1976D2", fontWeight: 600 }}
                      >
                        Cambio de documento existente
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: "#757575" }}>
                      Busque por nomenclatura y registre el cambio como
                      solicitud. Tras la aprobación, los archivos se incorporan
                      al documento existente en el catálogo.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    height: "100%",
                    cursor: "pointer",
                    backgroundColor: "#E3F2FD",
                    border: "1px solid rgba(25, 118, 210, 0.2)",
                    borderRadius: 3,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: "#1976D2",
                      boxShadow: "0 8px 32px rgba(25, 118, 210, 0.1)",
                    },
                  }}
                  onClick={() => setOpcion("nuevo")}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: "rgba(52,211,153,0.12)",
                          color: "#34D399",
                        }}
                      >
                        <PostAdd sx={{ fontSize: 36 }} />
                      </Box>
                      <Typography
                        variant="h6"
                        sx={{ color: "#1976D2", fontWeight: 600 }}
                      >
                        Solicitud de nuevo documento
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: "#757575" }}>
                      Ingrese la información básica y adjunte los archivos. Su
                      solicitud se guardará en la tabla de documentos hasta que
                      sea aprobada por todos los aprobadores correspondientes.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}

        {opcion === "nuevo" && (
          <Box>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => setOpcion(null)}
              sx={{ color: "#616161", mb: 2, textTransform: "none" }}
            >
              Volver a opciones
            </Button>
            <NuevoDocumento
              hideHexagonMenu
              saveAsSolicitud
              pageTitle="Solicitud de nuevo documento"
              submitButtonText="Enviar solicitud"
              successMessage="Solicitud registrada. Queda pendiente de aprobación."
              savingLabel="Enviando…"
            />
          </Box>
        )}

        {opcion === "cambio" && (
          <SolicitudCambioDocumento onVolver={() => setOpcion(null)} />
        )}
      </Box>
    </HexagonMenu>
  );
}

export default CrearSolicitud;
