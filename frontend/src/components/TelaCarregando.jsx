import { useEffect, useState } from "react";
import { Box, LinearProgress, Typography } from "@mui/material";

// Tela de espera enquanto o app confere o login ou baixa uma página. Se passar
// de alguns segundos, explica que a API (Render gratuito) está acordando.
export default function TelaCarregando({ mensagem = "Carregando o Argos…" }) {
  const [demorando, setDemorando] = useState(false);

  useEffect(() => {
    const espera = setTimeout(() => setDemorando(true), 4000);
    return () => clearTimeout(espera);
  }, []);

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{ minHeight: "100vh", display: "grid", placeItems: "center", px: 2 }}
    >
      <Box sx={{ width: 260, textAlign: "center" }}>
        <Box component="img" src="/favicon.svg" alt="" width={56} height={56} sx={{ mb: 2 }} />
        <Typography sx={{ mb: 2, color: "text.secondary" }}>{mensagem}</Typography>
        <LinearProgress />
        {demorando && (
          <Typography variant="caption" component="p" sx={{ mt: 2, color: "text.secondary" }}>
            O servidor estava em repouso e está sendo iniciado. Na primeira visita do dia isso pode
            levar até 1 minuto.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
