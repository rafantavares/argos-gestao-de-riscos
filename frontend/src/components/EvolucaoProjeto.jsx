import { useEffect, useState } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { riscos as servicoRiscos } from "../services/api";
import { FAIXAS_EXPOSICAO } from "../constants";
import { usePreferencias } from "../contexts/PreferenciasContext";

// Evolução da exposição dos riscos ativos semana a semana (últimas 12), com a
// soma de cada faixa empilhada: a altura total é a exposição do projeto.
export default function EvolucaoProjeto({ idProjeto }) {
  const [pontos, setPontos] = useState(null);
  const { corReal, reduzirAnimacoes } = usePreferencias();

  useEffect(() => {
    servicoRiscos
      .evolucaoAgregada(idProjeto || undefined, 12)
      // Começa na primeira semana que já tinha algum risco (sem trecho vazio).
      .then((lista) => {
        const inicio = lista.findIndex((p) => p.quantidade > 0);
        setPontos(inicio > 0 ? lista.slice(inicio) : lista);
      })
      .catch(() => setPontos([]));
  }, [idProjeto]);

  const rotulos = (pontos ?? []).map((p) => new Date(p.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }));
  const primeiro = pontos?.find((p) => p.quantidade > 0);
  const ultimo = pontos?.[pontos.length - 1];
  const variacao = primeiro && ultimo && primeiro.total ? Math.round(((ultimo.total - primeiro.total) / primeiro.total) * 100) : null;

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, flexWrap: "wrap" }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Evolução da exposição
        </Typography>
        {variacao != null && (
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
            {variacao > 0 ? "▲" : variacao < 0 ? "▼" : "■"} {Math.abs(variacao)}% no período
          </Typography>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary">
        Exposição total dos riscos ativos ao fim de cada semana, somada por faixa (cadastros, reavaliações e encerramentos)
      </Typography>
      {!pontos ? (
        <Box sx={{ height: 240 }} />
      ) : pontos.every((p) => p.quantidade === 0) ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          Ainda não há histórico suficiente.
        </Typography>
      ) : (
        <LineChart
          skipAnimation={reduzirAnimacoes}
          height={250}
          margin={{ left: 50, right: 20, top: 40, bottom: 30 }}
          xAxis={[{ data: rotulos, scaleType: "point" }]}
          // Faixa mais grave na base do empilhamento, para ficar fácil de comparar.
          series={[...FAIXAS_EXPOSICAO].reverse().map((faixa) => ({
            id: faixa.label,
            label: faixa.label,
            data: pontos.map((p) => p.por_faixa[faixa.label] ?? 0),
            color: corReal(faixa.cor),
            area: true,
            stack: "total",
            showMark: false,
          }))}
          grid={{ horizontal: true }}
          tooltip={{ trigger: "axis" }}
          axisHighlight={{ x: "line" }}
          slotProps={{ legend: { direction: "row", position: { vertical: "top", horizontal: "right" }, itemMarkWidth: 10, itemMarkHeight: 10, labelStyle: { fontSize: "0.75rem", fill: "var(--argos-texto2)" } } }}
          sx={{
            "& .MuiAreaElement-root": { fillOpacity: 0.9 },
            // Linha na cor do cartão: separa as faixas com um vão de 2px.
            "& .MuiLineElement-root": { stroke: "var(--argos-cartao)", strokeWidth: 2 },
            "& .MuiChartsGrid-line": { stroke: "var(--argos-borda-suave)" },
            "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": { stroke: "var(--argos-borda)" },
            "& .MuiChartsAxis-tickLabel": { fill: "var(--argos-texto2)" },
          }}
        />
      )}
    </Paper>
  );
}
