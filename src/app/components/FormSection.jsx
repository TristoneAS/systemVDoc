"use client";

import React from "react";
import { Box, Typography } from "@mui/material";

export const textFieldSx = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "#FFFFFF",
    color: "#212121",
    "& fieldset": { borderColor: "rgba(0, 0, 0, 0.12)" },
    "&:hover fieldset": { borderColor: "#1976D2" },
    "&.Mui-focused fieldset": { borderColor: "#1976D2" },
    "& .MuiInputBase-input": { color: "#212121" },
    "& .MuiInputBase-input.Mui-disabled": {
      WebkitTextFillColor: "#616161",
      color: "#616161",
    },
  },
  "& .MuiInputLabel-root": {
    color: "#757575",
    "&.Mui-focused": { color: "#1976D2" },
  },
  "& .MuiFormHelperText-root": { color: "#757575" },
};

export const disabledFieldSx = {
  ...textFieldSx,
  "& .MuiOutlinedInput-root": {
    ...textFieldSx["& .MuiOutlinedInput-root"],
    backgroundColor: "#F5F5F5",
  },
};

export const formSectionSx = {
  p: { xs: 2, sm: 2.5 },
  mb: 3,
  borderRadius: 2,
  backgroundColor: "rgba(25, 118, 210, 0.04)",
  border: "1px solid rgba(25, 118, 210, 0.12)",
};

export const sectionTitleSx = {
  color: "#1976D2",
  fontWeight: 600,
  fontSize: "0.95rem",
  mb: 2,
};

export const stepperSx = {
  mb: 4,
  "& .MuiStepLabel-root .Mui-completed": { color: "#1976D2" },
  "& .MuiStepLabel-label.Mui-completed": { color: "#757575" },
  "& .MuiStepLabel-root .Mui-active": { color: "#1976D2" },
  "& .MuiStepLabel-label.Mui-active": { color: "#1976D2" },
  "& .MuiStepIcon-root": {
    color: "rgba(255,255,255,0.5)",
    "&.Mui-active, &.Mui-completed": { color: "#1976D2" },
  },
};

export default function FormSection({ title, subtitle, children }) {
  return (
    <Box sx={formSectionSx}>
      <Typography sx={sectionTitleSx}>{title}</Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: "#757575", mb: 2, mt: -0.5 }}>
          {subtitle}
        </Typography>
      )}
      {children}
    </Box>
  );
}
