"use client";

import React from "react";
import { Backdrop, Box, CircularProgress, Typography, Portal } from "@mui/material";

export default function LoadingModal({
  open,
  message = "Procesando…",
  zIndex,
}) {
  if (!open) return null;

  return (
    <Portal>
      <Backdrop
        open
        sx={{
          zIndex:
            zIndex ?? ((theme) => theme.zIndex.modal + 50),
          backgroundColor: "rgba(0, 0, 0, 0.45)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            px: 4,
            py: 3.5,
            borderRadius: 2,
            bgcolor: "#ffffff",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.18)",
            minWidth: 240,
            maxWidth: "90vw",
          }}
        >
          <CircularProgress size={48} sx={{ color: "#1976D2" }} />
          <Typography
            variant="body1"
            sx={{
              color: "#424242",
              fontWeight: 500,
              textAlign: "center",
            }}
          >
            {message}
          </Typography>
        </Box>
      </Backdrop>
    </Portal>
  );
}
