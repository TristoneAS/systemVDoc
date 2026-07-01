"use client";

import React from "react";
import { Box, TextField, FormControlLabel, Checkbox } from "@mui/material";
import {
  RETENCION_AL_MAS_ACTUAL_VALOR,
  RETENCION_AL_MAS_ACTUAL_LABEL,
  isRetencionAlMasActual,
  fechaRetencionParaInput,
} from "@/libs/tiempo_retencion";

export default function CampoFechaRetencion({
  value,
  onChange,
  textFieldSx = {},
  helperText,
  ...textFieldProps
}) {
  const alMasActual =
    value === RETENCION_AL_MAS_ACTUAL_VALOR || isRetencionAlMasActual(value);
  const fecha = alMasActual ? "" : fechaRetencionParaInput(value);

  return (
    <Box>
      {alMasActual ? (
        <TextField
          fullWidth
          label="Fecha de retención"
          value={RETENCION_AL_MAS_ACTUAL_LABEL}
          InputProps={{ readOnly: true }}
          helperText={
            helperText ??
            "Desmarque «Al más actual» para indicar una fecha concreta."
          }
          sx={textFieldSx}
          {...textFieldProps}
        />
      ) : (
        <TextField
          fullWidth
          label="Fecha de retención"
          type="date"
          value={fecha}
          InputLabelProps={{ shrink: true }}
          helperText={helperText}
          sx={textFieldSx}
          {...textFieldProps}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <FormControlLabel
        control={
          <Checkbox
            checked={alMasActual}
            onChange={(e) => {
              onChange(e.target.checked ? RETENCION_AL_MAS_ACTUAL_VALOR : "");
            }}
            size="small"
          />
        }
        label="Al más actual (no vence)"
        sx={{
          mt: 0.5,
          ml: 0,
          "& .MuiFormControlLabel-label": {
            fontSize: "0.8125rem",
            color: "#757575",
          },
        }}
      />
    </Box>
  );
}
