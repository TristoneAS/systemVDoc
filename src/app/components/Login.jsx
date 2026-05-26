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
import {
  getSessionExpiresAt,
  setSessionCookieClient,
} from "@/libs/auth_session";

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
            try {
              const expiresAt = getSessionExpiresAt();
              localStorage.setItem("sessionExpiresAt", expiresAt.toString());
              setSessionCookieClient(expiresAt);
            } catch (err) {
              console.error("No se pudo crear la cookie de sesión:", err);
            }
            setTimeout(() => {
              const params = new URLSearchParams(window.location.search);
              const redirect = params.get("redirect");
              const dest =
                redirect &&
                redirect.startsWith("/dashboard") &&
                !redirect.startsWith("//")
                  ? redirect
                  : "/dashboard";
              router.push(dest);
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
          "radial-gradient(circle at top left, #ffffff 0%, #F8F9FA 40%, #E3F2FD 70%, #ffffff 100%)",
        p: 2,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "rgba(25, 118, 210, 0.08)",
          top: "-200px",
          left: "-200px",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "rgba(245, 124, 0, 0.06)",
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
              "linear-gradient(to bottom, rgba(25, 118, 210, 0.35), rgba(227, 242, 253, 0.95))",
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
            border: "1px solid rgba(25, 118, 210, 0.35)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Description sx={{ color: "#1976D2" }} />
            <Box>
              <Typography variant="caption" sx={{ color: "#1976D2" }}>
                Documento
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: "#1976D2" }}
              >
                Instructivo Calidad_v1.pdf
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: "#757575", mt: 0.5 }}>
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
            border: "1px dashed rgba(25, 118, 210, 0.38)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <History sx={{ color: "#1976D2" }} />
            <Box>
              <Typography variant="caption" sx={{ color: "#1976D2" }}>
                Revisión
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: "#1976D2" }}
              >
                Comentarios sobre versión v2
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: "#757575", mt: 0.5 }}>
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
            border: "1px solid rgba(25, 118, 210, 0.32)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircle sx={{ color: "#1976D2" }} />
            <Box>
              <Typography variant="caption" sx={{ color: "#616161" }}>
                Versión aprobada
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: "#1976D2" }}
              >
                Instructivo Calidad_v3.pdf
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: "#757575", mt: 0.5 }}>
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
              "linear-gradient(135deg, #ffffff 0%, #E3F2FD 48%, #E3F2FD 100%)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 18px 50px rgba(25, 118, 210, 0.18)",
            border: "1px solid rgba(25, 118, 210, 0.2)",
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
                color: "#1976D2",
                mb: 1,
                letterSpacing: 1,
              }}
            >
              System V-Docs
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "#757575", textAlign: "center" }}
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
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  "& fieldset": {
                    borderColor: "rgba(0, 0, 0, 0.12)",
                  },
                  "&:hover fieldset": { borderColor: "#1976D2" },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1976D2",
                    borderWidth: 2,
                  },
                },
                "& .MuiInputBase-input": {
                  color: "#212121",
                },
                "& .MuiInputLabel-root": {
                  color: "#757575",
                  "&.Mui-focused": { color: "#1976D2" },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: "#1976D2" }} />
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
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  "& fieldset": {
                    borderColor: "rgba(0, 0, 0, 0.12)",
                  },
                  "&:hover fieldset": { borderColor: "#1976D2" },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1976D2",
                    borderWidth: 2,
                  },
                },
                "& .MuiInputBase-input": {
                  color: "#212121",
                },
                "& .MuiInputLabel-root": {
                  color: "#757575",
                  "&.Mui-focused": { color: "#1976D2" },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: "#1976D2" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: "#1976D2" }}
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
              color="primary"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "1rem",
                textTransform: "none",
                boxShadow: "0 4px 12px rgba(25, 118, 210, 0.35)",
                "&:hover": {
                  boxShadow: "0 6px 16px rgba(25, 118, 210, 0.45)",
                },
                "&:disabled": {
                  background: "#E0E0E0",
                  color: "#757575",
                  borderColor: "transparent",
                  transform: "none",
                },
              }}
            >
              {loading ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={20} sx={{ color: "#ffffff" }} />
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
