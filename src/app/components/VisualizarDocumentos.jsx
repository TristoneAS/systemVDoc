"use client";

import React, { useState, useEffect } from "react";
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
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  Search,
  Visibility,
  Download,
  Description,
  PictureAsPdf,
  InsertDriveFile,
  DescriptionOutlined,
  OpenInNew,
  Close,
  Slideshow,
} from "@mui/icons-material";
import HexagonMenu from "./HexagonMenu";

function VisualizarDocumentos() {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDocumento, setSelectedDocumento] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [archivoVisualizar, setArchivoVisualizar] = useState(null);

  useEffect(() => {
    cargarDocumentos();
  }, []);

  const cargarDocumentos = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/documentos");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al cargar documentos");
        setDocumentos([]);
      } else {
        setDocumentos(data.data || []);
        setError("");
      }
    } catch (error) {
      console.error("Error al cargar documentos:", error);
      setError("Error de conexión. Intente nuevamente.");
      setDocumentos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalles = async (idDocumento) => {
    try {
      const response = await fetch(
        `/api/documentos?id_documento=${idDocumento}`,
      );
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Error al cargar detalles del documento");
        return;
      }

      setSelectedDocumento(data.data);
      setOpenDialog(true);
    } catch (error) {
      console.error("Error al cargar detalles:", error);
      alert("Error al cargar detalles del documento");
    }
  };

  const handleDescargarArchivo = (rutaArchivo, nombreArchivo) => {
    // Crear enlace temporal para descargar
    const link = document.createElement("a");
    link.href = rutaArchivo;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleVisualizarArchivo = (archivo) => {
    setArchivoVisualizar(archivo);
  };

  const esPDF = (tipoArchivo) => {
    return tipoArchivo?.includes("pdf");
  };

  const esExcel = (tipoArchivo) => {
    return (
      tipoArchivo?.includes("excel") ||
      tipoArchivo?.includes("spreadsheet") ||
      tipoArchivo?.includes("xlsx") ||
      tipoArchivo?.includes("xls")
    );
  };

  const esWord = (tipoArchivo) => {
    return (
      tipoArchivo?.includes("word") ||
      tipoArchivo?.includes("msword") ||
      tipoArchivo?.includes("docx") ||
      tipoArchivo?.includes("doc")
    );
  };

  const esPowerPoint = (tipoArchivo) => {
    return (
      tipoArchivo?.includes("powerpoint") ||
      tipoArchivo?.includes("presentation") ||
      tipoArchivo?.includes("pptx") ||
      tipoArchivo?.includes("ppt")
    );
  };

  const getFileIcon = (tipoArchivo) => {
    if (tipoArchivo?.includes("pdf")) {
      return <PictureAsPdf sx={{ color: "#1976D2", fontSize: 20 }} />;
    } else if (
      tipoArchivo?.includes("excel") ||
      tipoArchivo?.includes("spreadsheet")
    ) {
      return <DescriptionOutlined sx={{ color: "#1976D2", fontSize: 20 }} />;
    } else if (
      tipoArchivo?.includes("word") ||
      tipoArchivo?.includes("msword")
    ) {
      return <Description sx={{ color: "#1976D2", fontSize: 20 }} />;
    } else if (
      tipoArchivo?.includes("powerpoint") ||
      tipoArchivo?.includes("presentation")
    ) {
      return <Slideshow sx={{ color: "#1976D2", fontSize: 20 }} />;
    }
    return <InsertDriveFile sx={{ color: "#757575", fontSize: 20 }} />;
  };

  const documentosFiltrados = documentos.filter((doc) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      String(doc.id_documento ?? "")
        .toLowerCase()
        .includes(searchLower) ||
      String(doc.nombre_documento ?? "")
        .toLowerCase()
        .includes(searchLower) ||
      String(doc.nomenclatura ?? "")
        .toLowerCase()
        .includes(searchLower) ||
      String(doc.area_nombre ?? "")
        .toLowerCase()
        .includes(searchLower) ||
      String(doc.estado ?? "")
        .toLowerCase()
        .includes(searchLower) ||
      String(doc.tiempo_retencion ?? "")
        .toLowerCase()
        .includes(searchLower) ||
      String(doc.ubicacion_registro ?? "")
        .toLowerCase()
        .includes(searchLower)
    );
  });

  return (
    <HexagonMenu selectedItemId="visualizar-documentos">
      <Paper
        elevation={8}
        sx={{
          p: 4,
          backgroundColor: "#ffffff",
          border: "1px solid rgba(25, 118, 210, 0.16)",
          borderRadius: 3,
          maxWidth: "1400px",
          mx: "auto",
        }}
      >
        <Typography
          variant="h4"
          sx={{
            color: "#1976D2",
            fontWeight: 700,
            mb: 3,
          }}
        >
          Visualizar Documentos
        </Typography>

        {/* Barra de búsqueda */}
        <TextField
          fullWidth
          placeholder="Buscar por ID, nombre, nomenclatura, área, estado..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            mb: 3,
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#E3F2FD",
              color: "#1976D2",
              "& fieldset": {
                borderColor: "rgba(25, 118, 210, 0.16)",
              },
              "&:hover fieldset": {
                borderColor: "#1976D2",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#1976D2",
              },
            },
            "& .MuiInputLabel-root": {
              color: "#757575",
            },
            "& .MuiInputBase-input": {
              color: "#1976D2",
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: "#1976D2" }} />
              </InputAdornment>
            ),
          }}
        />

        {loading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 4,
            }}
          >
            <CircularProgress sx={{ color: "#1976D2" }} />
          </Box>
        )}

        {error && (
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
            onClose={() => setError("")}
          >
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <>
            <Box
              sx={{
                mb: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body2" sx={{ color: "#757575" }}>
                Total de documentos: {documentosFiltrados.length}
              </Typography>
            </Box>

            <TableContainer
              component={Paper}
              sx={{
                backgroundColor: "#E3F2FD",
                borderRadius: 2,
                border: "1px solid rgba(25, 118, 210, 0.14)",
                maxHeight: "70vh",
                overflow: "auto",
              }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        backgroundColor: "#BBDEFB",
                        color: "#1976D2",
                        fontWeight: 600,
                        borderBottom: "1px solid rgba(25, 118, 210, 0.14)",
                      }}
                    >
                      ID Documento
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: "#BBDEFB",
                        color: "#1976D2",
                        fontWeight: 600,
                        borderBottom: "1px solid rgba(25, 118, 210, 0.14)",
                      }}
                    >
                      Nombre
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: "#BBDEFB",
                        color: "#1976D2",
                        fontWeight: 600,
                        borderBottom: "1px solid rgba(25, 118, 210, 0.14)",
                      }}
                    >
                      Área
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: "#BBDEFB",
                        color: "#1976D2",
                        fontWeight: 600,
                        borderBottom: "1px solid rgba(25, 118, 210, 0.14)",
                      }}
                    >
                      Nomenclatura
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: "#BBDEFB",
                        color: "#1976D2",
                        fontWeight: 600,
                        borderBottom: "1px solid rgba(25, 118, 210, 0.14)",
                      }}
                    >
                      Estado
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: "#BBDEFB",
                        color: "#1976D2",
                        fontWeight: 600,
                        borderBottom: "1px solid rgba(25, 118, 210, 0.14)",
                      }}
                    >
                      Fecha Alta
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: "#BBDEFB",
                        color: "#1976D2",
                        fontWeight: 600,
                        borderBottom: "1px solid rgba(25, 118, 210, 0.14)",
                      }}
                    >
                      Archivos
                    </TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: "#BBDEFB",
                        color: "#1976D2",
                        fontWeight: 600,
                        borderBottom: "1px solid rgba(25, 118, 210, 0.14)",
                      }}
                    >
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documentosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        sx={{
                          textAlign: "center",
                          color: "#757575",
                          py: 4,
                        }}
                      >
                        {searchTerm
                          ? "No se encontraron documentos con ese criterio de búsqueda"
                          : "No hay documentos registrados"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    documentosFiltrados.map((doc, index) => (
                      <TableRow
                        key={doc.id_documento}
                        sx={{
                          "&:hover": {
                            backgroundColor: "rgba(25, 118, 210, 0.06)",
                          },
                          borderBottom:
                            index < documentosFiltrados.length - 1
                              ? "1px solid rgba(25, 118, 210, 0.1)"
                              : "none",
                        }}
                      >
                        <TableCell
                          sx={{
                            color: "#1976D2",
                            borderBottom: "none",
                            fontWeight: 500,
                          }}
                        >
                          {doc.id_documento}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "#1976D2",
                            borderBottom: "none",
                            fontWeight: 500,
                          }}
                        >
                          {doc.nombre_documento}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "#1976D2",
                            borderBottom: "none",
                          }}
                        >
                          {doc.area_nombre ?? "—"}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "#1976D2",
                            borderBottom: "none",
                          }}
                        >
                          <Chip
                            label={doc.nomenclatura}
                            size="small"
                            sx={{
                              backgroundColor: "rgba(25, 118, 210, 0.14)",
                              color: "#1976D2",
                              fontWeight: 500,
                            }}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "#1976D2",
                            borderBottom: "none",
                          }}
                        >
                          <Chip
                            label={doc.estado ?? "—"}
                            size="small"
                            sx={{
                              backgroundColor: "rgba(25, 118, 210, 0.14)",
                              color: "#1976D2",
                              fontWeight: 500,
                            }}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "#1976D2",
                            borderBottom: "none",
                          }}
                        >
                          {new Date(doc.fecha_alta).toLocaleDateString("es-ES")}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "#1976D2",
                            borderBottom: "none",
                          }}
                        >
                          <Chip
                            label={`${doc.total_archivos || 0} archivo(s)`}
                            size="small"
                            sx={{
                              backgroundColor: "rgba(34, 197, 94, 0.2)",
                              color: "#1976D2",
                            }}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "#1976D2",
                            borderBottom: "none",
                          }}
                        >
                          <Tooltip title="Ver detalles">
                            <IconButton
                              onClick={() =>
                                handleVerDetalles(doc.id_documento)
                              }
                              sx={{
                                color: "#1976D2",
                                "&:hover": {
                                  backgroundColor: "rgba(25, 118, 210, 0.09)",
                                },
                              }}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Dialog de detalles */}
        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: "#ffffff",
              border: "1px solid rgba(25, 118, 210, 0.16)",
            },
          }}
        >
          <DialogTitle sx={{ color: "#1976D2", fontWeight: 700 }}>
            Detalles del Documento
          </DialogTitle>
          <DialogContent>
            {selectedDocumento && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={{ color: "#757575" }}>
                    ID Documento
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#1976D2", mb: 2 }}>
                    {selectedDocumento.id_documento}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={{ color: "#757575" }}>
                    Fecha de Alta
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#1976D2", mb: 2 }}>
                    {new Date(selectedDocumento.fecha_alta).toLocaleDateString(
                      "es-ES",
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={{ color: "#757575" }}>
                    Área
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#1976D2", mb: 2 }}>
                    {selectedDocumento.area_nombre ?? "—"}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={{ color: "#757575" }}>
                    Nomenclatura
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#1976D2", mb: 2 }}>
                    {selectedDocumento.nomenclatura}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ color: "#757575" }}>
                    Nombre del Documento
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#1976D2", mb: 2 }}>
                    {selectedDocumento.nombre_documento}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={{ color: "#757575" }}>
                    Tiempo de retención
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#1976D2", mb: 2 }}>
                    {selectedDocumento.tiempo_retencion?.trim()
                      ? selectedDocumento.tiempo_retencion
                      : "—"}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={{ color: "#757575" }}>
                    Ubicación del registro
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#1976D2", mb: 2 }}>
                    {selectedDocumento.ubicacion_registro?.trim()
                      ? selectedDocumento.ubicacion_registro
                      : "—"}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={{ color: "#757575" }}>
                    Estado
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#1976D2", mb: 2 }}>
                    {selectedDocumento.estado ?? "—"}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider
                    sx={{ my: 2, borderColor: "rgba(25, 118, 210, 0.14)" }}
                  />
                  <Typography
                    variant="subtitle1"
                    sx={{ color: "#1976D2", fontWeight: 600, mb: 2 }}
                  >
                    Archivos ({selectedDocumento.archivos?.length || 0})
                  </Typography>
                  {selectedDocumento.archivos &&
                  selectedDocumento.archivos.length > 0 ? (
                    <Grid container spacing={2}>
                      {selectedDocumento.archivos.map((archivo, index) => (
                        <Grid item xs={12} key={index}>
                          <Card
                            sx={{
                              backgroundColor: "#E3F2FD",
                              border: "1px solid rgba(25, 118, 210, 0.14)",
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
                                    gap: 2,
                                  }}
                                >
                                  {getFileIcon(archivo.tipo_archivo)}
                                  <Box>
                                    <Typography
                                      variant="body2"
                                      sx={{ color: "#1976D2", fontWeight: 500 }}
                                    >
                                      {archivo.nombre_archivo}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{ color: "#757575" }}
                                    >
                                      {(archivo.tamano_archivo / 1024).toFixed(
                                        2,
                                      )}{" "}
                                      KB
                                    </Typography>
                                  </Box>
                                </Box>
                                <Box sx={{ display: "flex", gap: 1 }}>
                                  <Tooltip title="Visualizar">
                                    <IconButton
                                      onClick={() =>
                                        handleVisualizarArchivo(archivo)
                                      }
                                      sx={{
                                        color: "#1976D2",
                                        "&:hover": {
                                          backgroundColor:
                                            "rgba(25, 118, 210, 0.09)",
                                        },
                                      }}
                                    >
                                      <OpenInNew />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Descargar">
                                    <IconButton
                                      onClick={() =>
                                        handleDescargarArchivo(
                                          archivo.ruta_archivo,
                                          archivo.nombre_archivo,
                                        )
                                      }
                                      sx={{
                                        color: "#1976D2",
                                        "&:hover": {
                                          backgroundColor:
                                            "rgba(25, 118, 210, 0.09)",
                                        },
                                      }}
                                    >
                                      <Download />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body2" sx={{ color: "#757575" }}>
                      No hay archivos asociados
                    </Typography>
                  )}
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => setOpenDialog(false)}
              sx={{
                color: "#1976D2",
                "&:hover": {
                  backgroundColor: "rgba(25, 118, 210, 0.09)",
                },
              }}
            >
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog para visualizar archivos */}
        <Dialog
          open={!!archivoVisualizar}
          onClose={() => setArchivoVisualizar(null)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: "#ffffff",
              border: "1px solid rgba(25, 118, 210, 0.16)",
              height: "90vh",
              display: "flex",
              flexDirection: "column",
            },
          }}
        >
          <DialogTitle
            sx={{
              color: "#1976D2",
              fontWeight: 700,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid rgba(25, 118, 210, 0.14)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {archivoVisualizar && getFileIcon(archivoVisualizar.tipo_archivo)}
              <Typography variant="h6" sx={{ color: "#1976D2" }}>
                {archivoVisualizar?.nombre_archivo}
              </Typography>
            </Box>
            <IconButton
              onClick={() => setArchivoVisualizar(null)}
              sx={{
                color: "#1976D2",
                "&:hover": {
                  backgroundColor: "rgba(25, 118, 210, 0.09)",
                },
              }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              p: 0,
              overflow: "hidden",
            }}
          >
            {archivoVisualizar && (
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {esPDF(archivoVisualizar.tipo_archivo) ? (
                  <Box
                    sx={{
                      flex: 1,
                      width: "100%",
                      height: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <iframe
                      src={archivoVisualizar.ruta_archivo}
                      style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                        backgroundColor: "#ffffff",
                      }}
                      title={archivoVisualizar.nombre_archivo}
                    />
                  </Box>
                ) : esExcel(archivoVisualizar.tipo_archivo) ? (
                  <Box
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      p: 4,
                      color: "#1976D2",
                    }}
                  >
                    <DescriptionOutlined
                      sx={{ fontSize: 64, color: "#1976D2", mb: 2 }}
                    />
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Visualización de Excel
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "#757575", mb: 3 }}
                    >
                      Para visualizar archivos Excel, descárgalo y ábrelo con
                      Microsoft Excel o Google Sheets.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Download />}
                      onClick={() =>
                        handleDescargarArchivo(
                          archivoVisualizar.ruta_archivo,
                          archivoVisualizar.nombre_archivo,
                        )
                      }
                      sx={{
                        backgroundColor: "#E3F2FD",
                        color: "#1976D2",
                        border: "1px solid #1976D2",
                        "&:hover": {
                          backgroundColor: "#BBDEFB",
                          color: "#1976D2",
                        },
                      }}
                    >
                      Descargar Archivo
                    </Button>
                  </Box>
                ) : esWord(archivoVisualizar.tipo_archivo) ? (
                  <Box
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      p: 4,
                      color: "#1976D2",
                    }}
                  >
                    <Description
                      sx={{ fontSize: 64, color: "#1976D2", mb: 2 }}
                    />
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Visualización de Word
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "#757575", mb: 3 }}
                    >
                      Para visualizar archivos Word, descárgalo y ábrelo con
                      Microsoft Word o Google Docs.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Download />}
                      onClick={() =>
                        handleDescargarArchivo(
                          archivoVisualizar.ruta_archivo,
                          archivoVisualizar.nombre_archivo,
                        )
                      }
                      sx={{
                        backgroundColor: "#E3F2FD",
                        color: "#1976D2",
                        border: "1px solid #1976D2",
                        "&:hover": {
                          backgroundColor: "#BBDEFB",
                          color: "#1976D2",
                        },
                      }}
                    >
                      Descargar Archivo
                    </Button>
                  </Box>
                ) : esPowerPoint(archivoVisualizar.tipo_archivo) ? (
                  <Box
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      p: 4,
                      color: "#1976D2",
                    }}
                  >
                    <Slideshow sx={{ fontSize: 64, color: "#1976D2", mb: 2 }} />
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Visualización de PowerPoint
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "#757575", mb: 3 }}
                    >
                      Para visualizar archivos PowerPoint, descárgalo y ábrelo
                      con Microsoft PowerPoint o Google Slides.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Download />}
                      onClick={() =>
                        handleDescargarArchivo(
                          archivoVisualizar.ruta_archivo,
                          archivoVisualizar.nombre_archivo,
                        )
                      }
                      sx={{
                        backgroundColor: "#E3F2FD",
                        color: "#1976D2",
                        border: "1px solid #1976D2",
                        "&:hover": {
                          backgroundColor: "#BBDEFB",
                          color: "#1976D2",
                        },
                      }}
                    >
                      Descargar Archivo
                    </Button>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      p: 4,
                      color: "#1976D2",
                    }}
                  >
                    <InsertDriveFile
                      sx={{ fontSize: 64, color: "#757575", mb: 2 }}
                    />
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Tipo de archivo no soportado para visualización
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Download />}
                      onClick={() =>
                        handleDescargarArchivo(
                          archivoVisualizar.ruta_archivo,
                          archivoVisualizar.nombre_archivo,
                        )
                      }
                      sx={{
                        backgroundColor: "#E3F2FD",
                        color: "#1976D2",
                        border: "1px solid #1976D2",
                        "&:hover": {
                          backgroundColor: "#BBDEFB",
                          color: "#1976D2",
                        },
                      }}
                    >
                      Descargar Archivo
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions
            sx={{
              p: 2,
              borderTop: "1px solid rgba(25, 118, 210, 0.14)",
            }}
          >
            {archivoVisualizar && (
              <Button
                startIcon={<Download />}
                onClick={() =>
                  handleDescargarArchivo(
                    archivoVisualizar.ruta_archivo,
                    archivoVisualizar.nombre_archivo,
                  )
                }
                sx={{
                  color: "#1976D2",
                  "&:hover": {
                    backgroundColor: "rgba(25, 118, 210, 0.09)",
                  },
                }}
              >
                Descargar
              </Button>
            )}
            <Button
              onClick={() => setArchivoVisualizar(null)}
              sx={{
                color: "#1976D2",
                "&:hover": {
                  backgroundColor: "rgba(25, 118, 210, 0.09)",
                },
              }}
            >
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </HexagonMenu>
  );
}

export default VisualizarDocumentos;
