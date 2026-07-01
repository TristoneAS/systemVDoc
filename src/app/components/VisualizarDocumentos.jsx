"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Search,
  Visibility,
  Download,
  Description,
  PictureAsPdf,
  InsertDriveFile,
  DescriptionOutlined,
  Close,
  Slideshow,
  Block,
  CheckCircle,
  Check,
  HourglassEmpty,
  FilterList,
  FileDownload,
  History,
  ExpandMore,
  PostAdd,
  Archive,
  DeleteOutline,
  Article,
} from "@mui/icons-material";
import HexagonMenu from "./HexagonMenu";
import { getIsAdmin } from "./Solicitudes";
import {
  formatFechaRetencion,
} from "@/libs/tiempo_retencion";
import { normalizeArchivosDocumento } from "@/libs/normalize_archivos_documento";
import { labelAccionHistorial, ACCION_HISTORIAL } from "@/libs/historial_archivos";
import {
  labelTipoProceso,
  labelEstadoProceso,
  ESTADO_PROCESO,
} from "@/libs/historial_proceso";

function normalizarEstadoDocumento(estado) {
  const e = String(estado ?? "activo")
    .trim()
    .toLowerCase();
  if (e === "inactivo") return "inactivo";
  return "activo";
}

function labelEstadoDocumento(estado) {
  return normalizarEstadoDocumento(estado) === "activo" ? "Activo" : "Inactivo";
}

function esDocumentoDescargado(descargado) {
  return descargado === true || descargado === 1 || descargado === "1";
}

function formatFechaTabla(fecha) {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function truncarTexto(texto, max = 48) {
  const s = String(texto ?? "").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function formatFechaHistorial(fecha) {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function detalleExtraHistorial(item) {
  const partes = [];
  if (item.nombre_archivo) {
    partes.push(`Archivo: ${item.nombre_archivo}`);
  }
  if (item.id_solicitud) {
    partes.push(`Solicitud #${item.id_solicitud}`);
  }
  const nuevos = item.datos_nuevos;
  if (nuevos?.motivo) {
    partes.push(`Motivo: ${nuevos.motivo}`);
  }
  if (Array.isArray(nuevos?.archivos) && nuevos.archivos.length > 0) {
    partes.push(`Archivos: ${nuevos.archivos.join(", ")}`);
  }
  return partes;
}

function getIconoAccionHistorial(accion) {
  const a = String(accion ?? "").trim().toLowerCase();
  switch (a) {
    case ACCION_HISTORIAL.SOLICITUD_RECHAZADA:
    case ACCION_HISTORIAL.RECHAZO_AUTOMATICO:
      return { Icon: Close, color: "#C62828", bg: "rgba(198, 40, 40, 0.12)" };
    case ACCION_HISTORIAL.VISTO_BUENO:
      return { Icon: CheckCircle, color: "#2E7D32", bg: "rgba(46, 125, 50, 0.12)" };
    case ACCION_HISTORIAL.SOLICITUD_NUEVO:
    case ACCION_HISTORIAL.SOLICITUD_CAMBIO:
    case ACCION_HISTORIAL.SOLICITUD_REENVIADA:
      return { Icon: Article, color: "#1976D2", bg: "rgba(25, 118, 210, 0.12)" };
    case ACCION_HISTORIAL.ALTA_DIRECTA:
    case ACCION_HISTORIAL.ALTA_POR_APROBACION:
      return { Icon: PostAdd, color: "#2E7D32", bg: "rgba(46, 125, 50, 0.1)" };
    case ACCION_HISTORIAL.CAMBIO_ARCHIVOS:
    case ACCION_HISTORIAL.SOLICITUD_APROBADA:
      return { Icon: Check, color: "#1565C0", bg: "rgba(21, 101, 192, 0.12)" };
    case ACCION_HISTORIAL.SOLICITUD_OBSOLETA:
      return { Icon: Archive, color: "#5D4037", bg: "rgba(93, 64, 55, 0.12)" };
    case ACCION_HISTORIAL.CAMBIO_ESTADO:
      return { Icon: Block, color: "#616161", bg: "rgba(0, 0, 0, 0.06)" };
    case ACCION_HISTORIAL.CAMBIO_DESCARGADO:
      return { Icon: Download, color: "#616161", bg: "rgba(0, 0, 0, 0.06)" };
    case ACCION_HISTORIAL.DOCUMENTO_ELIMINADO:
      return { Icon: DeleteOutline, color: "#C62828", bg: "rgba(198, 40, 40, 0.1)" };
    default:
      return { Icon: Description, color: "#757575", bg: "rgba(0, 0, 0, 0.06)" };
  }
}

function HistorialIconoBadge({ accion, size = 22 }) {
  const { Icon, color, bg } = getIconoAccionHistorial(accion);
  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        bgcolor: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon sx={{ fontSize: size, color }} />
    </Box>
  );
}

function HistorialEventoAccordion({ item }) {
  const extras = detalleExtraHistorial(item);
  const titulo = labelAccionHistorial(item.accion);
  const tieneDetalle =
    Boolean(item.detalle?.trim()) ||
    extras.length > 0 ||
    Boolean(item.emp_nombre_actor?.trim() || item.emp_id_actor);

  return (
    <Accordion
      disableGutters
      elevation={0}
      disabled={!tieneDetalle}
      sx={{
        border: "1px solid rgba(25, 118, 210, 0.14)",
        borderRadius: "8px !important",
        backgroundColor: "#ffffff",
        "&:before": { display: "none" },
        "&.Mui-disabled": {
          backgroundColor: "#ffffff",
          opacity: 1,
        },
      }}
    >
      <AccordionSummary
        expandIcon={
          tieneDetalle ? (
            <ExpandMore sx={{ color: "#1976D2", fontSize: 22 }} />
          ) : null
        }
        sx={{
          minHeight: 44,
          px: 1.5,
          "& .MuiAccordionSummary-content": {
            my: 1,
            alignItems: "center",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            width: "100%",
            pr: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
            <HistorialIconoBadge accion={item.accion} />
            <Typography
              variant="body2"
              sx={{ color: "#1976D2", fontWeight: 600 }}
            >
              {titulo}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{ color: "#757575", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {formatFechaHistorial(item.fecha_evento)}
          </Typography>
        </Box>
      </AccordionSummary>
      {tieneDetalle && (
        <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
          {item.detalle && (
            <Typography variant="body2" sx={{ color: "#424242", mb: 0.5 }}>
              {item.detalle}
            </Typography>
          )}
          {extras.length > 0 && (
            <Typography
              variant="caption"
              sx={{ color: "#757575", display: "block", mb: 0.5 }}
            >
              {extras.join(" · ")}
            </Typography>
          )}
          {(item.emp_nombre_actor || item.emp_id_actor) && (
            <Typography variant="caption" sx={{ color: "#616161", display: "block" }}>
              Por:{" "}
              {item.emp_nombre_actor?.trim() || item.emp_id_actor || "—"}
            </Typography>
          )}
        </AccordionDetails>
      )}
    </Accordion>
  );
}

function HistorialProcesoAccordion({ proceso }) {
  const resumenFecha =
    proceso.fecha_fin && proceso.fecha_inicio !== proceso.fecha_fin
      ? `${formatFechaHistorial(proceso.fecha_inicio)} → ${formatFechaHistorial(proceso.fecha_fin)}`
      : formatFechaHistorial(proceso.fecha_fin || proceso.fecha_inicio);

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        border: "1px solid rgba(25, 118, 210, 0.22)",
        borderRadius: "10px !important",
        backgroundColor: "#FAFAFA",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore sx={{ color: "#1976D2" }} />}
        sx={{
          px: 2,
          "& .MuiAccordionSummary-content": { my: 1.25 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 2,
            flexWrap: "wrap",
            width: "100%",
            pr: 1,
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ color: "#1976D2", fontWeight: 700 }}>
              {proceso.titulo || labelTipoProceso(proceso.tipo_proceso)}
            </Typography>
            {proceso.id_solicitud && (
              <Typography variant="caption" sx={{ color: "#757575" }}>
                Solicitud #{proceso.id_solicitud}
              </Typography>
            )}
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <StatusPill
              label={labelEstadoProceso(proceso.estado)}
              bg={
                proceso.estado === ESTADO_PROCESO.FINALIZADO ? "#2E7D32" : "#F57C00"
              }
            />
            <Typography
              variant="caption"
              sx={{ color: "#757575", display: "block", mt: 0.75 }}
            >
              {resumenFecha}
            </Typography>
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
        {proceso.motivo && (
          <Typography variant="body2" sx={{ color: "#424242", mb: 1 }}>
            Motivo: {proceso.motivo}
          </Typography>
        )}
        {proceso.archivos?.length > 0 && (
          <Typography
            variant="caption"
            sx={{ color: "#757575", display: "block", mb: 1.5 }}
          >
            Archivos: {proceso.archivos.join(", ")}
          </Typography>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {proceso.eventos.map((item) => (
            <HistorialEventoAccordion key={item.id_historial} item={item} />
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

function StatusPill({ label, bg, color = "#ffffff" }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        px: 1.5,
        py: 0.35,
        borderRadius: "999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        lineHeight: 1.4,
        color,
        backgroundColor: bg,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Box>
  );
}

const filterFieldSx = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "#ffffff",
    fontSize: "0.875rem",
    "& fieldset": { borderColor: "#E0E0E0" },
    "&:hover fieldset": { borderColor: "#BDBDBD" },
    "&.Mui-focused fieldset": { borderColor: "#1976D2" },
  },
  "& .MuiInputLabel-root": { fontSize: "0.875rem", color: "#757575" },
};

const tableHeadCellSx = {
  backgroundColor: "#F5F5F5",
  color: "#424242",
  fontWeight: 700,
  fontSize: "0.8125rem",
  whiteSpace: "nowrap",
  borderBottom: "1px solid #E0E0E0",
  py: 1.5,
};

const tableBodyCellSx = {
  color: "#424242",
  fontSize: "0.875rem",
  borderBottom: "1px solid #EEEEEE",
  py: 1.75,
  verticalAlign: "middle",
};

function VisualizarDocumentos() {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDocumento, setSelectedDocumento] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [archivoVisualizar, setArchivoVisualizar] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroResponsableArea, setFiltroResponsableArea] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [estadoActionId, setEstadoActionId] = useState(null);
  const [descargadoActionId, setDescargadoActionId] = useState(null);
  const [banner, setBanner] = useState(null);
  const [procesosHistorial, setProcesosHistorial] = useState([]);
  const [historialLoading, setHistorialLoading] = useState(false);

  useEffect(() => {
    setIsAdmin(getIsAdmin());
  }, []);

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

  const toggleDescargadoDocumento = async (idDocumento, descargadoActual) => {
    const nuevoDescargado = !esDocumentoDescargado(descargadoActual);
    setDescargadoActionId(idDocumento);
    setBanner(null);
    try {
      const response = await fetch(`/api/documentos/${idDocumento}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descargado: nuevoDescargado,
          is_admin: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setBanner({
          severity: "error",
          text: data.error || "No se pudo actualizar el estado de descarga",
        });
        return;
      }
      setBanner({
        severity: "success",
        text: data.message || "Estado de descarga actualizado",
      });
      setDocumentos((prev) =>
        prev.map((d) =>
          d.id_documento === idDocumento
            ? { ...d, descargado: nuevoDescargado ? 1 : 0 }
            : d,
        ),
      );
      if (
        selectedDocumento?.id_documento === idDocumento &&
        openDialog
      ) {
        setSelectedDocumento((prev) =>
          prev
            ? { ...prev, descargado: nuevoDescargado ? 1 : 0 }
            : prev,
        );
        cargarHistorialDocumento(idDocumento);
      }
    } catch {
      setBanner({ severity: "error", text: "Error de conexión" });
    } finally {
      setDescargadoActionId(null);
    }
  };

  const cambiarEstadoDocumento = async (idDocumento, nuevoEstado) => {
    setEstadoActionId(idDocumento);
    setBanner(null);
    try {
      const response = await fetch(`/api/documentos/${idDocumento}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado, is_admin: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        setBanner({
          severity: "error",
          text: data.error || "No se pudo actualizar el estado",
        });
        return;
      }
      setBanner({
        severity: "success",
        text: data.message || "Estado actualizado",
      });
      await cargarDocumentos();
      if (
        selectedDocumento?.id_documento === idDocumento &&
        openDialog
      ) {
        setSelectedDocumento((prev) =>
          prev ? { ...prev, estado: nuevoEstado } : prev,
        );
        cargarHistorialDocumento(idDocumento);
      }
    } catch {
      setBanner({ severity: "error", text: "Error de conexión" });
    } finally {
      setEstadoActionId(null);
    }
  };

  const handleVerDetalles = async (idDocumento) => {
    try {
      const response = await fetch(
        `/api/documentos?id_documento=${encodeURIComponent(String(idDocumento))}`,
      );
      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            data.details ||
            "Error al cargar detalles del documento",
        );
        return;
      }

      const doc = data.data;
      setSelectedDocumento({
        ...doc,
        archivos: normalizeArchivosDocumento(doc?.archivos),
      });
      setProcesosHistorial([]);
      setOpenDialog(true);
      cargarHistorialDocumento(idDocumento);
    } catch (error) {
      console.error("Error al cargar detalles:", error);
      alert("Error al cargar detalles del documento");
    }
  };

  const cargarHistorialDocumento = async (idDocumento) => {
    setHistorialLoading(true);
    try {
      const response = await fetch(
        `/api/documentos/${encodeURIComponent(String(idDocumento))}/historial`,
      );
      const data = await response.json();
      if (response.ok) {
        setProcesosHistorial(data.data || []);
      } else {
        setProcesosHistorial([]);
      }
    } catch {
      setProcesosHistorial([]);
    } finally {
      setHistorialLoading(false);
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

  const areasDisponibles = useMemo(() => {
    const map = new Map();
    documentos.forEach((d) => {
      if (d.id_area != null && d.area_nombre) {
        map.set(String(d.id_area), d.area_nombre);
      }
    });
    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], "es"),
    );
  }, [documentos]);

  const responsablesDisponibles = useMemo(() => {
    const set = new Set();
    documentos.forEach((d) => {
      const nombre = String(d.responsable_area ?? "").trim();
      if (nombre) set.add(nombre);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [documentos]);

  const documentosFiltrados = documentos.filter((doc) => {
    const searchLower = searchTerm.trim().toLowerCase();
    if (searchLower) {
      const coincideBusqueda =
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
        String(doc.responsable_area ?? "")
          .toLowerCase()
          .includes(searchLower) ||
        String(doc.tiempo_retencion ?? "")
          .toLowerCase()
          .includes(searchLower) ||
        formatFechaRetencion(doc.tiempo_retencion)
          .toLowerCase()
          .includes(searchLower) ||
        String(doc.ubicacion_registro ?? "")
          .toLowerCase()
          .includes(searchLower);
      if (!coincideBusqueda) return false;
    }

    if (filtroArea && String(doc.id_area) !== filtroArea) return false;

    if (
      filtroResponsableArea &&
      String(doc.responsable_area ?? "").trim() !== filtroResponsableArea
    ) {
      return false;
    }

    if (
      filtroEstado !== "todos" &&
      normalizarEstadoDocumento(doc.estado) !== filtroEstado
    ) {
      return false;
    }

    return true;
  });

  const limpiarFiltros = () => {
    setSearchTerm("");
    setFiltroArea("");
    setFiltroResponsableArea("");
    setFiltroEstado("todos");
  };

  const exportarExcel = () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = [
      "ID",
      "Nomenclatura",
      "Nombre",
      "Responsable del área",
      "Área",
      "Fecha retención",
      "Ubicación registro",
      "Estado",
      "Fecha alta",
      "Archivos",
      "Descarga",
    ];
    const filas = documentosFiltrados.map((doc) =>
      [
        doc.id_documento,
        esc(doc.nomenclatura),
        esc(doc.nombre_documento),
        esc(doc.responsable_area),
        esc(doc.area_nombre),
        esc(formatFechaRetencion(doc.tiempo_retencion)),
        esc(doc.ubicacion_registro),
        esc(labelEstadoDocumento(doc.estado)),
        esc(formatFechaTabla(doc.fecha_alta)),
        doc.total_archivos || 0,
        esDocumentoDescargado(doc.descargado) ? "Descargado" : "Pendiente",
      ].join(","),
    );
    const csv = `\uFEFF${[headers.join(","), ...filas].join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `documentos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <HexagonMenu selectedItemId="visualizar-documentos">
      <Paper
        elevation={8}
        sx={{
          p: 4,
          backgroundColor: "#ffffff",
          border: "1px solid rgba(25, 118, 210, 0.16)",
          borderRadius: 3,
          maxWidth: "1600px",
          mx: "auto",
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              flexWrap: "wrap",
              gap: { xs: 0.5, sm: 1.5 },
            }}
          >
            <Typography
              variant="h4"
              component="span"
              sx={{
                color: "#1976D2",
                fontWeight: 700,
                lineHeight: 1.2,
                fontSize: { xs: "1.5rem", sm: "2rem" },
              }}
            >
              Lista maestra
            </Typography>
            <Typography
              component="span"
              aria-hidden
              sx={{
                display: { xs: "none", sm: "inline" },
                color: "#CFD8DC",
                fontWeight: 300,
                fontSize: "1.75rem",
                lineHeight: 1,
                userSelect: "none",
              }}
            >
              /
            </Typography>
            <Typography
              variant="h5"
              component="span"
              sx={{
                color: "#1565C0",
                fontWeight: 600,
                lineHeight: 1.25,
                fontSize: { xs: "1.15rem", sm: "1.5rem" },
              }}
            >
              Matriz de registros
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: "#757575", mt: 1.5 }}>
            Catálogo de documentos con filtros, detalle y exportación.
          </Typography>
        </Box>

        <Box
          sx={{
            mb: 3,
            p: { xs: 2, sm: 2.5 },
            border: "1px solid #E0E0E0",
            borderRadius: 1,
            backgroundColor: "#FAFAFA",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 2,
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FilterList sx={{ color: "#616161", fontSize: 20 }} />
              <Typography
                variant="subtitle2"
                sx={{ color: "#424242", fontWeight: 600 }}
              >
                Filtros
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<FileDownload />}
              onClick={exportarExcel}
              disabled={documentosFiltrados.length === 0}
              sx={{
                backgroundColor: "#1976D2",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.8125rem",
                boxShadow: "none",
                "&:hover": { backgroundColor: "#1565C0", boxShadow: "none" },
              }}
            >
              DESCARGAR EXCEL
            </Button>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1.5,
              alignItems: "center",
            }}
          >
            <TextField
              size="small"
              placeholder="Buscar por nomenclatura, nombre, responsable, área, retención o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                flex: "1 1 260px",
                minWidth: 220,
                ...filterFieldSx,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: "#9E9E9E", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl size="small" sx={{ minWidth: 140, ...filterFieldSx }}>
              <InputLabel id="filtro-area-label">Área</InputLabel>
              <Select
                labelId="filtro-area-label"
                label="Área"
                value={filtroArea}
                onChange={(e) => setFiltroArea(e.target.value)}
              >
                <MenuItem value="">
                  <em>Todos</em>
                </MenuItem>
                {areasDisponibles.map(([id, nombre]) => (
                  <MenuItem key={id} value={id}>
                    {nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180, ...filterFieldSx }}>
              <InputLabel id="filtro-responsable-label">
                Responsable del área
              </InputLabel>
              <Select
                labelId="filtro-responsable-label"
                label="Responsable del área"
                value={filtroResponsableArea}
                onChange={(e) => setFiltroResponsableArea(e.target.value)}
              >
                <MenuItem value="">
                  <em>Todos</em>
                </MenuItem>
                {responsablesDisponibles.map((nombre) => (
                  <MenuItem key={nombre} value={nombre}>
                    {nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130, ...filterFieldSx }}>
              <InputLabel id="filtro-estado-label">Estado</InputLabel>
              <Select
                labelId="filtro-estado-label"
                label="Estado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="activo">Activo</MenuItem>
                <MenuItem value="inactivo">Inactivo</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              onClick={limpiarFiltros}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.8125rem",
                color: "#424242",
                borderColor: "#BDBDBD",
                px: 2.5,
                "&:hover": {
                  borderColor: "#757575",
                  backgroundColor: "rgba(0,0,0,0.04)",
                },
              }}
            >
              LIMPIAR
            </Button>
          </Box>
        </Box>

        {banner && (
          <Alert
            severity={banner.severity}
            sx={{ mb: 2 }}
            onClose={() => setBanner(null)}
          >
            {banner.text}
          </Alert>
        )}

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
              elevation={0}
              sx={{
                backgroundColor: "#ffffff",
                borderRadius: 1,
                border: "1px solid #E0E0E0",
                maxHeight: "70vh",
                overflow: "auto",
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={tableHeadCellSx}>ID</TableCell>
                    <TableCell sx={tableHeadCellSx}>Nomenclatura</TableCell>
                    <TableCell sx={tableHeadCellSx}>Nombre del registro</TableCell>
                    <TableCell sx={tableHeadCellSx}>
                      Responsable del área
                    </TableCell>
                    <TableCell sx={tableHeadCellSx}>Área</TableCell>
                    <TableCell sx={tableHeadCellSx}>Fecha retención</TableCell>
                    <TableCell sx={tableHeadCellSx}>
                      Ubicación del registro
                    </TableCell>
                    <TableCell sx={tableHeadCellSx}>Estado</TableCell>
                    <TableCell sx={tableHeadCellSx}>Fecha alta</TableCell>
                    <TableCell sx={tableHeadCellSx} align="center">
                      Archivos
                    </TableCell>
                    <TableCell sx={tableHeadCellSx} align="center">
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documentosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        sx={{
                          textAlign: "center",
                          color: "#757575",
                          py: 5,
                          borderBottom: "none",
                        }}
                      >
                        {searchTerm ||
                        filtroArea ||
                        filtroResponsableArea ||
                        filtroEstado !== "todos"
                          ? "No se encontraron documentos con los filtros aplicados"
                          : "No hay documentos registrados"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    documentosFiltrados.map((doc) => {
                      const activo =
                        normalizarEstadoDocumento(doc.estado) === "activo";
                      return (
                        <TableRow
                          key={doc.id_documento}
                          hover
                          sx={{
                            "&:hover": { backgroundColor: "#FAFAFA" },
                            "&:last-child td": { borderBottom: "none" },
                          }}
                        >
                          <TableCell
                            sx={{
                              ...tableBodyCellSx,
                              fontWeight: 600,
                              color: "#212121",
                            }}
                          >
                            #{doc.id_documento}
                          </TableCell>
                          <TableCell sx={tableBodyCellSx}>
                            <StatusPill
                              label={doc.nomenclatura || "—"}
                              bg="#FFF3E0"
                              color="#E65100"
                            />
                          </TableCell>
                          <TableCell
                            sx={{
                              ...tableBodyCellSx,
                              maxWidth: 220,
                            }}
                            title={doc.nombre_documento}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#424242",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {truncarTexto(doc.nombre_documento, 40)}
                            </Typography>
                          </TableCell>
                          <TableCell
                            sx={tableBodyCellSx}
                            title={doc.responsable_area ?? ""}
                          >
                            {doc.responsable_area?.trim()
                              ? truncarTexto(doc.responsable_area, 28)
                              : "—"}
                          </TableCell>
                          <TableCell sx={tableBodyCellSx}>
                            {doc.area_nombre ?? "—"}
                          </TableCell>
                          <TableCell sx={tableBodyCellSx}>
                            {formatFechaRetencion(doc.tiempo_retencion)}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...tableBodyCellSx,
                              maxWidth: 180,
                            }}
                            title={doc.ubicacion_registro ?? ""}
                          >
                            {doc.ubicacion_registro?.trim()
                              ? truncarTexto(doc.ubicacion_registro, 32)
                              : "—"}
                          </TableCell>
                          <TableCell sx={tableBodyCellSx}>
                            <StatusPill
                              label={labelEstadoDocumento(doc.estado)}
                              bg={activo ? "#2E7D32" : "#EF5350"}
                            />
                          </TableCell>
                          <TableCell sx={tableBodyCellSx}>
                            {formatFechaTabla(doc.fecha_alta)}
                          </TableCell>
                          <TableCell sx={tableBodyCellSx} align="center">
                            {doc.total_archivos || 0}
                          </TableCell>
                          <TableCell sx={tableBodyCellSx} align="center">
                            <Box
                              sx={{
                                display: "inline-flex",
                                gap: 0.25,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Tooltip title="Ver detalles">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    handleVerDetalles(doc.id_documento)
                                  }
                                  sx={{
                                    color: "#1976D2",
                                    "&:hover": {
                                      backgroundColor: "rgba(25, 118, 210, 0.08)",
                                    },
                                  }}
                                >
                                  <Visibility fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {isAdmin && (
                                <Tooltip
                                  title={
                                    esDocumentoDescargado(doc.descargado)
                                      ? "Marcar como pendiente de descarga"
                                      : "Marcar como descargado"
                                  }
                                >
                                  <span>
                                    <IconButton
                                      size="small"
                                      disabled={
                                        descargadoActionId !== null ||
                                        estadoActionId !== null
                                      }
                                      onClick={() =>
                                        toggleDescargadoDocumento(
                                          doc.id_documento,
                                          doc.descargado,
                                        )
                                      }
                                      sx={{
                                        color: esDocumentoDescargado(
                                          doc.descargado,
                                        )
                                          ? "#2E7D32"
                                          : "#FB8500",
                                      }}
                                    >
                                      {descargadoActionId ===
                                      doc.id_documento ? (
                                        <CircularProgress size={18} />
                                      ) : esDocumentoDescargado(
                                          doc.descargado,
                                        ) ? (
                                        <Check fontSize="small" />
                                      ) : (
                                        <HourglassEmpty fontSize="small" />
                                      )}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                              {isAdmin && activo && (
                                <Tooltip title="Deshabilitar documento">
                                  <span>
                                    <IconButton
                                      size="small"
                                      disabled={estadoActionId !== null}
                                      onClick={() =>
                                        cambiarEstadoDocumento(
                                          doc.id_documento,
                                          "inactivo",
                                        )
                                      }
                                      sx={{ color: "#C62828" }}
                                    >
                                      {estadoActionId === doc.id_documento ? (
                                        <CircularProgress size={18} />
                                      ) : (
                                        <Block fontSize="small" />
                                      )}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                              {isAdmin && !activo && (
                                <Tooltip title="Habilitar documento">
                                  <span>
                                    <IconButton
                                      size="small"
                                      disabled={estadoActionId !== null}
                                      onClick={() =>
                                        cambiarEstadoDocumento(
                                          doc.id_documento,
                                          "activo",
                                        )
                                      }
                                      sx={{ color: "#2E7D32" }}
                                    >
                                      {estadoActionId === doc.id_documento ? (
                                        <CircularProgress size={18} />
                                      ) : (
                                        <CheckCircle fontSize="small" />
                                      )}
                                    </IconButton>
                                  </span>
                                </Tooltip>
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
                    Responsable del área
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#1976D2", mb: 2 }}>
                    {selectedDocumento.responsable_area?.trim()
                      ? selectedDocumento.responsable_area
                      : "—"}
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
                    Fecha de retención
                  </Typography>
                  <Typography variant="body1" sx={{ color: "#1976D2", mb: 2 }}>
                    {formatFechaRetencion(selectedDocumento.tiempo_retencion)}
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
                    {labelEstadoDocumento(selectedDocumento.estado)}
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
                                      <Visibility />
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

                <Grid item xs={12}>
                  <Divider
                    sx={{ my: 2, borderColor: "rgba(25, 118, 210, 0.14)" }}
                  />
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <History sx={{ color: "#1976D2", fontSize: 22 }} />
                    <Typography
                      variant="subtitle1"
                      sx={{ color: "#1976D2", fontWeight: 600 }}
                    >
                      Historial por proceso
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "#757575", display: "block", mb: 2 }}>
                    Se muestran procesos finalizados (altas, reemplazos y
                    administración). Cada sección agrupa solicitud, vistos buenos
                    y resultado.
                  </Typography>
                  {historialLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                      <CircularProgress size={28} />
                    </Box>
                  ) : procesosHistorial.length === 0 ? (
                    <Typography variant="body2" sx={{ color: "#757575" }}>
                      No hay procesos finalizados registrados para este documento.
                    </Typography>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      {procesosHistorial.map((proceso) => (
                        <HistorialProcesoAccordion
                          key={proceso.id_proceso}
                          proceso={proceso}
                        />
                      ))}
                    </Box>
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
