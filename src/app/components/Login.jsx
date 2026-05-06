"use client";

import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  Paper,
  InputAdornment,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock,
  Description,
  History,
  CheckCircle,
} from "@mui/icons-material";
import Image from "next/image";
import { useRouter } from "next/navigation";

function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState({ user: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (user.user === "" || user.password === "") {
      setSnackbarMessage("Favor de llenar todos los campos");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_AUTH_SERVER_URL}/SYSTEMVDOCS/AUTHENTICATE`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: user.user.trim(),
            password: user.password,
          }),
        },
      );

      const data = await response.json();

      if (response.ok && data.authorization !== "Unauthorized") {
        // Consultar datos del empleado antes de redirigir
        try {
          const empleadoResponse = await fetch(
            `/api/empleados/by-alias/${user.user.trim()}`,
          );
          const empleadoData = await empleadoResponse.json();

          if (empleadoResponse.ok && empleadoData.success) {
            // Guardar información del empleado en localStorage
            localStorage.setItem("infoUser", JSON.stringify(empleadoData.data));
            console.log(
              "Información del empleado guardada:",
              empleadoData.data,
            );

            // Si se encontró el empleado, continuar con el login
            setSnackbarMessage("Iniciando sesión en el gestor de documentos");
            setSnackbarSeverity("success");
            setOpenSnackbar(true);
            localStorage.setItem("user", JSON.stringify(data));
            localStorage.setItem("isAuthenticated", "true");
            const adminFlag =
              data.isAdmin === true ||
              data.isAdmin === "true" ||
              data.isAdmin === 1;
            localStorage.setItem("isAdmin", adminFlag ? "true" : "false");
            localStorage.setItem("usuario", user.user.trim());
            // Crear cookie de sesión válida por 5 minutos y guardar el timestamp de expiración
            try {
              const expiresAt = Date.now() + 5 * 60 * 1000;
              localStorage.setItem("sessionExpiresAt", expiresAt.toString());
              const expires = new Date(expiresAt).toUTCString();
              document.cookie = `pdc_session=authenticated; expires=${expires}; path=/; SameSite=Lax`;
            } catch (err) {
              console.error("No se pudo crear la cookie de sesión:", err);
            }
            setTimeout(() => {
              router.push("/dashboard");
            }, 500);
          } else {
            // Si no se encontró el empleado, bloquear el login
            setSnackbarMessage("El alias del empleado no está registrado");
            setLoading(false);
            setSnackbarSeverity("error");
            setOpenSnackbar(true);
          }
        } catch (error) {
          // Si hay error al consultar, bloquear el login
          console.error("Error al obtener información del empleado:", error);
          setSnackbarMessage("El alias del empleado no está registrado");
          setLoading(false);
          setSnackbarSeverity("error");
          setOpenSnackbar(true);
        }
      } else {
        setSnackbarMessage(
          "Error en autenticación: " +
            (data.message || "Credenciales inválidas"),
        );
        setLoading(false);
        setSnackbarSeverity("error");
        setOpenSnackbar(true);
      }
    } catch (error) {
      setSnackbarMessage(
        "Error al conectar con el servidor, contacte a soporte",
      );
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top left, #ffffff 0%, #f4f6ff 38%, #e8ecff 72%, #ffffff 100%)",
        p: 2,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "rgba(186, 230, 253, 0.85)",
          top: "-200px",
          left: "-200px",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "rgba(224, 242, 254, 0.65)",
          bottom: "-150px",
          right: "-150px",
        },
      }}
    >
      {/* Fondo ilustrativo de flujo de versiones de documentos */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
          opacity: 0.6,
        }}
      >
        {/* Línea de tiempo vertical */}
        <Box
          sx={{
            position: "absolute",
            left: { xs: "10%", md: "15%" },
            top: "10%",
            bottom: "10%",
            width: "2px",
            background:
              "linear-gradient(to bottom, rgba(65,105,225,0.45), rgba(232,236,255,0.95))",
          }}
        />

        {/* Tarjeta versión inicial */}
        <Paper
          elevation={6}
          sx={{
            position: "absolute",
            left: { xs: "6%", md: "10%" },
            top: "12%",
            px: 2,
            py: 1.5,
            borderRadius: 2,
            minWidth: 180,
            backgroundColor: "#ffffff",
            border: "1px solid rgba(65, 105, 225, 0.35)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Description sx={{ color: "#1e3a8a" }} />
            <Box>
              <Typography variant="caption" sx={{ color: "#1e3a8a" }}>
                Documento
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: "#1e3a8a" }}
              >
                Instructivo Calidad_v1.pdf
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: "#475569", mt: 0.5 }}>
            Creado · 09:12
          </Typography>
        </Paper>

        {/* Tarjeta revisión */}
        <Paper
          elevation={6}
          sx={{
            position: "absolute",
            left: { xs: "14%", md: "20%" },
            top: "40%",
            px: 2,
            py: 1.5,
            borderRadius: 2,
            minWidth: 190,
            backgroundColor: "#ffffff",
            border: "1px dashed rgba(65, 105, 225, 0.38)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <History sx={{ color: "#1e3a8a" }} />
            <Box>
              <Typography variant="caption" sx={{ color: "#1e3a8a" }}>
                Revisión
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: "#1e3a8a" }}
              >
                Comentarios sobre versión v2
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: "#475569", mt: 0.5 }}>
            En revisión · 10:03
          </Typography>
        </Paper>

        {/* Tarjeta versión aprobada */}
        <Paper
          elevation={6}
          sx={{
            position: "absolute",
            left: { xs: "6%", md: "12%" },
            bottom: "14%",
            px: 2,
            py: 1.5,
            borderRadius: 2,
            minWidth: 200,
            backgroundColor: "#ffffff",
            border: "1px solid rgba(65, 105, 225, 0.32)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircle sx={{ color: "#1e3a8a" }} />
            <Box>
              <Typography variant="caption" sx={{ color: "#334155" }}>
                Versión aprobada
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: "#1e3a8a" }}
              >
                Instructivo Calidad_v3.pdf
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: "#475569", mt: 0.5 }}>
            Publicada · 11:27
          </Typography>
        </Paper>
      </Box>

      <Container maxWidth="sm">
        <Paper
          elevation={14}
          sx={{
            p: 4,
            borderRadius: 4,
            background:
              "linear-gradient(135deg, #ffffff 0%, #e8ecff 48%, #f4f6ff 100%)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 18px 50px rgba(65, 105, 225, 0.18)",
            border: "1px solid rgba(65, 105, 225, 0.2)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 4,
            }}
          >
            <Image
              src="/tristone_logo_head.png"
              alt="Tristone Logo"
              width={180}
              height={70}
              style={{ objectFit: "contain", maxWidth: "100%" }}
            />
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: "#1e3a8a",
                mb: 1,
                letterSpacing: 1,
              }}
            >
              System V-Docs
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "rgba(30, 58, 138, 0.75)", textAlign: "center" }}
            >
              Inicia sesión con tus credenciales de Tristone
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Usuario"
              name="user"
              value={user.user}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              required
              disabled={loading}
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  backgroundColor: "#ffffff",
                  "& fieldset": {
                    borderColor: "rgba(65, 105, 225, 0.26)",
                  },
                  "&:hover fieldset": { borderColor: "#4169E1" },
                  "&.Mui-focused fieldset": {
                    borderColor: "#4169E1",
                    borderWidth: 2,
                  },
                },
                "& .MuiInputBase-input": {
                  color: "#1e3a8a",
                },
                "& .MuiInputLabel-root": {
                  color: "rgba(30, 58, 138, 0.75)",
                  "&.Mui-focused": { color: "#1e3a8a" },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: "#1e3a8a" }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Contraseña"
              name="password"
              value={user.password}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              type={showPassword ? "text" : "password"}
              required
              disabled={loading}
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  backgroundColor: "#ffffff",
                  "& fieldset": {
                    borderColor: "rgba(65, 105, 225, 0.26)",
                  },
                  "&:hover fieldset": { borderColor: "#4169E1" },
                  "&.Mui-focused fieldset": {
                    borderColor: "#4169E1",
                    borderWidth: 2,
                  },
                },
                "& .MuiInputBase-input": {
                  color: "#1e3a8a",
                },
                "& .MuiInputLabel-root": {
                  color: "rgba(30, 58, 138, 0.75)",
                  "&.Mui-focused": { color: "#1e3a8a" },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: "#1e3a8a" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: "#1e3a8a" }}
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                borderRadius: 2,
                background:
                  "linear-gradient(135deg, #f4f6ff 0%, #e8ecff 45%, #e0e7ff 100%)",
                fontWeight: 600,
                fontSize: "1rem",
                textTransform: "none",
                color: "#1e3a8a",
                border: "1px solid #4169E1",
                boxShadow: "0 6px 18px rgba(65, 105, 225, 0.15)",
                transition: "all 0.3s ease",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #e8ecff 0%, #e0e7ff 40%, #c7d2fe 100%)",
                  transform: "translateY(-2px)",
                  color: "#1e3a8a",
                },
                "&:disabled": {
                  background: "#e2e8f0",
                  color: "#64748b",
                  borderColor: "#cbd5e1",
                  transform: "none",
                },
              }}
            >
              {loading ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={20} sx={{ color: "#1e3a8a" }} />
                  Iniciando Sesión...
                </Box>
              ) : (
                "Acceder al gestor de documentos"
              )}
            </Button>
          </Box>

          <Snackbar
            open={openSnackbar}
            autoHideDuration={6000}
            onClose={() => setOpenSnackbar(false)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert
              onClose={() => setOpenSnackbar(false)}
              severity={snackbarSeverity}
              sx={{ width: "100%" }}
            >
              {snackbarMessage}
            </Alert>
          </Snackbar>
        </Paper>
      </Container>
    </Box>
  );
}

export default Login;
