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
import { getSolicitanteParaSolicitud } from "./Solicitudes";

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
    id_area: "",
    archivos: [],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [areas, setAreas] = useState([]);
  const [areasLoading, setAreasLoading] = useState(true);

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
    setFormData((prev) => ({
      ...prev,
      [field]: value,
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
    // Validar que haya al menos un archivo
    if (formData.archivos.length === 0) {
      setSubmitError("Debe cargar al menos un archivo");
      return false;
    }
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

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "application/pdf", // .pdf
      "application/msword", // .doc
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/vnd.ms-powerpoint", // .ppt
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
    ];

    const validFiles = files.filter((file) => {
      if (!allowedTypes.includes(file.type)) {
        alert(
          `El archivo ${file.name} no es un formato válido. Solo se permiten Excel, PDF, Word y PowerPoint.`,
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
      return <PictureAsPdf sx={{ color: "#1e3a8a" }} />;
    } else if (
      file.type.includes("excel") ||
      file.type.includes("spreadsheet")
    ) {
      return <DescriptionOutlined sx={{ color: "#1e3a8a" }} />;
    } else if (file.type.includes("word") || file.type.includes("msword")) {
      return <Description sx={{ color: "#1e3a8a" }} />;
    } else if (
      file.type.includes("powerpoint") ||
      file.type.includes("presentation")
    ) {
      return <Slideshow sx={{ color: "#1e3a8a" }} />;
    }
    return <InsertDriveFile />;
  };

  const handleSubmit = async () => {
    setSubmitError("");
    if (!validateStep1()) {
      setSubmitError("Complete o corrija la información básica");
      setActiveStep(0);
      return;
    }
    if (!validateStep2()) {
      return;
    }

    setLoading(true);
    setSubmitSuccess(false);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("fecha_alta", formData.fecha_alta);
      formDataToSend.append("nomenclatura", formData.nomenclatura);
      formDataToSend.append("nombre_documento", formData.nombre_documento);
      formDataToSend.append("id_area", String(formData.id_area));

      formData.archivos.forEach((archivo) => {
        formDataToSend.append("archivos", archivo);
      });

      if (saveAsSolicitud) {
        formDataToSend.append("tipo", "nuevo");
        const { emp_id_solicitante, solicitante } =
          getSolicitanteParaSolicitud();
        if (!emp_id_solicitante || !solicitante) {
          setSubmitError(
            "No se encontró emp_id o emp_nombre en la sesión (infoUser). Vuelva a iniciar sesión.",
          );
          setLoading(false);
          return;
        }
        formDataToSend.append("emp_id_solicitante", emp_id_solicitante);
        formDataToSend.append("solicitante", solicitante);
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
        return;
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
          id_area: "",
          archivos: [],
        });
        setErrors({});
        setActiveStep(0);
        setSubmitSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error al guardar documento:", error);
      setSubmitError("Error de conexión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ID Documento"
                value={formData.id_documento}
                disabled
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "#f4f6ff",
                    color: "#1e3a8a",
                    "& fieldset": {
                      borderColor: "rgba(65, 105, 225, 0.16)",
                    },
                    "& .MuiInputBase-input": {
                      color: "#1e3a8a !important",
                    },
                    "& .MuiInputBase-input.Mui-disabled": {
                      WebkitTextFillColor: "#1e3a8a !important",
                      color: "#1e3a8a !important",
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "rgba(30, 58, 138, 0.75)",
                  },
                  "& .MuiFormHelperText-root": {
                    color: "rgba(30, 58, 138, 0.75)",
                  },
                }}
                helperText="Consecutivo sugerido; el definitivo se asigna al guardar"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Fecha de Alta"
                type="date"
                value={formData.fecha_alta}
                disabled
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "#f4f6ff",
                    color: "#1e3a8a",
                    "& fieldset": {
                      borderColor: "rgba(65, 105, 225, 0.16)",
                    },
                    "& .MuiInputBase-input": {
                      color: "#1e3a8a !important",
                    },
                    "& .MuiInputBase-input.Mui-disabled": {
                      WebkitTextFillColor: "#1e3a8a !important",
                      color: "#1e3a8a !important",
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "rgba(30, 58, 138, 0.75)",
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nomenclatura"
                value={formData.nomenclatura}
                onChange={(e) =>
                  handleInputChange("nomenclatura", e.target.value)
                }
                error={!!errors.nomenclatura}
                helperText={errors.nomenclatura}
                required
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "#f4f6ff",
                    color: "#1e3a8a",
                    "& fieldset": {
                      borderColor: "rgba(65, 105, 225, 0.16)",
                    },
                    "&:hover fieldset": {
                      borderColor: "#4169E1",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#4169E1",
                    },
                    "& .MuiInputBase-input": {
                      color: "#1e3a8a",
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "rgba(30, 58, 138, 0.75)",
                    "&.Mui-focused": {
                      color: "#1e3a8a",
                    },
                  },
                  "& .MuiFormHelperText-root": {
                    color: errors.nomenclatura
                      ? "#b91c1c"
                      : "rgba(30, 58, 138, 0.75)",
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Confirmar Código de Nomenclatura"
                value={formData.confirmar_nomenclatura}
                onChange={(e) =>
                  handleInputChange("confirmar_nomenclatura", e.target.value)
                }
                error={!!errors.confirmar_nomenclatura}
                helperText={errors.confirmar_nomenclatura}
                required
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "#f4f6ff",
                    color: "#1e3a8a",
                    "& fieldset": {
                      borderColor: "rgba(65, 105, 225, 0.16)",
                    },
                    "&:hover fieldset": {
                      borderColor: "#4169E1",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#4169E1",
                    },
                    "& .MuiInputBase-input": {
                      color: "#1e3a8a",
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "rgba(30, 58, 138, 0.75)",
                    "&.Mui-focused": {
                      color: "#1e3a8a",
                    },
                  },
                  "& .MuiFormHelperText-root": {
                    color: errors.confirmar_nomenclatura
                      ? "#b91c1c"
                      : "rgba(30, 58, 138, 0.75)",
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl
                fullWidth
                required
                error={!!errors.id_area}
                disabled={areasLoading}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "#f4f6ff",
                    color: "#1e3a8a",
                    "& fieldset": {
                      borderColor: "rgba(65, 105, 225, 0.16)",
                    },
                    "&:hover fieldset": {
                      borderColor: "#4169E1",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#4169E1",
                    },
                    "& .MuiSelect-icon": { color: "rgba(30, 58, 138, 0.75)" },
                  },
                  "& .MuiInputLabel-root": {
                    color: "rgba(30, 58, 138, 0.75)",
                    "&.Mui-focused": { color: "#1e3a8a" },
                  },
                }}
              >
                <InputLabel id="nuevo-doc-id-area-label">Área</InputLabel>
                <Select
                  labelId="nuevo-doc-id-area-label"
                  label="Área"
                  value={
                    formData.id_area === "" ? "" : String(formData.id_area)
                  }
                  onChange={(e) => handleInputChange("id_area", e.target.value)}
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
                  <FormHelperText sx={{ color: "rgba(30, 58, 138, 0.75)" }}>
                    Cargando áreas…
                  </FormHelperText>
                ) : (
                  <FormHelperText sx={{ color: "rgba(30, 58, 138, 0.75)" }}>
                    Solo se guarda el identificador del área; el responsable se
                    actualiza en configuración sin afectar documentos existentes
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre del Documento"
                value={formData.nombre_documento}
                onChange={(e) =>
                  handleInputChange("nombre_documento", e.target.value)
                }
                error={!!errors.nombre_documento}
                helperText={errors.nombre_documento}
                required
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "#f4f6ff",
                    color: "#1e3a8a",
                    "& fieldset": {
                      borderColor: "rgba(65, 105, 225, 0.16)",
                    },
                    "&:hover fieldset": {
                      borderColor: "#4169E1",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#4169E1",
                    },
                    "& .MuiInputBase-input": {
                      color: "#1e3a8a",
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "rgba(30, 58, 138, 0.75)",
                    "&.Mui-focused": {
                      color: "#1e3a8a",
                    },
                  },
                  "& .MuiFormHelperText-root": {
                    color: errors.nombre_documento
                      ? "#b91c1c"
                      : "rgba(30, 58, 138, 0.75)",
                  },
                }}
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
                justifyContent: "center",
                p: 4,
                border: "2px dashed rgba(65, 105, 225, 0.16)",
                borderRadius: 3,
                backgroundColor: "rgba(65, 105, 225, 0.08)",
                transition: "all 0.3s ease",
                "&:hover": {
                  borderColor: "#4169E1",
                  backgroundColor: "#f4f6ff",
                },
              }}
            >
              <input
                accept=".xlsx,.xls,.pdf,.doc,.docx,.ppt,.pptx"
                style={{ display: "none" }}
                id="file-upload"
                multiple
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<CloudUpload />}
                  sx={{
                    backgroundColor: "#e0e7ff",
                    color: "#1e3a8a",
                    border: "1px solid #4169E1",
                    py: 1.5,
                    px: 3,
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: "none",
                    "&:hover": {
                      backgroundColor: "#c7d2fe",
                      color: "#1e3a8a",
                    },
                  }}
                >
                  Cargar Archivos (Excel, PDF, Word, PowerPoint)
                </Button>
              </label>
              <Typography
                variant="caption"
                sx={{ color: "rgba(30, 58, 138, 0.75)", mt: 2 }}
              >
                Formatos permitidos: .xlsx, .xls, .pdf, .doc, .docx, .ppt, .pptx
              </Typography>
            </Box>

            {formData.archivos.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ color: "#1e3a8a", mb: 2 }}>
                  Archivos Cargados ({formData.archivos.length})
                </Typography>
                <Grid container spacing={2}>
                  {formData.archivos.map((file, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card
                        sx={{
                          backgroundColor: "#f4f6ff",
                          border: "1px solid rgba(65, 105, 225, 0.16)",
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
                                    color: "#1e3a8a",
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
                                  sx={{ color: "rgba(30, 58, 138, 0.75)" }}
                                >
                                  {(file.size / 1024).toFixed(2)} KB
                                </Typography>
                              </Box>
                            </Box>
                            <IconButton
                              onClick={() => handleRemoveFile(index)}
                              sx={{
                                color: "#1e3a8a",
                                "&:hover": {
                                  backgroundColor: "rgba(65, 105, 225, 0.09)",
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
        border: "1px solid rgba(65, 105, 225, 0.16)",
        borderRadius: 3,
        maxWidth: "900px",
        mx: "auto",
      }}
    >
      <Typography
        variant="h4"
        sx={{
          color: "#1e3a8a",
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
            color: "rgba(30, 58, 138, 0.75)",
            textAlign: "center",
            mb: 4,
          }}
        >
          Alta directa al catálogo de documentos (sin pasar por solicitudes).
        </Typography>
      ) : (
        <Typography
          variant="body2"
          sx={{
            color: "rgba(30, 58, 138, 0.75)",
            textAlign: "center",
            mb: 4,
          }}
        >
          Se guardará como solicitud hasta que sea aprobada en &quot;Ver
          solicitudes&quot;.
        </Typography>
      )}

      <Stepper
        activeStep={activeStep}
        sx={{
          mb: 4,
          "& .MuiStepLabel-root .Mui-completed": {
            color: "#1e3a8a",
          },
          "& .MuiStepLabel-label.Mui-completed": {
            color: "#475569",
          },
          "& .MuiStepLabel-root .Mui-active": {
            color: "#1e3a8a",
          },
          "& .MuiStepLabel-label.Mui-active": {
            color: "#1e3a8a",
          },
          "& .MuiStepLabel-root .Mui-disabled": {
            color: "rgba(255,255,255,0.5)",
          },
          "& .MuiStepIcon-root": {
            color: "rgba(255,255,255,0.5)",
            "&.Mui-active": {
              color: "#1e3a8a",
            },
            "&.Mui-completed": {
              color: "#1e3a8a",
            },
          },
        }}
      >
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ mb: 4, minHeight: "300px" }}>
        {renderStepContent(activeStep)}
      </Box>

      {submitError && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            backgroundColor: "rgba(65, 105, 225, 0.09)",
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
            color: "#1e3a8a",
            border: "1px solid rgba(65, 105, 225, 0.22)",
            "& .MuiAlert-icon": {
              color: "#1e3a8a",
            },
          }}
        >
          {successMessage}
        </Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Button
          disabled={activeStep === 0 || loading}
          onClick={handleBack}
          sx={{
            color: "#1e3a8a",
            "&:disabled": {
              color: "rgba(30, 58, 138, 0.35)",
            },
          }}
        >
          Atrás
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            sx={{
              backgroundColor: loading ? "#cbd5e1" : "#e0e7ff",
              color: "#1e3a8a",
              border: loading ? "1px solid #94a3b8" : "1px solid #4169E1",
              px: 4,
              py: 1,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: "none",
              "&:hover": {
                backgroundColor: loading ? "#cbd5e1" : "#c7d2fe",
                color: "#1e3a8a",
              },
              "&:disabled": {
                backgroundColor: "#e2e8f0",
                color: "#64748b",
                borderColor: "#cbd5e1",
              },
            }}
          >
            {loading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={20} sx={{ color: "#1e3a8a" }} />
                {savingLabel}
              </Box>
            ) : (
              submitButtonText
            )}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            sx={{
              backgroundColor: "#e0e7ff",
              color: "#1e3a8a",
              border: "1px solid #4169E1",
              px: 4,
              py: 1,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: "none",
              "&:hover": {
                backgroundColor: "#c7d2fe",
                color: "#1e3a8a",
              },
            }}
          >
            Siguiente
          </Button>
        )}
      </Box>
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
