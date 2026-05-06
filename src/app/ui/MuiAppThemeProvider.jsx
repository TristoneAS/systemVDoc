"use client";

import * as React from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#4169E1",
      contrastText: "#ffffff",
    },
    secondary: { main: "#2f4eb8" },
    background: {
      default: "#ffffff",
      paper: "#f8fafc",
    },
    text: {
      primary: "#1e3a8a",
      secondary: "#64748b",
    },
    divider: "rgba(65, 105, 225, 0.2)",
    error: { main: "#b91c1c" },
    success: { main: "#2f4eb8" },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#ffffff",
          color: "#1e3a8a",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          backgroundColor: "#e0e7ff",
          color: "#1e3a8a",
          border: "1px solid #4169E1",
          "&:hover": { backgroundColor: "#c7d2fe", color: "#1e3a8a" },
        },
        outlinedPrimary: {
          borderColor: "rgba(65, 105, 225, 0.45)",
          color: "#1e3a8a",
          "&:hover": {
            borderColor: "#4169E1",
            backgroundColor: "rgba(65, 105, 225, 0.08)",
            color: "#1e3a8a",
          },
        },
      },
    },
  },
});

export default function MuiAppThemeProvider({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
