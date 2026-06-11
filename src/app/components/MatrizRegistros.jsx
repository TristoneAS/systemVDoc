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
  CircularProgress,
  Alert,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import HexagonMenu from "./HexagonMenu";

function MatrizRegistros() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    cargarRegistros();
  }, []);

  const cargarRegistros = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/documentos");
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Error al cargar la matriz de registros");
        setRegistros([]);
        return;
      }
      setRegistros(data.data || []);
    } catch (e) {
      console.error("Error al cargar matriz de registros:", e);
      setError("Error de conexión. Intente nuevamente.");
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  };

  const registrosFiltrados = registros.filter((doc) => {
    const q = searchTerm.toLowerCase();
    return (
      String(doc.nomenclatura ?? "")
        .toLowerCase()
        .includes(q) ||
      String(doc.nombre_documento ?? "")
        .toLowerCase()
        .includes(q) ||
      String(doc.responsable_area ?? "")
        .toLowerCase()
        .includes(q) ||
      String(doc.area_nombre ?? "")
        .toLowerCase()
        .includes(q) ||
      String(doc.tiempo_retencion ?? "")
        .toLowerCase()
        .includes(q) ||
      String(doc.ubicacion_registro ?? "")
        .toLowerCase()
        .includes(q)
    );
  });

  return (
    <HexagonMenu selectedItemId="matriz-registros">
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
          Matriz de registros
        </Typography>
        <Typography variant="body2" sx={{ color: "#757575", mb: 3 }}>
          Consulta del catálogo: nomenclatura, nombre, responsable del área
          (areas.emp_nombre por documentos.id_area), área, retención y ubicación.
        </Typography>

        <TextField
          fullWidth
          placeholder="Buscar por nomenclatura, nombre, responsable del área..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            mb: 3,
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#E3F2FD",
              color: "#1976D2",
              "& fieldset": { borderColor: "rgba(25, 118, 210, 0.16)" },
              "&:hover fieldset": { borderColor: "#1976D2" },
              "&.Mui-focused fieldset": { borderColor: "#1976D2" },
            },
            "& .MuiInputBase-input": { color: "#1976D2" },
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
              Total de registros: {registrosFiltrados.length}
            </Typography>
            <TableContainer
              component={Paper}
              sx={{
                backgroundColor: "#E3F2FD",
                borderRadius: 2,
                border: "1px solid rgba(25, 118, 210, 0.14)",
              }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#1976D2",
                        borderBottom: "2px solid rgba(25, 118, 210, 0.2)",
                      }}
                    >
                      Nomenclatura
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#1976D2",
                        borderBottom: "2px solid rgba(25, 118, 210, 0.2)",
                      }}
                    >
                      Nombre del registro
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#1976D2",
                        borderBottom: "2px solid rgba(25, 118, 210, 0.2)",
                      }}
                    >
                      Responsable del área
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#1976D2",
                        borderBottom: "2px solid rgba(25, 118, 210, 0.2)",
                      }}
                    >
                      Dueño del registro
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#1976D2",
                        borderBottom: "2px solid rgba(25, 118, 210, 0.2)",
                      }}
                    >
                      Tiempo de retención
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "#1976D2",
                        borderBottom: "2px solid rgba(25, 118, 210, 0.2)",
                      }}
                    >
                      Ubicación del registro
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registrosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        align="center"
                        sx={{ color: "#757575", py: 4, borderBottom: "none" }}
                      >
                        {searchTerm
                          ? "No hay registros que coincidan con la búsqueda"
                          : "No hay registros en el catálogo"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    registrosFiltrados.map((doc, index) => (
                      <TableRow
                        key={doc.id_documento}
                        sx={{
                          "&:hover": {
                            backgroundColor: "rgba(25, 118, 210, 0.06)",
                          },
                          borderBottom:
                            index < registrosFiltrados.length - 1
                              ? "1px solid rgba(25, 118, 210, 0.1)"
                              : "none",
                        }}
                      >
                        <TableCell
                          sx={{ color: "#1976D2", borderBottom: "none" }}
                        >
                          {doc.nomenclatura?.trim() ? doc.nomenclatura : "—"}
                        </TableCell>
                        <TableCell
                          sx={{ color: "#1976D2", borderBottom: "none" }}
                        >
                          {doc.nombre_documento}
                        </TableCell>
                        <TableCell
                          sx={{ color: "#1976D2", borderBottom: "none" }}
                        >
                          {doc.responsable_area?.trim()
                            ? doc.responsable_area
                            : "—"}
                        </TableCell>
                        <TableCell
                          sx={{ color: "#1976D2", borderBottom: "none" }}
                        >
                          {doc.area_nombre ?? "—"}
                        </TableCell>
                        <TableCell
                          sx={{ color: "#1976D2", borderBottom: "none" }}
                        >
                          {doc.tiempo_retencion?.trim()
                            ? doc.tiempo_retencion
                            : "—"}
                        </TableCell>
                        <TableCell
                          sx={{ color: "#1976D2", borderBottom: "none" }}
                        >
                          {doc.ubicacion_registro?.trim()
                            ? doc.ubicacion_registro
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>
    </HexagonMenu>
  );
}

export default MatrizRegistros;
