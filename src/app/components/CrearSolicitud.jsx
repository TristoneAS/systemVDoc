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
import {
  ACCEPT_ARCHIVOS_ADJUNTOS,
  ARCHIVOS_ADJUNTOS_HINT,
  MAX_ARCHIVOS_ADJUNTOS,
  combinarArchivosAlSubir,
  validarArchivosAdjuntos,
  renombrarArchivosDocumento,
} from "@/libs/archivos_adjuntos";
import CampoFechaRetencion from "./CampoFechaRetencion";
import { retencionValorParaForm, RETENCION_AL_MAS_ACTUAL_VALOR } from "@/libs/tiempo_retencion";
import {
  descargarArchivosDocumentoComoFiles,
  leerPrefillSolicitudCambio,
  limpiarPrefillSolicitudCambio,
  tienePrefillSolicitudCambio,
} from "@/libs/prefill_solicitud_cambio";

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
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [prefillDesdePorVencer, setPrefillDesdePorVencer] = useState(false);
  const [prefillError, setPrefillError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const prefill = leerPrefillSolicitudCambio();
      if (!prefill?.documento?.id_documento) return;

      setPrefillLoading(true);
      setPrefillError("");
      setPrefillDesdePorVencer(true);

      const doc = prefill.documento;
      setBusqueda(String(doc.nomenclatura ?? ""));
      setDocumentoSeleccionado(doc);
      setResultados([doc]);
      setUbicacionRegistro(
        String(
          prefill.ubicacion_registro ?? doc.ubicacion_registro ?? "",
        ).trim(),
      );
      setTiempoRetencion("");
      setMotivo(String(prefill.motivo ?? "").trim());

      try {
        const archivosMeta = prefill.archivos ?? [];
        if (archivosMeta.length > 0) {
          const files = await descargarArchivosDocumentoComoFiles(archivosMeta);
          if (!cancelled) {
            setFormData({
              archivos: renombrarArchivosDocumento(files, {
                nomenclatura: doc.nomenclatura ?? "",
                nombreDocumento: doc.nombre_documento ?? "",
              }),
            });
          }
        }
      } catch (e) {
        if (!cancelled) {
          setPrefillError(
            e?.message ||
              "No se pudieron cargar todos los archivos del documento.",
          );
        }
      } finally {
        if (!cancelled) {
          limpiarPrefillSolicitudCambio();
        }
        setPrefillLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      setPrefillLoading(false);
    };
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setErrorBusqueda("Escriba la nomenclatura completa");
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
        setTiempoRetencion(retencionValorParaForm(list[0].tiempo_retencion));
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
    const validacion = validarArchivosAdjuntos(formData.archivos);
    if (!validacion.ok) {
      setSubmitError(validacion.error);
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

  const ctxRenombreArchivos = () => ({
    nomenclatura: documentoSeleccionado?.nomenclatura ?? "",
    nombreDocumento: documentoSeleccionado?.nombre_documento ?? "",
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
      return false;
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
        return false;
      }
      fd.append("emp_id_solicitante", emp_id_solicitante.trim());
      fd.append("solicitante", solicitante.trim());
      fd.append("tiempo_retencion", tiempo_retencion);
      fd.append("ubicacion_registro", ubicacion_registro);
      renombrarArchivosDocumento(formData.archivos, ctxRenombreArchivos()).forEach(
        (f) => fd.append("archivos", f),
      );

      const response = await fetch("/api/solicitudes", {
        method: "POST",
        body: fd,
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data.error || "Error al enviar la solicitud");
        return false;
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
      return true;
    } catch (e) {
      setSubmitError("Error de conexión. Intente nuevamente.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <FormSection
              title="Buscar documento"
              subtitle="Escriba la nomenclatura exacta y seleccione el registro."
            >
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                <TextField
                  fullWidth
                  label="Buscar por nomenclatura"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value.toUpperCase())}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleBuscarDocumentos()
                  }
                  placeholder="Ej. código completo del documento"
                  sx={{ flex: 1, minWidth: 200, ...textFieldSx }}
                />
                <Button
                  variant="contained"
                  startIcon={<Search />}
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
                <Typography sx={{ color: "#b91c1c", mt: 1.5 }} variant="body2">
                  {errorBusqueda}
                </Typography>
              )}
              {resultados.length > 1 && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    sx={{ color: "#757575", mb: 1, fontSize: "0.875rem" }}
                  >
                    Seleccione el documento:
                  </Typography>
                  <List
                    dense
                    sx={{
                      bgcolor: "#FFFFFF",
                      borderRadius: 2,
                      border: "1px solid rgba(25, 118, 210, 0.16)",
                    }}
                  >
                    {resultados.map((doc) => (
                      <ListItemButton
                        key={doc.id_documento}
                        selected={
                          documentoSeleccionado?.id_documento ===
                          doc.id_documento
                        }
                        onClick={() => {
                          setDocumentoSeleccionado(doc);
                          setTiempoRetencion(
                            retencionValorParaForm(doc.tiempo_retencion),
                          );
                          setUbicacionRegistro(
                            String(doc.ubicacion_registro ?? ""),
                          );
                        }}
                      >
                        <ListItemText
                          primary={doc.nombre_documento}
                          secondary={`${doc.nomenclatura} · ${doc.id_documento}`}
                          primaryTypographyProps={{ sx: { color: "#1976D2" } }}
                          secondaryTypographyProps={{
                            sx: { color: "#757575" },
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Box>
              )}
              {documentoSeleccionado && (
                <Card
                  sx={{
                    mt: 2,
                    bgcolor: "#FFFFFF",
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
                          color: "#1976D2",
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
              )}
            </FormSection>

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
                error={!!errors.motivo}
                helperText={errors.motivo}
                required
                sx={{
                  ...textFieldSx,
                  "& .MuiFormHelperText-root": {
                    color: errors.motivo ? "#b91c1c" : "#757575",
                  },
                }}
              />
            </FormSection>

            <FormSection
              title="Información adicional"
              subtitle="Opcional. Al aprobar el cambio, estos valores se actualizarán en el catálogo."
            >
              <Box sx={splitRowSx}>
                <Box sx={splitCol35Sx}>
                  <CampoFechaRetencion
                    value={tiempo_retencion}
                    onChange={setTiempoRetencion}
                    textFieldSx={textFieldSx}
                    helperText={
                      prefillDesdePorVencer
                        ? "Indique la nueva fecha de retención del documento."
                        : tiempo_retencion === RETENCION_AL_MAS_ACTUAL_VALOR
                          ? "Desmarque «Al más actual» para ingresar otra fecha."
                          : undefined
                    }
                  />
                </Box>
                <Box sx={splitCol65Sx}>
                  <TextField
                    fullWidth
                    label="Ubicación del registro"
                    value={ubicacion_registro}
                    onChange={(e) => setUbicacionRegistro(e.target.value)}
                    placeholder="Ej. Servidor / carpeta"
                    sx={textFieldSx}
                  />
                </Box>
              </Box>
            </FormSection>

            <FormSection
              title="Solicitante"
              subtitle="Datos tomados de su perfil de sesión."
            >
              <Box sx={splitRowSx}>
                <Box sx={splitCol35Sx}>
                  <TextField
                    fullWidth
                    label="ID empleado solicitante"
                    value={empIdSolicitante}
                    disabled
                    helperText={
                      errors.solicitante ||
                      (loadingSolicitante ? "Cargando…" : undefined)
                    }
                    sx={disabledFieldSx}
                  />
                </Box>
                <Box sx={splitCol65Sx}>
                  <TextField
                    fullWidth
                    label="Solicitante"
                    value={nombreSolicitante}
                    disabled
                    sx={disabledFieldSx}
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
              title="Archivos del cambio"
              subtitle={ARCHIVOS_ADJUNTOS_HINT}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  p: 4,
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
                  accept={ACCEPT_ARCHIVOS_ADJUNTOS}
                  style={{ display: "none" }}
                  id="file-upload-cambio"
                  multiple
                  type="file"
                  onChange={handleFileUpload}
                  disabled={formData.archivos.length >= MAX_ARCHIVOS_ADJUNTOS}
                />
                <label htmlFor="file-upload-cambio">
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
                    Cargar archivos
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
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
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
              </Box>
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
        maxWidth: "960px",
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

      {prefillDesdePorVencer && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Datos cargados desde documentos por vencer. Indique la{" "}
          <strong>nueva fecha de retención</strong> antes de enviar la solicitud.
        </Alert>
      )}

      {prefillError && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          onClose={() => setPrefillError("")}
        >
          {prefillError}
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={stepperSx}>
        {stepsCambio.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ mb: 4, minHeight: 320 }}>{renderStep()}</Box>

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
        {activeStep === stepsCambio.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleAbrirConfirmacionCorreo}
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
                backgroundColor: "#E0E0E0",
                color: "#757575",
                borderColor: "#BDBDBD",
              },
            }}
          >
            Enviar solicitud de cambio
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

      <LoadingModal open={buscando} message="Buscando documento…" />
      <LoadingModal
        open={loading && !modalCorreoOpen}
        message="Enviando solicitud…"
      />
      <LoadingModal
        open={prefillLoading}
        message="Cargando datos del documento…"
      />

        <ModalConfirmarCorreoAprobadores
          open={modalCorreoOpen}
          onClose={() => setModalCorreoOpen(false)}
          onConfirm={async () => {
            const ok = await handleSubmit();
            if (ok) setModalCorreoOpen(false);
          }}
          previewParams={previewCorreoParams}
          confirming={loading}
          confirmingMessage="Enviando solicitud…"
        />
    </Paper>
  );
}

function CrearSolicitud() {
  const [opcion, setOpcion] = useState(null);

  useEffect(() => {
    if (tienePrefillSolicitudCambio()) {
      setOpcion("cambio");
    }
  }, []);

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
              <Grid size={{ xs: 12, md: 6 }}>
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
              <Grid size={{ xs: 12, md: 6 }}>
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
