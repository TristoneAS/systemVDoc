"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Grid,
  Chip,
  Divider,
} from "@mui/material";
import { Assignment, Schedule } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import HexagonMenu from "./HexagonMenu";

function formatFecha(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("es-MX");
  } catch {
    return String(v);
  }
}

function labelFaseAprobacion(r) {
  if (r.estado !== "pendiente") return "—";
  if (r.fase_aprobacion === "jefe") return "Jefe directo";
  if (r.fase_aprobacion === "final") return "Comité / área";
  const jefe =
    r.emp_id_jefe_aprobador != null &&
    String(r.emp_id_jefe_aprobador).trim() !== "";
  if (jefe && !r.aprobacion_jefe_en) return "Jefe directo";
  return "Comité / área";
}

function getMiEmpId() {
  try {
    const raw = localStorage.getItem("infoUser");
    if (!raw) return "";
    const u = JSON.parse(raw);
    return u?.emp_id != null ? String(u.emp_id).trim() : "";
  } catch {
    return "";
  }
}

function leerNombreSesion() {
  try {
    const usuario = localStorage.getItem("usuario");
    if (usuario != null && String(usuario).trim() !== "") {
      return String(usuario).trim();
    }
    const raw = localStorage.getItem("infoUser");
    if (raw) {
      const u = JSON.parse(raw);
      const alias = String(u?.emp_alias ?? "").trim();
      if (alias) return alias;
      const nombre = String(u?.emp_nombre ?? "").trim();
      if (nombre) return nombre;
    }
  } catch {
    /* ignore */
  }
  return "Usuario";
}

function SolicitudPendienteCard({ r }) {
  const detalle =
    r.tipo === "cambio" ? r.motivo || "—" : r.nombre_documento || "—";
  const tipoLabel = r.tipo === "nuevo" ? "Nuevo documento" : "Cambio";

  const rows = [
    { label: "Tipo", value: tipoLabel },
    { label: "Solicitante", value: r.solicitante || "—" },
    { label: "ID documento", value: r.id_documento ?? "—" },
    { label: "Detalle", value: detalle },
    { label: "Fase", value: labelFaseAprobacion(r) },
    { label: "Fecha", value: formatFecha(r.fecha_creacion) },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        backgroundColor: "#ffffff",
        border: "1px solid rgba(0, 0, 0, 0.06)",
        borderRadius: "8px",
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1,
          px: 2,
          pt: 2,
          pb: 1.5,
        }}
      >
        <Typography
          sx={{
            color: "#1976D2",
            fontWeight: 700,
            fontSize: "1rem",
            lineHeight: 1.3,
          }}
        >
          Solicitud #{r.id_solicitud}
        </Typography>
        <Chip
          label="Pendiente"
          size="small"
          sx={{
            backgroundColor: "#F57C00",
            color: "#ffffff",
            fontWeight: 600,
            fontSize: "0.7rem",
            height: 24,
            "& .MuiChip-label": { px: 1.25 },
          }}
        />
      </Box>
      <Divider sx={{ borderColor: "rgba(0, 0, 0, 0.08)" }} />
      <Box sx={{ px: 2, py: 0.5, pb: 2 }}>
        {rows.map((row) => (
          <Box
            key={row.label}
            sx={{
              py: 1.25,
              borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
              "&:last-of-type": { borderBottom: "none" },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "#757575",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 600,
                fontSize: "0.65rem",
                display: "block",
                mb: 0.5,
              }}
            >
              {row.label}
            </Typography>
            <Typography
              sx={{
                color: "#212121",
                fontWeight: 700,
                fontSize: "0.9rem",
                lineHeight: 1.35,
                wordBreak: "break-word",
              }}
            >
              {row.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [nombreBienvenida, setNombreBienvenida] = useState("");
  const [pendientes, setPendientes] = useState([]);
  const [loadingPendientes, setLoadingPendientes] = useState(true);

  const cargarPendientes = useCallback(async () => {
    setLoadingPendientes(true);
    try {
      const empId = getMiEmpId();
      const url = empId
        ? `/api/solicitudes?for_emp_id=${encodeURIComponent(empId)}`
        : "/api/solicitudes";
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPendientes([]);
        return;
      }
      const list = Array.isArray(data.data) ? data.data : [];
      setPendientes(
        list.filter(
          (row) => row.estado === "pendiente" && Boolean(row.puede_aprobar),
        ),
      );
    } catch {
      setPendientes([]);
    } finally {
      setLoadingPendientes(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    setNombreBienvenida(leerNombreSesion());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    cargarPendientes();
  }, [mounted, cargarPendientes]);

  if (!mounted) {
    return null;
  }

  return (
    <HexagonMenu selectedItemId="inicio">
      <Box
        sx={{
          maxWidth: 1200,
          mx: "auto",
          mb: 3,
          px: { xs: 1, sm: 2 },
        }}
      >
        <Box
          sx={{
            borderRadius: "12px",
            py: { xs: 4, sm: 5 },
            px: 3,
            textAlign: "center",
            background: "linear-gradient(135deg, #F57C00 0%, #FF9800 100%)",
            boxShadow: "0 8px 28px rgba(245, 124, 0, 0.35)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <Assignment
            sx={{
              fontSize: 52,
              color: "rgba(255,255,255,0.95)",
              mb: 1.5,
              display: "block",
              mx: "auto",
            }}
          />
          <Typography
            component="h1"
            sx={{
              color: "#ffffff",
              fontWeight: 700,
              fontSize: { xs: "1.5rem", sm: "1.85rem" },
              letterSpacing: "0.02em",
              mb: 1,
              lineHeight: 1.25,
            }}
          >
            Bienvenido{nombreBienvenida ? `, ${nombreBienvenida}` : ""}
          </Typography>
          <Typography
            sx={{
              color: "rgba(255,255,255,0.88)",
              fontWeight: 500,
              fontSize: "1rem",
              mb: 2,
            }}
          >
            System V-Docs
          </Typography>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              color: "#ffffff",
              fontWeight: 700,
              fontSize: { xs: "1.35rem", sm: "1.6rem" },
            }}
          >
            <Schedule sx={{ fontSize: { xs: 32, sm: 36 }, opacity: 0.95 }} />
            <span>
              {loadingPendientes ? "…" : pendientes.length}{" "}
              {loadingPendientes
                ? ""
                : pendientes.length === 1
                  ? "Pendiente"
                  : "Pendientes"}
            </span>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          maxWidth: 1200,
          mx: "auto",
          mb: 3,
          px: { xs: 1, sm: 2 },
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: "#1976D2",
            fontWeight: 700,
            fontSize: "1.15rem",
            mb: 2,
          }}
        >
          Solicitudes pendientes
        </Typography>
        {loadingPendientes ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress sx={{ color: "#1976D2" }} />
          </Box>
        ) : pendientes.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              textAlign: "center",
              color: "#757575",
              border: "1px solid rgba(0, 0, 0, 0.06)",
              borderRadius: "8px",
              boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.06)",
            }}
          >
            No tienes solicitudes pendientes por aprobar.
          </Paper>
        ) : (
          <>
            <Grid container spacing={2}>
              {pendientes.map((r) => (
                <Grid item xs={12} sm={6} md={4} key={r.id_solicitud}>
                  <SolicitudPendienteCard r={r} />
                </Grid>
              ))}
            </Grid>
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => router.push("/dashboard/solicitudes")}
                sx={{ textTransform: "none", borderRadius: "8px" }}
              >
                Ver todas las solicitudes
              </Button>
            </Box>
          </>
        )}
      </Box>
    </HexagonMenu>
  );
}

export default Dashboard;
