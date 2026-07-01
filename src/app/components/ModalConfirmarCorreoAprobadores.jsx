"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  Box,
  Divider,
  CircularProgress,
} from "@mui/material";
import { Email, WarningAmber } from "@mui/icons-material";
import LoadingModal from "./LoadingModal";

function ListaAprobadoresCorreo({ titulo, subtitulo, items, chipLabel, chipColor }) {
  if (!items?.length) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="subtitle2"
        sx={{ color: "#1976D2", fontWeight: 600, mb: 0.5 }}
      >
        {titulo}
      </Typography>
      {subtitulo && (
        <Typography variant="caption" sx={{ color: "#757575", display: "block", mb: 1 }}>
          {subtitulo}
        </Typography>
      )}
      <List dense disablePadding>
        {items.map((a, idx) => (
          <ListItem
            key={`${a.emp_id}-${a.tipo_aprobador}-${idx}`}
            sx={{
              py: 0.75,
              px: 1,
              mb: 0.5,
              borderRadius: 1,
              bgcolor: "rgba(25, 118, 210, 0.06)",
              border: "1px solid rgba(25, 118, 210, 0.12)",
            }}
          >
            <ListItemText
              primary={
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="body2" sx={{ color: "#212121", fontWeight: 500 }}>
                    {a.emp_nombre || a.emp_id}
                  </Typography>
                  <Chip
                    size="small"
                    label={a.rol}
                    sx={{
                      height: 22,
                      fontSize: "0.7rem",
                      bgcolor: "rgba(25, 118, 210, 0.12)",
                      color: "#1976D2",
                    }}
                  />
                  {chipLabel && (
                    <Chip
                      size="small"
                      label={chipLabel}
                      sx={{
                        height: 22,
                        fontSize: "0.68rem",
                        bgcolor: chipColor.bg,
                        color: chipColor.color,
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>
              }
              secondary={
                <Typography variant="caption" sx={{ color: "#757575" }}>
                  {a.emp_id}
                  {a.emp_correo ? ` · ${a.emp_correo}` : " · Sin correo registrado"}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

/**
 * Modal de advertencia antes de enviar solicitud: muestra a quién se notificará por correo.
 */
export default function ModalConfirmarCorreoAprobadores({
  open,
  onClose,
  onConfirm,
  previewParams,
  confirming = false,
  confirmingMessage = "Enviando solicitud…",
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!open || !previewParams) {
      setPreview(null);
      setError("");
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const qs = new URLSearchParams();
        qs.set("emp_id_solicitante", previewParams.emp_id_solicitante);
        if (previewParams.id_area != null && String(previewParams.id_area) !== "") {
          qs.set("id_area", String(previewParams.id_area));
        }
        if (
          previewParams.id_documento != null &&
          String(previewParams.id_documento) !== ""
        ) {
          qs.set("id_documento", String(previewParams.id_documento));
        }
        const res = await fetch(`/api/solicitudes/aprobadores-preview?${qs}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "No se pudo cargar el listado de aprobadores");
          setPreview(null);
          return;
        }
        setPreview(data.data);
      } catch {
        if (!cancelled) {
          setError("Error de conexión al consultar aprobadores");
          setPreview(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, previewParams]);

  return (
    <Dialog
      open={open}
      onClose={confirming ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          border: "1px solid rgba(25, 118, 210, 0.16)",
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        component="div"
        sx={{
          color: "#1976D2",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <WarningAmber sx={{ color: "#FB8500" }} />
        Confirmar envío de solicitud
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="warning" icon={<Email />} sx={{ mb: 2 }}>
          Al registrar la solicitud se enviará un correo de notificación al{" "}
          <strong>jefe directo</strong> del solicitante. Los demás aprobadores
          recibirán correo cuando el jefe directo haya aprobado.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}

        {preview && !loading && (
          <>
            <ListaAprobadoresCorreo
              titulo="Correo al crear la solicitud"
              subtitulo="Se notifica de inmediato"
              items={preview.correo_al_crear}
              chipLabel="Correo ahora"
              chipColor={{ bg: "rgba(251, 133, 0, 0.2)", color: "#E65100" }}
            />
            {preview.correo_despues_jefe?.length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <ListaAprobadoresCorreo
                  titulo="Correo en segunda fase"
                  subtitulo="Tras la aprobación del jefe directo"
                  items={preview.correo_despues_jefe}
                  chipLabel="Correo después"
                  chipColor={{ bg: "rgba(25, 118, 210, 0.14)", color: "#1565C0" }}
                />
              </>
            )}
            <Typography variant="caption" sx={{ color: "#757575", mt: 1 }}>
              Orden de aprobación: primero jefe directo, luego comité y
              responsable del área.
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          disabled={confirming}
          sx={{ color: "#757575", textTransform: "none" }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={loading || Boolean(error) || confirming}
          sx={{
            bgcolor: "#E3F2FD",
            color: "#1976D2",
            border: "1px solid #1976D2",
            textTransform: "none",
            minWidth: 160,
            "&:hover": { bgcolor: "#BBDEFB" },
          }}
        >
          {confirming ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={18} sx={{ color: "#1976D2" }} />
              Enviando…
            </Box>
          ) : (
            "Enviar solicitud"
          )}
        </Button>
      </DialogActions>

      <LoadingModal
        open={loading}
        message="Consultando aprobadores…"
      />
      <LoadingModal open={confirming} message={confirmingMessage} />
    </Dialog>
  );
}
