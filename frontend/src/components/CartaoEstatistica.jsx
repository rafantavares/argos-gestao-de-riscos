import { Box, Paper, Typography } from "@mui/material";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";
import { usePreferencias } from "../contexts/PreferenciasContext";

/**
 * Card de indicador com micro-tendência: variação em relação à semana anterior
 * (seta + delta) e sparkline das últimas semanas.
 *
 * `tendencia`: { atual, anterior, serie: number[] } -- opcional.
 */
export default function CartaoEstatistica({ titulo, valor, icone, tendencia, cor = "var(--argos-texto2)", destaque = false, rodape }) {
  const { corReal } = usePreferencias();
  const delta = tendencia ? tendencia.atual - tendencia.anterior : null;
  const IconeTendencia = delta === null || delta === 0 ? TrendingFlatIcon : delta > 0 ? TrendingUpIcon : TrendingDownIcon;

  // Indicador neutro por padrão; com `destaque`, a borda e o rodapé ganham a cor
  // (ex.: decisões pendentes em violeta, a cor da IA).
  return (
    <Paper
      sx={{
        p: 2.25,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        borderColor: destaque ? `color-mix(in srgb, ${cor} 40%, transparent)` : undefined,
        transition: "border-color 150ms ease",
        "&:hover": { borderColor: destaque ? cor : "var(--argos-borda-forte)" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: cor, "& svg": { fontSize: 18 } }}>
        {icone}
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: 13 }}>
          {titulo}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 1 }}>
        <Box>
          <Typography
            variant="h4"
            fontWeight={600}
            sx={{ lineHeight: 1.05, fontSize: { xs: 28, md: 32 }, fontVariantNumeric: "tabular-nums" }}
          >
            {valor}
          </Typography>
          {tendencia && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.75, color: "text.secondary" }}>
              <IconeTendencia sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ color: "text.primary", fontWeight: 600 }}>
                {delta > 0 ? `+${delta}` : delta}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                vs. semana anterior
              </Typography>
            </Box>
          )}
          {rodape && (
            <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: destaque ? cor : "text.secondary" }}>
              {rodape}
            </Typography>
          )}
        </Box>
        {tendencia?.serie?.length > 1 && (
          <Box sx={{ width: 96, height: 36 }}>
            <SparkLineChart
              data={tendencia.serie}
              height={36}
              width={96}
              colors={[corReal("var(--argos-texto2)")]}
              area
              curve="natural"
              sx={{ "& .MuiAreaElement-root": { fillOpacity: 0.14 } }}
            />
          </Box>
        )}
      </Box>
    </Paper>
  );
}
