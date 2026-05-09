"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { Person, Delete, Edit, Business } from "@mui/icons-material";
import HexagonMenu from "./HexagonMenu";

const MSG_CORREO_NO_REGISTRADO = "Correo no registrado, contacte a soporte.";

function empleadoTieneCorreoRegistrado(d) {
  return Boolean(d && String(d.emp_correo ?? "").trim() !== "");
}

function Configuracion() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [numeroEmpleado, setNumeroEmpleado] = useState("");
  const [datosEmpleado, setDatosEmpleado] = useState(null);
  const [loadingEmpleado, setLoadingEmpleado] = useState(false);
  const [errorEmpleado, setErrorEmpleado] = useState("");
  const [guardandoAprobador, setGuardandoAprobador] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const [aprobadores, setAprobadores] = useState([]);
  const [loadingAprobadores, setLoadingAprobadores] = useState(false);
  const [errorAprobadores, setErrorAprobadores] = useState("");
  const [aprobadorSeleccionado, setAprobadorSeleccionado] = useState(null);
  const [eliminandoAprobador, setEliminandoAprobador] = useState(false);
  const [mensajeExitoEliminar, setMensajeExitoEliminar] = useState("");

  // Estados para áreas
  const [areaNombre, setAreaNombre] = useState("");
  const [numeroEmpleadoArea, setNumeroEmpleadoArea] = useState("");
  const [datosEmpleadoArea, setDatosEmpleadoArea] = useState(null);
  const [loadingEmpleadoArea, setLoadingEmpleadoArea] = useState(false);
  const [errorEmpleadoResponsable, setErrorEmpleadoResponsable] = useState("");
  const [guardandoArea, setGuardandoArea] = useState(false);
  const [mensajeExitoArea, setMensajeExitoArea] = useState("");
  const [areas, setAreas] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [errorAreas, setErrorAreas] = useState("");
  const [areaSeleccionada, setAreaSeleccionada] = useState(null);
  const [eliminandoArea, setEliminandoArea] = useState(false);
  const [mensajeExitoEliminarArea, setMensajeExitoEliminarArea] = useState("");
  const [editandoArea, setEditandoArea] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (activeTab === 0 && mounted) {
      cargarAprobadores();
    } else if (activeTab === 1 && mounted) {
      cargarAreas();
    }
  }, [activeTab, mounted]);

  const cargarAprobadores = async () => {
    setLoadingAprobadores(true);
    setErrorAprobadores("");

    try {
      const response = await fetch("/api/aprobadores");
      const data = await response.json();

      if (!response.ok) {
        setErrorAprobadores(data.error || "Error al cargar aprobadores");
        setAprobadores([]);
      } else {
        setAprobadores(data.data || []);
        setErrorAprobadores("");
        // Limpiar selección si el aprobador seleccionado ya no existe
        if (
          aprobadorSeleccionado &&
          !data.data.find((a) => a.emp_id === aprobadorSeleccionado.emp_id)
        ) {
          setAprobadorSeleccionado(null);
        }
      }
    } catch (error) {
      console.error("Error al cargar aprobadores:", error);
      setErrorAprobadores("Error de conexión. Intente nuevamente.");
      setAprobadores([]);
    } finally {
      setLoadingAprobadores(false);
    }
  };

  const handleSeleccionarAprobador = (aprobador) => {
    if (
      aprobadorSeleccionado &&
      aprobadorSeleccionado.emp_id === aprobador.emp_id
    ) {
      setAprobadorSeleccionado(null);
    } else {
      setAprobadorSeleccionado(aprobador);
    }
  };

  const handleEliminarAprobador = async () => {
    if (!aprobadorSeleccionado) return;

    if (
      !confirm(
        `¿Está seguro de eliminar al aprobador ${aprobadorSeleccionado.emp_nombre}?`,
      )
    ) {
      return;
    }

    setEliminandoAprobador(true);
    setErrorAprobadores("");
    setMensajeExitoEliminar("");

    try {
      const response = await fetch(
        `/api/aprobadores/${aprobadorSeleccionado.emp_id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorAprobadores(data.error || "Error al eliminar el aprobador");
      } else {
        setMensajeExitoEliminar(
          data.message || "Aprobador eliminado correctamente",
        );
        setAprobadorSeleccionado(null);
        // Recargar la lista de aprobadores
        cargarAprobadores();
      }
    } catch (error) {
      console.error("Error al eliminar aprobador:", error);
      setErrorAprobadores("Error de conexión. Intente nuevamente.");
    } finally {
      setEliminandoAprobador(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleNumeroEmpleadoChange = (e) => {
    setNumeroEmpleado(e.target.value);
  };

  const handleNumeroEmpleadoKeyDown = async (e) => {
    if (e.key === "Enter" && numeroEmpleado.trim() !== "") {
      setLoadingEmpleado(true);
      setErrorEmpleado("");
      setDatosEmpleado(null);
      setMensajeExito("");

      try {
        const response = await fetch(`/api/empleados/${numeroEmpleado.trim()}`);
        const data = await response.json();

        if (!response.ok) {
          setErrorEmpleado(data.error || "Error al buscar empleado");
          setDatosEmpleado(null);
        } else {
          setDatosEmpleado(data);
          setErrorEmpleado("");
        }
      } catch (error) {
        console.error("Error al buscar empleado:", error);
        setErrorEmpleado("Error de conexión. Intente nuevamente.");
        setDatosEmpleado(null);
      } finally {
        setLoadingEmpleado(false);
      }
    }
  };

  const handleGuardarAprobador = async () => {
    if (!datosEmpleado) return;
    if (!empleadoTieneCorreoRegistrado(datosEmpleado)) {
      setErrorEmpleado(MSG_CORREO_NO_REGISTRADO);
      return;
    }

    setGuardandoAprobador(true);
    setErrorEmpleado("");
    setMensajeExito("");

    try {
      const response = await fetch("/api/aprobadores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emp_id: datosEmpleado.emp_id,
          emp_nombre: datosEmpleado.nombre,
          emp_correo: datosEmpleado.emp_correo ?? null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorEmpleado(data.error || "Error al guardar el aprobador");
      } else {
        setMensajeExito(data.message || "Aprobador guardado correctamente");
        // Limpiar el formulario después de guardar
        setNumeroEmpleado("");
        setDatosEmpleado(null);
        // Recargar la lista de aprobadores si estamos en esa pestaña
        if (activeTab === 0) {
          cargarAprobadores();
        }
      }
    } catch (error) {
      console.error("Error al guardar aprobador:", error);
      setErrorEmpleado("Error de conexión. Intente nuevamente.");
    } finally {
      setGuardandoAprobador(false);
    }
  };

  // Funciones para áreas
  const handleNumeroEmpleadoAreaChange = (e) => {
    setNumeroEmpleadoArea(e.target.value);
  };

  const handleNumeroEmpleadoAreaKeyDown = async (e) => {
    if (e.key === "Enter" && numeroEmpleadoArea.trim() !== "") {
      setLoadingEmpleadoArea(true);
      setErrorEmpleadoResponsable("");
      setDatosEmpleadoArea(null);

      try {
        const response = await fetch(
          `/api/empleados/${numeroEmpleadoArea.trim()}`,
        );
        const data = await response.json();

        if (!response.ok) {
          setErrorEmpleadoResponsable(data.error || "Error al buscar empleado");
          setDatosEmpleadoArea(null);
        } else {
          setDatosEmpleadoArea(data);
          setErrorEmpleadoResponsable("");
        }
      } catch (error) {
        console.error("Error al buscar empleado (área):", error);
        setErrorEmpleadoResponsable("Error de conexión. Intente nuevamente.");
        setDatosEmpleadoArea(null);
      } finally {
        setLoadingEmpleadoArea(false);
      }
    }
  };

  const cargarAreas = async () => {
    setLoadingAreas(true);
    setErrorAreas("");

    try {
      const response = await fetch("/api/areas");
      const data = await response.json();

      if (!response.ok) {
        setErrorAreas(data.error || "Error al cargar áreas");
        setAreas([]);
      } else {
        setAreas(data.data || []);
        setErrorAreas("");
        // Limpiar selección si el área seleccionada ya no existe
        if (
          areaSeleccionada &&
          !data.data.find((a) => a.id_area === areaSeleccionada.id_area)
        ) {
          setAreaSeleccionada(null);
          setEditandoArea(false);
        }
      }
    } catch (error) {
      console.error("Error al cargar áreas:", error);
      setErrorAreas("Error de conexión. Intente nuevamente.");
      setAreas([]);
    } finally {
      setLoadingAreas(false);
    }
  };

  const handleSeleccionarArea = (area) => {
    if (areaSeleccionada && areaSeleccionada.id_area === area.id_area) {
      setAreaSeleccionada(null);
      setEditandoArea(false);
    } else {
      setAreaSeleccionada(area);
      setEditandoArea(false);
    }
  };

  const handleEditarArea = () => {
    if (!areaSeleccionada) return;
    setEditandoArea(true);
    setAreaNombre(areaSeleccionada.area_nombre);
    setErrorEmpleadoResponsable("");
    setMensajeExitoArea("");
    const eid = areaSeleccionada.emp_id;
    if (eid != null && String(eid).trim() !== "") {
      setNumeroEmpleadoArea(String(eid).trim());
      setDatosEmpleadoArea({
        emp_id: eid,
        nombre: areaSeleccionada.emp_nombre,
        emp_correo: areaSeleccionada.emp_correo ?? null,
      });
    } else {
      setNumeroEmpleadoArea("");
      setDatosEmpleadoArea(null);
    }
  };

  const handleCancelarEdicion = () => {
    setEditandoArea(false);
    setAreaNombre("");
    setNumeroEmpleadoArea("");
    setDatosEmpleadoArea(null);
    setErrorEmpleadoResponsable("");
    setMensajeExitoArea("");
  };

  const handleGuardarArea = async () => {
    if (!areaNombre.trim()) {
      setErrorEmpleadoResponsable("Ingrese el nombre del área");
      return;
    }
    if (!datosEmpleadoArea) {
      setErrorEmpleadoResponsable(
        "Busque al responsable por número de empleado (Enter)",
      );
      return;
    }
    if (!empleadoTieneCorreoRegistrado(datosEmpleadoArea)) {
      setErrorEmpleadoResponsable(MSG_CORREO_NO_REGISTRADO);
      return;
    }

    setGuardandoArea(true);
    setErrorEmpleadoResponsable("");
    setMensajeExitoArea("");

    try {
      const url = editandoArea
        ? `/api/areas/${areaSeleccionada.id_area}`
        : "/api/areas";
      const method = editandoArea ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          area_nombre: areaNombre.trim(),
          emp_id: datosEmpleadoArea.emp_id,
          emp_nombre: datosEmpleadoArea.nombre,
          emp_correo: datosEmpleadoArea.emp_correo ?? null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorEmpleadoResponsable(data.error || "Error al guardar el área");
      } else {
        setMensajeExitoArea(data.message || "Área guardada correctamente");
        setAreaNombre("");
        setNumeroEmpleadoArea("");
        setDatosEmpleadoArea(null);
        setEditandoArea(false);
        setAreaSeleccionada(null);
        cargarAreas();
      }
    } catch (error) {
      console.error("Error al guardar área:", error);
      setErrorEmpleadoResponsable("Error de conexión. Intente nuevamente.");
    } finally {
      setGuardandoArea(false);
    }
  };

  const handleEliminarArea = async () => {
    if (!areaSeleccionada) return;

    if (
      !confirm(
        `¿Está seguro de eliminar el área "${areaSeleccionada.area_nombre}"?`,
      )
    ) {
      return;
    }

    setEliminandoArea(true);
    setErrorAreas("");
    setMensajeExitoEliminarArea("");

    try {
      const response = await fetch(`/api/areas/${areaSeleccionada.id_area}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorAreas(data.error || "Error al eliminar el área");
      } else {
        setMensajeExitoEliminarArea(
          data.message || "Área eliminada correctamente",
        );
        setAreaSeleccionada(null);
        setEditandoArea(false);
        // Recargar la lista de áreas
        cargarAreas();
      }
    } catch (error) {
      console.error("Error al eliminar área:", error);
      setErrorAreas("Error de conexión. Intente nuevamente.");
    } finally {
      setEliminandoArea(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <HexagonMenu selectedItemId="configuracion">
      {/* Panel de pestañas a la derecha */}
      <Paper
        elevation={8}
        sx={{
          minWidth: { xs: "100%", sm: "450px", md: "500px", lg: "600px" },
          maxWidth: { xs: "100%", md: "600px" },
          width: { xs: "100%", lg: "auto" },
          backgroundColor: "#ffffff",
          border: "1px solid rgba(25, 118, 210, 0.16)",
          borderRadius: 3,
          overflow: "hidden",
          ml: { xs: 0, lg: 4 },
          mt: { xs: 3, lg: 0 },
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            borderBottom: "1px solid rgba(25, 118, 210, 0.14)",
            "& .MuiTab-root": {
              color: "#424242",
              fontWeight: 600,
              textTransform: "none",
              fontSize: "1rem",
              "&.Mui-selected": {
                color: "#0D47A1",
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "#1976D2",
            },
          }}
        >
          <Tab label="Aprobadores" />
          <Tab label="Áreas" />
        </Tabs>

        {/* Contenido de la primera pestaña - Aprobadores */}
        {activeTab === 0 && (
          <Box sx={{ p: 4 }}>
            <Typography
              variant="h6"
              sx={{
                color: "#0D47A1",
                mb: 3,
                fontWeight: 600,
              }}
            >
              Añadir aprobador
            </Typography>

            <TextField
              fullWidth
              label="Número de empleado"
              value={numeroEmpleado}
              onChange={handleNumeroEmpleadoChange}
              onKeyDown={handleNumeroEmpleadoKeyDown}
              placeholder="Ingrese el número de empleado"
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#FFFFFF",
                  borderRadius: 2,
                  color: "#212121",
                  "& fieldset": {
                    borderColor: "rgba(0, 0, 0, 0.23)",
                  },
                  "&:hover fieldset": {
                    borderColor: "#1976D2",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1976D2",
                    borderWidth: 2,
                  },
                },
                "& .MuiInputLabel-root": {
                  color: "#424242",
                  "&.Mui-focused": {
                    color: "#1976D2",
                  },
                },
                "& .MuiInputBase-input": {
                  color: "#212121",
                },
                "& .MuiInputBase-input::placeholder": {
                  color: "#757575",
                  opacity: 1,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {loadingEmpleado ? (
                      <CircularProgress size={20} sx={{ color: "#1976D2" }} />
                    ) : (
                      <Person sx={{ color: "#1976D2" }} />
                    )}
                  </InputAdornment>
                ),
              }}
              disabled={loadingEmpleado}
            />

            {loadingEmpleado && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 2,
                  mb: 2,
                }}
              >
                <CircularProgress size={20} sx={{ color: "#1976D2" }} />
                <Typography
                  variant="body2"
                  sx={{
                    color: "#424242",
                  }}
                >
                  Buscando empleado...
                </Typography>
              </Box>
            )}

            {errorEmpleado && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  backgroundColor: "#FFEBEE",
                  color: "#B71C1C",
                  border: "1px solid #EF9A9A",
                  "& .MuiAlert-icon": {
                    color: "#C62828",
                  },
                }}
              >
                {errorEmpleado}
              </Alert>
            )}

            {datosEmpleado && !loadingEmpleado && (
              <Box>
                {!empleadoTieneCorreoRegistrado(datosEmpleado) && (
                  <Alert
                    severity="warning"
                    sx={{
                      mb: 2,
                      backgroundColor: "#FFF8E1",
                      color: "#E65100",
                      border: "1px solid #FFCC80",
                      "& .MuiAlert-icon": {
                        color: "#F57C00",
                      },
                    }}
                  >
                    {MSG_CORREO_NO_REGISTRADO}
                  </Alert>
                )}
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: "#F5F5F5",
                    borderRadius: 2,
                    border: "1px solid rgba(0, 0, 0, 0.08)",
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      color: "#212121",
                      fontWeight: 600,
                    }}
                  >
                    Nombre: {datosEmpleado.nombre}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#424242",
                      display: "block",
                      mt: 1,
                    }}
                  >
                    ID: {datosEmpleado.emp_id}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#424242",
                      display: "block",
                      mt: 0.5,
                    }}
                  >
                    Correo:{" "}
                    {empleadoTieneCorreoRegistrado(datosEmpleado)
                      ? datosEmpleado.emp_correo.trim()
                      : "—"}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={handleGuardarAprobador}
                  disabled={
                    guardandoAprobador ||
                    !empleadoTieneCorreoRegistrado(datosEmpleado)
                  }
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: "1rem",
                    textTransform: "none",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
                    "&:hover": {
                      boxShadow: "0 4px 12px rgba(25, 118, 210, 0.4)",
                    },
                    "&:disabled": {
                      backgroundColor: "#E0E0E0",
                      color: "#616161",
                      boxShadow: "none",
                    },
                  }}
                >
                  {guardandoAprobador ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <CircularProgress size={20} color="inherit" />
                      Guardando...
                    </Box>
                  ) : (
                    "Guardar aprobador"
                  )}
                </Button>

                {mensajeExito && (
                  <Alert
                    severity="success"
                    sx={{
                      mt: 2,
                      backgroundColor: "#E8F5E9",
                      color: "#1B5E20",
                      border: "1px solid #A5D6A7",
                      "& .MuiAlert-icon": {
                        color: "#2E7D32",
                      },
                    }}
                    onClose={() => setMensajeExito("")}
                  >
                    {mensajeExito}
                  </Alert>
                )}
              </Box>
            )}

            <Typography
              variant="h6"
              sx={{
                color: "#0D47A1",
                fontWeight: 600,
                mb: 3,
                mt: 4,
              }}
            >
              Lista de Aprobadores
            </Typography>

            {loadingAprobadores && (
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

            {errorAprobadores && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  backgroundColor: "#FFEBEE",
                  color: "#B71C1C",
                  border: "1px solid #EF9A9A",
                  "& .MuiAlert-icon": {
                    color: "#C62828",
                  },
                }}
                onClose={() => setErrorAprobadores("")}
              >
                {errorAprobadores}
              </Alert>
            )}

            {mensajeExitoEliminar && (
              <Alert
                severity="success"
                sx={{
                  mb: 2,
                  backgroundColor: "#E8F5E9",
                  color: "#1B5E20",
                  border: "1px solid #A5D6A7",
                  "& .MuiAlert-icon": {
                    color: "#2E7D32",
                  },
                }}
                onClose={() => setMensajeExitoEliminar("")}
              >
                {mensajeExitoEliminar}
              </Alert>
            )}

            {aprobadorSeleccionado && (
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Delete />}
                  onClick={handleEliminarAprobador}
                  disabled={eliminandoAprobador}
                  sx={{
                    py: 1,
                    px: 2,
                    borderRadius: 2,
                    backgroundColor: "#fee2e2",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    textTransform: "none",
                    color: "#991b1b",
                    border: "1px solid #f87171",
                    boxShadow: "none",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      backgroundColor: "#fecaca",
                      color: "#7f1d1d",
                      transform: "translateY(-2px)",
                    },
                    "&:disabled": {
                      backgroundColor: "#FFEBEE",
                      color: "#616161",
                      transform: "none",
                    },
                  }}
                >
                  {eliminandoAprobador ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <CircularProgress size={16} sx={{ color: "#991b1b" }} />
                      Eliminando...
                    </Box>
                  ) : (
                    `Eliminar ${aprobadorSeleccionado.emp_nombre}`
                  )}
                </Button>
              </Box>
            )}

            {!loadingAprobadores && !errorAprobadores && (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 2,
                  border: "1px solid rgba(0, 0, 0, 0.12)",
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{
                        backgroundColor: "#E3F2FD",
                        "& th": { borderBottom: "1px solid rgba(0, 0, 0, 0.12)" },
                      }}
                    >
                      <TableCell
                        sx={{
                          color: "#0D47A1",
                          fontWeight: 700,
                          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
                        }}
                      >
                        ID Empleado
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "#0D47A1",
                          fontWeight: 700,
                          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
                        }}
                      >
                        Nombre
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "#0D47A1",
                          fontWeight: 700,
                          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
                        }}
                      >
                        Correo
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {aprobadores.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          sx={{
                            textAlign: "center",
                            color: "#616161",
                            py: 4,
                          }}
                        >
                          No hay aprobadores registrados
                        </TableCell>
                      </TableRow>
                    ) : (
                      aprobadores.map((aprobador, index) => {
                        const isSelected =
                          aprobadorSeleccionado &&
                          aprobadorSeleccionado.emp_id === aprobador.emp_id;
                        return (
                          <TableRow
                            key={aprobador.emp_id}
                            onClick={() =>
                              handleSeleccionarAprobador(aprobador)
                            }
                            sx={{
                              cursor: "pointer",
                              backgroundColor: isSelected
                                ? "rgba(25, 118, 210, 0.1)"
                                : "transparent",
                              "&:hover": {
                                backgroundColor: isSelected
                                  ? "rgba(25, 118, 210, 0.14)"
                                  : "rgba(25, 118, 210, 0.06)",
                              },
                              borderBottom:
                                index < aprobadores.length - 1
                                  ? "1px solid rgba(0, 0, 0, 0.08)"
                                  : "none",
                              borderLeft: isSelected
                                ? "3px solid #1976D2"
                                : "3px solid transparent",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <TableCell
                              sx={{
                                color: isSelected ? "#0D47A1" : "#212121",
                                borderBottom: "none",
                                fontWeight: isSelected ? 600 : 400,
                              }}
                            >
                              {aprobador.emp_id}
                            </TableCell>
                            <TableCell
                              sx={{
                                color: isSelected ? "#0D47A1" : "#212121",
                                borderBottom: "none",
                                fontWeight: isSelected ? 600 : 400,
                              }}
                            >
                              {aprobador.emp_nombre}
                            </TableCell>
                            <TableCell
                              sx={{
                                color: isSelected ? "#0D47A1" : "#212121",
                                borderBottom: "none",
                                fontWeight: isSelected ? 500 : 400,
                                fontSize: "0.875rem",
                                maxWidth: 280,
                                wordBreak: "break-word",
                              }}
                            >
                              {aprobador.emp_correo?.trim() || "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* Contenido de la segunda pestaña - Áreas */}
        {activeTab === 1 && (
          <Box sx={{ p: 4 }}>
            <Typography
              variant="h6"
              sx={{
                color: "#0D47A1",
                mb: 3,
                fontWeight: 600,
              }}
            >
              {editandoArea ? "Modificar Área" : "Añadir Área"}
            </Typography>

            <TextField
              fullWidth
              label="Nombre del Área"
              value={areaNombre}
              onChange={(e) => setAreaNombre(e.target.value)}
              placeholder="Ingrese el nombre del área"
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#FFFFFF",
                  borderRadius: 2,
                  color: "#212121",
                  "& fieldset": {
                    borderColor: "rgba(0, 0, 0, 0.23)",
                  },
                  "&:hover fieldset": {
                    borderColor: "#1976D2",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1976D2",
                    borderWidth: 2,
                  },
                },
                "& .MuiInputLabel-root": {
                  color: "#424242",
                  "&.Mui-focused": {
                    color: "#1976D2",
                  },
                },
                "& .MuiInputBase-input": {
                  color: "#212121",
                },
                "& .MuiInputBase-input::placeholder": {
                  color: "#757575",
                  opacity: 1,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Business sx={{ color: "#1976D2" }} />
                  </InputAdornment>
                ),
              }}
            />

            <Typography
              variant="body2"
              sx={{ color: "#757575", mb: 2 }}
            ></Typography>

            <TextField
              fullWidth
              label="Número de empleado (responsable)"
              value={numeroEmpleadoArea}
              onChange={handleNumeroEmpleadoAreaChange}
              onKeyDown={handleNumeroEmpleadoAreaKeyDown}
              placeholder="Ingrese el número y Enter para buscar"
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#FFFFFF",
                  borderRadius: 2,
                  color: "#212121",
                  "& fieldset": {
                    borderColor: "rgba(0, 0, 0, 0.23)",
                  },
                  "&:hover fieldset": {
                    borderColor: "#1976D2",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1976D2",
                    borderWidth: 2,
                  },
                },
                "& .MuiInputLabel-root": {
                  color: "#424242",
                  "&.Mui-focused": {
                    color: "#1976D2",
                  },
                },
                "& .MuiInputBase-input": {
                  color: "#212121",
                },
                "& .MuiInputBase-input::placeholder": {
                  color: "#757575",
                  opacity: 1,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {loadingEmpleadoArea ? (
                      <CircularProgress size={20} sx={{ color: "#1976D2" }} />
                    ) : (
                      <Person sx={{ color: "#1976D2" }} />
                    )}
                  </InputAdornment>
                ),
              }}
              disabled={loadingEmpleadoArea}
            />

            {loadingEmpleadoArea && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 2,
                  mb: 2,
                }}
              >
                <CircularProgress size={20} sx={{ color: "#1976D2" }} />
                <Typography variant="body2" sx={{ color: "#424242" }}>
                  Buscando empleado...
                </Typography>
              </Box>
            )}

            {errorEmpleadoResponsable && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  backgroundColor: "#FFEBEE",
                  color: "#B71C1C",
                  border: "1px solid #EF9A9A",
                  "& .MuiAlert-icon": {
                    color: "#C62828",
                  },
                }}
                onClose={() => setErrorEmpleadoResponsable("")}
              >
                {errorEmpleadoResponsable}
              </Alert>
            )}

            {datosEmpleadoArea && !loadingEmpleadoArea && (
              <Box sx={{ mb: 2 }}>
                {!empleadoTieneCorreoRegistrado(datosEmpleadoArea) && (
                  <Alert
                    severity="warning"
                    sx={{
                      mb: 2,
                      backgroundColor: "#FFF8E1",
                      color: "#E65100",
                      border: "1px solid #FFCC80",
                      "& .MuiAlert-icon": {
                        color: "#F57C00",
                      },
                    }}
                  >
                    {MSG_CORREO_NO_REGISTRADO}
                  </Alert>
                )}
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: "#F5F5F5",
                    borderRadius: 2,
                    border: "1px solid rgba(0, 0, 0, 0.08)",
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ color: "#212121", fontWeight: 600 }}
                  >
                    Nombre: {datosEmpleadoArea.nombre}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "#424242", display: "block", mt: 1 }}
                  >
                    ID: {datosEmpleadoArea.emp_id}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "#424242", display: "block", mt: 0.5 }}
                  >
                    Correo:{" "}
                    {empleadoTieneCorreoRegistrado(datosEmpleadoArea)
                      ? datosEmpleadoArea.emp_correo.trim()
                      : "—"}
                  </Typography>
                </Box>
              </Box>
            )}

            {mensajeExitoArea && (
              <Alert
                severity="success"
                sx={{
                  mb: 2,
                  backgroundColor: "#E8F5E9",
                  color: "#1B5E20",
                  border: "1px solid #A5D6A7",
                  "& .MuiAlert-icon": {
                    color: "#2E7D32",
                  },
                }}
                onClose={() => setMensajeExitoArea("")}
              >
                {mensajeExitoArea}
              </Alert>
            )}

            <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleGuardarArea}
                disabled={
                  guardandoArea ||
                  !areaNombre.trim() ||
                  !datosEmpleadoArea ||
                  !empleadoTieneCorreoRegistrado(datosEmpleadoArea)
                }
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: "1rem",
                  textTransform: "none",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
                  "&:hover": {
                    boxShadow: "0 4px 12px rgba(25, 118, 210, 0.4)",
                  },
                  "&:disabled": {
                    backgroundColor: "#E0E0E0",
                    color: "#616161",
                    boxShadow: "none",
                  },
                }}
              >
                {guardandoArea ? (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <CircularProgress size={20} color="inherit" />
                    {editandoArea ? "Modificando..." : "Guardando..."}
                  </Box>
                ) : editandoArea ? (
                  "Modificar Área"
                ) : (
                  "Guardar Área"
                )}
              </Button>

              {editandoArea && (
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={handleCancelarEdicion}
                  disabled={guardandoArea}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    borderColor: "rgba(0, 0, 0, 0.23)",
                    color: "#424242",
                    fontWeight: 600,
                    fontSize: "1rem",
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "#1976D2",
                      color: "#0D47A1",
                      backgroundColor: "rgba(25, 118, 210, 0.06)",
                    },
                  }}
                >
                  Cancelar
                </Button>
              )}
            </Box>

            <Typography
              variant="h6"
              sx={{
                color: "#0D47A1",
                fontWeight: 600,
                mb: 3,
                mt: 4,
              }}
            >
              Lista de Áreas
            </Typography>

            {loadingAreas && (
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

            {errorAreas && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  backgroundColor: "#FFEBEE",
                  color: "#B71C1C",
                  border: "1px solid #EF9A9A",
                  "& .MuiAlert-icon": {
                    color: "#C62828",
                  },
                }}
                onClose={() => setErrorAreas("")}
              >
                {errorAreas}
              </Alert>
            )}

            {mensajeExitoEliminarArea && (
              <Alert
                severity="success"
                sx={{
                  mb: 2,
                  backgroundColor: "#E8F5E9",
                  color: "#1B5E20",
                  border: "1px solid #A5D6A7",
                  "& .MuiAlert-icon": {
                    color: "#2E7D32",
                  },
                }}
                onClose={() => setMensajeExitoEliminarArea("")}
              >
                {mensajeExitoEliminarArea}
              </Alert>
            )}

            {areaSeleccionada && !editandoArea && (
              <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<Edit />}
                  onClick={handleEditarArea}
                  sx={{
                    py: 1,
                    px: 2,
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    textTransform: "none",
                    borderWidth: 2,
                    color: "#0D47A1",
                    borderColor: "#1976D2",
                    "&:hover": {
                      borderWidth: 2,
                      borderColor: "#0D47A1",
                      backgroundColor: "rgba(25, 118, 210, 0.06)",
                    },
                  }}
                >
                  Modificar Área
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Delete />}
                  onClick={handleEliminarArea}
                  disabled={eliminandoArea}
                  sx={{
                    py: 1,
                    px: 2,
                    borderRadius: 2,
                    backgroundColor: "#fee2e2",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    textTransform: "none",
                    color: "#991b1b",
                    border: "1px solid #f87171",
                    boxShadow: "none",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      backgroundColor: "#fecaca",
                      color: "#7f1d1d",
                      transform: "translateY(-2px)",
                    },
                    "&:disabled": {
                      backgroundColor: "#FFEBEE",
                      color: "#616161",
                      transform: "none",
                    },
                  }}
                >
                  {eliminandoArea ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <CircularProgress size={16} sx={{ color: "#991b1b" }} />
                      Eliminando...
                    </Box>
                  ) : (
                    `Eliminar ${areaSeleccionada.area_nombre}`
                  )}
                </Button>
              </Box>
            )}

            {!loadingAreas && !errorAreas && (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 2,
                  border: "1px solid rgba(0, 0, 0, 0.12)",
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{
                        backgroundColor: "#E3F2FD",
                        "& th": {
                          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
                        },
                      }}
                    >
                      <TableCell
                        sx={{
                          color: "#0D47A1",
                          fontWeight: 700,
                          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
                        }}
                      >
                        ID Área
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "#0D47A1",
                          fontWeight: 700,
                          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
                        }}
                      >
                        Nombre del Área
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "#0D47A1",
                          fontWeight: 700,
                          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
                        }}
                      >
                        ID empleado
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "#0D47A1",
                          fontWeight: 700,
                          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
                        }}
                      >
                        Nombre (emp_nombre)
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "#0D47A1",
                          fontWeight: 700,
                          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
                        }}
                      >
                        Correo
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {areas.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          sx={{
                            textAlign: "center",
                            color: "#616161",
                            py: 4,
                          }}
                        >
                          No hay áreas registradas
                        </TableCell>
                      </TableRow>
                    ) : (
                      areas.map((area, index) => {
                        const isSelected =
                          areaSeleccionada &&
                          areaSeleccionada.id_area === area.id_area;
                        return (
                          <TableRow
                            key={area.id_area}
                            onClick={() => handleSeleccionarArea(area)}
                            sx={{
                              cursor: "pointer",
                              backgroundColor: isSelected
                                ? "rgba(25, 118, 210, 0.1)"
                                : "transparent",
                              "&:hover": {
                                backgroundColor: isSelected
                                  ? "rgba(25, 118, 210, 0.14)"
                                  : "rgba(25, 118, 210, 0.06)",
                              },
                              borderBottom:
                                index < areas.length - 1
                                  ? "1px solid rgba(0, 0, 0, 0.08)"
                                  : "none",
                              borderLeft: isSelected
                                ? "3px solid #1976D2"
                                : "3px solid transparent",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <TableCell
                              sx={{
                                color: isSelected ? "#0D47A1" : "#212121",
                                borderBottom: "none",
                                fontWeight: isSelected ? 600 : 400,
                              }}
                            >
                              {area.id_area}
                            </TableCell>
                            <TableCell
                              sx={{
                                color: isSelected ? "#0D47A1" : "#212121",
                                borderBottom: "none",
                                fontWeight: isSelected ? 600 : 400,
                              }}
                            >
                              {area.area_nombre}
                            </TableCell>
                            <TableCell
                              sx={{
                                color: isSelected ? "#0D47A1" : "#212121",
                                borderBottom: "none",
                                fontWeight: isSelected ? 600 : 400,
                              }}
                            >
                              {area.emp_id ?? "—"}
                            </TableCell>
                            <TableCell
                              sx={{
                                color: isSelected ? "#0D47A1" : "#212121",
                                borderBottom: "none",
                                fontWeight: isSelected ? 600 : 400,
                              }}
                            >
                              {area.emp_nombre}
                            </TableCell>
                            <TableCell
                              sx={{
                                color: isSelected ? "#0D47A1" : "#212121",
                                borderBottom: "none",
                                fontWeight: isSelected ? 500 : 400,
                                fontSize: "0.875rem",
                                maxWidth: 220,
                                wordBreak: "break-word",
                              }}
                            >
                              {area.emp_correo?.trim() || "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Paper>
    </HexagonMenu>
  );
}

export default Configuracion;
