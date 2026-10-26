import { Box, LinearProgress, Typography } from "@mui/material";
import { corConfianca, rotuloConfianca } from "../constants";

// Barra de confiança da recomendação (probabilidade da classe prevista):
// verde >= 80%, amarelo 60-79%, vermelho < 60%.
export default function BarraConfianca({ confianca, compacta = false }) {
  const cor = corConfianca(confianca);
  const percentual = confianca == null ? 0 : Math.round(confianca * 100);

  return (
    <Box sx={{ width: "100%" }}>
      {!compacta && (
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Confiança da recomendação
          </Typography>
          <Typography variant="body2" fontWeight={700} sx={{ color: cor }}>
            {confianca == null ? "—" : `${percentual}% · ${rotuloConfianca(confianca)}`}
          </Typography>
        </Box>
      )}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LinearProgress
          variant="determinate"
          value={percentual}
          sx={{
            flexGrow: 1,
            height: compacta ? 6 : 10,
            borderRadius: 999,
            backgroundColor: "var(--argos-borda)",
            "& .MuiLinearProgress-bar": { backgroundColor: cor, borderRadius: 999 },
          }}
        />
        {compacta && (
          <Typography variant="caption" fontWeight={700} sx={{ color: cor, minWidth: 36, textAlign: "right" }}>
            {confianca == null ? "—" : `${percentual}%`}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
