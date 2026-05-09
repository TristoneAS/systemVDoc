"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";

/**
 * Redirige a /dashboard si el usuario no es admin (solo rutas que requieren isAdmin).
 */
function RequireAdminRoute({ children }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    const admin = localStorage.getItem("isAdmin") === "true";
    if (!admin) {
      router.replace("/dashboard");
      setAllowed(false);
      return;
    }
    setAllowed(true);
  }, [router]);

  if (allowed === false) {
    return null;
  }

  if (allowed !== true) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "40vh",
        }}
      >
        <CircularProgress sx={{ color: "#1976D2" }} />
      </Box>
    );
  }

  return children;
}

export default RequireAdminRoute;
