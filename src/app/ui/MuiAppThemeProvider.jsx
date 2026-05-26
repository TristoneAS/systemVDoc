"use client";

import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976D2",
      dark: "#1565C0",
      light: "#42A5F5",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#7B1FA2",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#F57C00",
      contrastText: "#ffffff",
    },
    success: {
      main: "#4CAF50",
      contrastText: "#ffffff",
    },
    background: {
      default: "#F8F9FA",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#212121",
      secondary: "#757575",
    },
    divider: "rgba(0, 0, 0, 0.08)",
    error: { main: "#d32f2f" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily:
      'var(--font-roboto, "Roboto", "Helvetica", "Arial", sans-serif)',
    h4: { fontWeight: 700, color: "#1976D2" },
    h5: { fontWeight: 700, color: "#1976D2" },
    h6: { fontWeight: 700, color: "#1976D2" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#F8F9FA",
          color: "#212121",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "primary" },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          backgroundColor: "#1976D2",
          color: "#ffffff",
          boxShadow: "0 2px 6px rgba(25, 118, 210, 0.35)",
          "&:hover": {
            backgroundColor: "#1565C0",
            color: "#ffffff",
            boxShadow: "0 4px 10px rgba(25, 118, 210, 0.4)",
          },
        },
        outlinedPrimary: {
          borderColor: "rgba(25, 118, 210, 0.45)",
          color: "#1976D2",
          "&:hover": {
            borderColor: "#1976D2",
            backgroundColor: "rgba(25, 118, 210, 0.06)",
            color: "#1976D2",
          },
        },
      },
    },
  },
});

export default function MuiAppThemeProvider({ children }) {
  return (
    <AppRouterCacheProvider options={{ key: "mui", prepend: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
