"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import { FilterList, EditNote } from "@mui/icons-material";
import HexagonMenu from "./HexagonMenu";
import LoadingModal from "./LoadingModal";
import { getMiEmpId, getIsAdmin } from "./Solicitudes";
import {
  DIAS_AVISO_RETENCION,
  formatFechaRetencion,
} from "@/libs/tiempo_retencion";
import { VIGENCIA_RETENCION } from "@/libs/documentos_por_vencer";
import { normalizeArchivosDocumento } from "@/libs/normalize_archivos_documento";
import {
  guardarPrefillSolicitudCambio,
  prepararPayloadPrefillSolicitudCambio,
} from "@/libs/prefill_solicitud_cambio";

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
        color,
        backgroundColor: bg,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Box>
  );
}

function labelVigenciaRetencion(dias) {
  const n = Number(dias);
  if (Number.isNaN(n)) {
    return { label: "—", bg: "#9E9E9E" };
  }
  if (n < 0) {
    const abs = Math.abs(n);
    return {
      label: `Vencido hace ${abs} día${abs === 1 ? "" : "s"}`,
      bg: "#616161",
    };
  }
  if (n === 0) {
    return { label: "Vence hoy", bg: "#C62828" };
  }
  return {
    label: `${n} día${n === 1 ? "" : "s"}`,
    bg: n <= 2 ? "#C62828" : "#FB8500",
  };
}

function DocumentosPorVencer() {
  const router = useRouter();
  const [documentos, setDocumentos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroVigencia, setFiltroVigencia] = useState(
    VIGENCIA_RETENCION.POR_VENCER,
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [areaAsignada, setAreaAsignada] = useState(null);
  const [sinArea, setSinArea] = useState(false);
  const [solicitudCambioId, setSolicitudCambioId] = useState(null);

  const cargarDocumentos = async ({
    idArea,
    vigencia,
  } = {}) => {
    setLoading(true);
    setError("");
    setSinArea(false);

    const admin = getIsAdmin();
    const empId = getMiEmpId();
    const vigenciaActiva = vigencia ?? filtroVigencia;
    const idAreaActiva =
      idArea !== undefined ? idArea : admin ? filtroArea : "";

    if (!admin && !empId) {
      setError("No se encontró emp_id en la sesión. Vuelva a iniciar sesión.");
      setDocumentos([]);
      setLoading(false);
      return;
    }

    try {
      const qs = new URLSearchParams({
        dias: String(DIAS_AVISO_RETENCION),
        vigencia: vigenciaActiva,
      });

      if (admin) {
        qs.set("is_admin", "true");
        if (idAreaActiva) qs.set("id_area", idAreaActiva);
      } else {
        qs.set("emp_id", empId);
      }

      const response = await fetch(`/api/documentos/por-vencer?${qs}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al cargar documentos");
        setDocumentos([]);
        setAreaAsignada(null);
        return;
      }

      setDocumentos(data.data || []);
      setAreaAsignada(data.area_asignada ?? null);
      setSinArea(Boolean(data.sin_area));

      if (!admin && data.area_asignada?.id_area != null) {
        setFiltroArea(String(data.area_asignada.id_area));
      }
    } catch {
      setError("Error de conexión. Intente nuevamente.");
      setDocumentos([]);
      setAreaAsignada(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsAdmin(getIsAdmin());
    cargarDocumentos({});
    if (!getIsAdmin()) return;

    (async () => {
      try {
        const res = await fetch("/api/areas");
        const data = await res.json();
        if (res.ok && Array.isArray(data.data)) {
          setAreas(data.data);
        }
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const areasDisponibles = useMemo(
    () =>
      [...areas].sort((a, b) =>
        String(a.area_nombre ?? "").localeCompare(
          String(b.area_nombre ?? ""),
          "es",
        ),
      ),
    [areas],
  );

  const limpiarFiltros = () => {
    setFiltroArea("");
    setFiltroVigencia(VIGENCIA_RETENCION.POR_VENCER);
    cargarDocumentos({
      idArea: "",
      vigencia: VIGENCIA_RETENCION.POR_VENCER,
    });
  };

  const aplicarFiltroArea = (idArea) => {
    setFiltroArea(idArea);
    cargarDocumentos({ idArea, vigencia: filtroVigencia });
  };

  const aplicarFiltroVigencia = (vigencia) => {
    setFiltroVigencia(vigencia);
    cargarDocumentos({ idArea: filtroArea, vigencia });
  };

  const mensajeSinResultados = () => {
    if (sinArea) {
      return "No se pudo asociar su usuario con un área. Contacte a soporte.";
    }
    if (filtroVigencia === VIGENCIA_RETENCION.VENCIDOS) {
      return `No hay documentos vencidos${
        filtroArea || !isAdmin ? " para el área seleccionada" : ""
      }.`;
    }
    if (filtroVigencia === VIGENCIA_RETENCION.TODOS) {
      return `No hay documentos vencidos ni por vencer en los próximos ${DIAS_AVISO_RETENCION} días${
        filtroArea || !isAdmin ? " para el área seleccionada" : ""
      }.`;
    }
    return `No hay documentos por vencer en los próximos ${DIAS_AVISO_RETENCION} días${
      filtroArea || !isAdmin ? " para el área seleccionada" : ""
    }.`;
  };

  const nombreAreaVisible =
    areaAsignada?.area_nombre ||
    areasDisponibles.find((a) => String(a.id_area) === filtroArea)
      ?.area_nombre ||
    "";

  const handleSolicitudCambio = async (idDocumento) => {
    setSolicitudCambioId(idDocumento);
    try {
      const response = await fetch(
        `/api/documentos?id_documento=${encodeURIComponent(String(idDocumento))}`,
      );
      const data = await response.json();
      if (!response.ok || !data.data) {
        alert(
          data.error ||
            data.details ||
            "No se pudo cargar el documento para la solicitud.",
        );
        return;
      }

      const doc = {
        ...data.data,
        archivos: normalizeArchivosDocumento(data.data.archivos),
      };

      guardarPrefillSolicitudCambio(
        prepararPayloadPrefillSolicitudCambio(doc),
      );
      router.push("/dashboard/solicitudes/crear");
    } catch {
      alert("Error de conexión al preparar la solicitud de cambio.");
    } finally {
      setSolicitudCambioId(null);
    }
  };

  return (
    <HexagonMenu selectedItemId="documentos-por-vencer">
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
          sx={{ color: "#1976D2", fontWeight: 700, mb: 1 }}
        >
          Documentos por vencer
        </Typography>
        <Typography variant="body2" sx={{ color: "#757575", mb: 3 }}>
          Consulte documentos con retención vencida o por vencer en los próximos{" "}
          {DIAS_AVISO_RETENCION} días.
          {!isAdmin && areaAsignada?.area_nombre
            ? ` Solo se muestran los de su área (${areaAsignada.area_nombre}).`
            : null}
        </Typography>

        {!isAdmin && areaAsignada?.area_nombre && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Área asignada según su jefe directo:{" "}
            <strong>{areaAsignada.area_nombre}</strong>
          </Alert>
        )}

        {!isAdmin && sinArea && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No se pudo asociar su usuario con un área. Contacte a soporte.
          </Alert>
        )}

        {!isAdmin && sinArea ? null : (
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
          </Box>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1.5,
              alignItems: "center",
            }}
          >
            <FormControl size="small" sx={{ minWidth: 200, ...filterFieldSx }}>
              <InputLabel id="filtro-vigencia-label">Vigencia</InputLabel>
              <Select
                labelId="filtro-vigencia-label"
                label="Vigencia"
                value={filtroVigencia}
                onChange={(e) => aplicarFiltroVigencia(e.target.value)}
              >
                <MenuItem value={VIGENCIA_RETENCION.POR_VENCER}>
                  Por vencer
                </MenuItem>
                <MenuItem value={VIGENCIA_RETENCION.VENCIDOS}>
                  Vencidos
                </MenuItem>
                <MenuItem value={VIGENCIA_RETENCION.TODOS}>
                  Vencidos y por vencer
                </MenuItem>
              </Select>
            </FormControl>

            {isAdmin && (
              <FormControl
                size="small"
                sx={{ minWidth: 200, ...filterFieldSx }}
              >
                <InputLabel id="filtro-area-vencer-label">Área</InputLabel>
                <Select
                  labelId="filtro-area-vencer-label"
                  label="Área"
                  value={filtroArea}
                  onChange={(e) => aplicarFiltroArea(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Todas</em>
                  </MenuItem>
                  {areasDisponibles.map((a) => (
                    <MenuItem key={a.id_area} value={String(a.id_area)}>
                      {a.area_nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Button
              variant="outlined"
              onClick={limpiarFiltros}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.8125rem",
                color: "#424242",
                borderColor: "#BDBDBD",
              }}
            >
              LIMPIAR
            </Button>
          </Box>
          </Box>
        )}

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress sx={{ color: "#1976D2" }} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <>
            <Typography variant="body2" sx={{ color: "#757575", mb: 2 }}>
              Total: {documentos.length} documento(s)
              {!isAdmin && nombreAreaVisible
                ? ` · Área: ${nombreAreaVisible}`
                : ""}
            </Typography>
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
                    <TableCell sx={tableHeadCellSx}>Nombre</TableCell>
                    <TableCell sx={tableHeadCellSx}>Área</TableCell>
                    <TableCell sx={tableHeadCellSx}>
                      Fecha retención
                    </TableCell>
                    <TableCell sx={tableHeadCellSx} align="center">
                      Vigencia
                    </TableCell>
                    <TableCell sx={tableHeadCellSx} align="center">
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documentos.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        sx={{ textAlign: "center", color: "#757575", py: 5 }}
                      >
                        {mensajeSinResultados()}
                      </TableCell>
                    </TableRow>
                  ) : (
                    documentos.map((doc) => {
                      const dias = Number(doc.dias_restantes);
                      const vigenciaPill = labelVigenciaRetencion(dias);
                      return (
                        <TableRow
                          key={doc.id_documento}
                          hover
                          sx={{ "&:hover": { backgroundColor: "#FAFAFA" } }}
                        >
                          <TableCell
                            sx={{ ...tableBodyCellSx, fontWeight: 600 }}
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
                          <TableCell sx={tableBodyCellSx}>
                            {doc.nombre_documento ?? "—"}
                          </TableCell>
                          <TableCell sx={tableBodyCellSx}>
                            {doc.area_nombre ?? "—"}
                          </TableCell>
                          <TableCell sx={tableBodyCellSx}>
                            {formatFechaRetencion(doc.tiempo_retencion)}
                          </TableCell>
                          <TableCell sx={tableBodyCellSx} align="center">
                            <StatusPill
                              label={vigenciaPill.label}
                              bg={vigenciaPill.bg}
                            />
                          </TableCell>
                          <TableCell sx={tableBodyCellSx} align="center">
                            <Tooltip title="Solicitud de cambio de documento">
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={solicitudCambioId !== null}
                                  onClick={() =>
                                    handleSolicitudCambio(doc.id_documento)
                                  }
                                  sx={{
                                    color: "#1976D2",
                                    "&:hover": {
                                      backgroundColor:
                                        "rgba(25, 118, 210, 0.08)",
                                    },
                                  }}
                                >
                                  <EditNote fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
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
      </Paper>

      <LoadingModal
        open={solicitudCambioId !== null}
        message="Preparando solicitud de cambio…"
      />
    </HexagonMenu>
  );
}

export default DocumentosPorVencer;
