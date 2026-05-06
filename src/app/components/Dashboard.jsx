"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Email } from "@mui/icons-material";
import HexagonMenu from "./HexagonMenu";

function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = () => {
    if (sending) return;
    setOpen(false);
    setFeedback(null);
  };

  const handleSend = async () => {
    setFeedback(null);
    setSending(true);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({
          severity: "error",
          text: data.error || "No se pudo enviar el correo",
        });
        return;
      }
      setFeedback({
        severity: "success",
        text: data.message || "Correo enviado correctamente",
      });
      setTo("");
      setSubject("");
      setText("");
      setTimeout(() => {
        setOpen(false);
        setFeedback(null);
      }, 1500);
    } catch {
      setFeedback({
        severity: "error",
        text: "Error de conexión con el servidor",
      });
    } finally {
      setSending(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <HexagonMenu selectedItemId="inicio">
      <Paper
        elevation={6}
        sx={{
          p: 4,
          maxWidth: 720,
          mx: "auto",
          backgroundColor: "#ffffff",
          border: "1px solid rgba(65, 105, 225, 0.16)",
          borderRadius: 2,
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
          System V-Docs
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "rgba(30, 58, 138, 0.75)", textAlign: "center", mb: 4 }}
        >
          Panel principal. Use el menú lateral para navegar o envíe un correo
          desde aquí.
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Email />}
            onClick={() => {
              setFeedback(null);
              setOpen(true);
            }}
            sx={{
              px: 4,
              py: 1.5,
              fontWeight: 600,
              color: "#1e3a8a",
              backgroundColor: "#e0e7ff",
              border: "1px solid #4169E1",
              "&:hover": { backgroundColor: "#c7d2fe", color: "#1e3a8a" },
            }}
          >
            Enviar correo
          </Button>
        </Box>
      </Paper>

      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            backgroundColor: "#ffffff",
            border: "1px solid rgba(65, 105, 225, 0.2)",
          },
        }}
      >
        <DialogTitle sx={{ color: "#1e3a8a", fontWeight: 700 }}>
          Enviar correo
        </DialogTitle>
        <DialogContent>
          {feedback && (
            <Alert severity={feedback.severity} sx={{ mb: 2 }}>
              {feedback.text}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Para"
            type="email"
            fullWidth
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="correo@ejemplo.com"
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": { color: "#1e3a8a" },
              "& .MuiInputLabel-root": { color: "rgba(30, 58, 138, 0.75)" },
            }}
          />
          <TextField
            margin="dense"
            label="Asunto"
            fullWidth
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": { color: "#1e3a8a" },
              "& .MuiInputLabel-root": { color: "rgba(30, 58, 138, 0.75)" },
            }}
          />
          <TextField
            margin="dense"
            label="Mensaje"
            fullWidth
            multiline
            minRows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escriba el cuerpo del correo…"
            sx={{
              "& .MuiOutlinedInput-root": { color: "#1e3a8a" },
              "& .MuiInputLabel-root": { color: "rgba(30, 58, 138, 0.75)" },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={sending} sx={{ color: "rgba(30, 58, 138, 0.75)" }}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            variant="contained"
            disabled={sending || !to.trim() || !subject.trim()}
            startIcon={sending ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {sending ? "Enviando…" : "Enviar"}
          </Button>
        </DialogActions>
      </Dialog>
    </HexagonMenu>
  );
}

export default Dashboard;
