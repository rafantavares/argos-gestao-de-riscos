import { Box, LinearProgress, Typography } from "@mui/material";
import { rotuloConfianca } from "../constants";

// Barra de confiança da recomendação (probabilidade da classe prevista). Em
// violeta, a cor da IA: verde/amarelo/vermelho aqui se confundiria com a escala
// de gravidade. O nível (alta, média, baixa) vem escrito ao lado.
export default function BarraConfianca({ confianca, compacta = false }) {
  const cor = "var(--argos-ia)";
  const percentual = confianca == null ? 0 : Math.round(confianca * 100);

  return (
    <Box sx={{ width: "100%" }}>
      {!compacta && (
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Confiança da recomendação
          </Typography>
          <Typography variant="body2" fontWeight={600}>
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
            backgroundColor: "var(--argos-trilha)",
            "& .MuiLinearProgress-bar": { backgroundColor: cor, borderRadius: 999 },
          }}
        />
        {compacta && (
          <Typography variant="caption" fontWeight={600} sx={{ minWidth: 36, textAlign: "right" }}>
            {confianca == null ? "—" : `${percentual}%`}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
