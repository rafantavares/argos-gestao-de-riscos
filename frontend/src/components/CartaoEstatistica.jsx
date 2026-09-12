import { Box, Paper, Typography } from "@mui/material";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";

/**
 * Card de indicador com micro-tendência: variação em relação à semana anterior
 * (seta + delta) e sparkline das últimas semanas.
 *
 * `tendencia`: { atual, anterior, serie: number[] } -- opcional.
 */
export default function CartaoEstatistica({ titulo, valor, icone, tendencia, cor = "#2DD4BF", rodape }) {
  const delta = tendencia ? tendencia.atual - tendencia.anterior : null;
  const IconeTendencia = delta === null || delta === 0 ? TrendingFlatIcon : delta > 0 ? TrendingUpIcon : TrendingDownIcon;
  const corTendencia = delta === null || delta === 0 ? "#8A93A6" : delta > 0 ? "#4ADE80" : "#F87171";

  return (
    <Paper sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="body2" color="text.secondary">
          {titulo}
        </Typography>
        {icone && (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              color: cor,
              backgroundColor: `${cor}1A`,
              "& svg": { fontSize: 18 },
            }}
          >
            {icone}
          </Box>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} sx={{ lineHeight: 1.1 }}>
            {valor}
          </Typography>
          {tendencia && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, color: corTendencia }}>
              <IconeTendencia sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ color: "inherit", fontWeight: 600 }}>
                {delta > 0 ? `+${delta}` : delta}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                vs. semana anterior
              </Typography>
            </Box>
          )}
          {rodape && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
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
              colors={[cor]}
              area
              curve="natural"
              sx={{ "& .MuiAreaElement-root": { fillOpacity: 0.18 } }}
            />
          </Box>
        )}
      </Box>
    </Paper>
  );
}
