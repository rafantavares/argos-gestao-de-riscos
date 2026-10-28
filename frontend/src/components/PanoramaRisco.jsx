import { Box, Grid, Paper, Typography } from "@mui/material";
import { Gauge, gaugeClasses } from "@mui/x-charts/Gauge";
import { AREAS_AFETADAS, exposicaoResidual, faixaExposicao, reducaoPercentual } from "../constants";
import { IconeArea, Marcador } from "./Badges";

// Panorama do risco do projeto: o "termômetro" (exposição média dos riscos
// ativos) e onde a exposição se concentra, por área afetada.
export default function PanoramaRisco({ riscos }) {
  const media = riscos.length ? riscos.reduce((soma, r) => soma + r.exposicao, 0) / riscos.length : 0;
  const faixaMedia = faixaExposicao(Math.max(1, Math.round(media)));
  const graves = riscos.filter((r) => r.exposicao >= 16).length;
  const total = riscos.reduce((s, r) => s + r.exposicao, 0);
  const totalResidual = riscos.reduce((s, r) => s + exposicaoResidual(r), 0);
  const comResidual = riscos.filter((r) => r.exposicao_residual != null).length;
  const reducao = reducaoPercentual(total, totalResidual);

  const porArea = AREAS_AFETADAS.map((area) => {
    const lista = riscos.filter((r) => r.area_afetada === area.value);
    const maior = lista.reduce((m, r) => Math.max(m, r.exposicao), 0);
    return { ...area, quantidade: lista.length, total: lista.reduce((s, r) => s + r.exposicao, 0), maior };
  })
    .filter((a) => a.quantidade > 0)
    .sort((a, b) => b.total - a.total);
  const maiorTotal = Math.max(...porArea.map((a) => a.total), 1);

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Termômetro de risco
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Exposição média dos riscos ativos (escala 1–25)
          </Typography>
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 170 }}>
            <Gauge
              value={Math.round(media * 10) / 10}
              valueMin={0}
              valueMax={25}
              startAngle={-110}
              endAngle={110}
              innerRadius="72%"
              outerRadius="100%"
              height={170}
              text={({ value }) => (riscos.length ? value.toLocaleString("pt-BR") : "—")}
              sx={{
                [`& .${gaugeClasses.valueText}`]: { fontSize: "2.125rem", fontWeight: 700, fontFamily: '"Space Grotesk", sans-serif' },
                [`& .${gaugeClasses.valueText} text`]: { fill: "var(--argos-texto)" },
                [`& .${gaugeClasses.valueArc}`]: { fill: faixaMedia.cor },
                [`& .${gaugeClasses.referenceArc}`]: { fill: "var(--argos-trilha)" },
              }}
            />
          </Box>
          <Typography variant="body2" align="center" component="div" sx={{ fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75 }}>
            {riscos.length ? (
              <>
                <Marcador cor={faixaMedia.cor} /> Nível {faixaMedia.label}
              </>
            ) : (
              "Sem riscos ativos"
            )}
          </Typography>
          <Typography variant="caption" align="center" color="text.secondary">
            {riscos.length} riscos ativos · {graves} graves ou muito graves
          </Typography>
          {comResidual > 0 && (
            <Typography variant="caption" align="center" sx={{ mt: 0.5, color: "text.secondary", fontWeight: 500 }}>
              Com as mitigações: −{reducao}% de exposição esperada ({comResidual} riscos com residual)
            </Typography>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2, height: "100%" }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Exposição por área afetada
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            Soma da exposição dos riscos ativos de cada área; à direita, o risco mais grave dela
          </Typography>
          {porArea.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhum risco ativo.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.1 }}>
              {porArea.map((area) => {
                const pior = faixaExposicao(area.maior);
                return (
                  <Box key={area.value} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <IconeArea area={area.value} sx={{ fontSize: "1.125rem", color: "text.secondary" }} />
                    <Typography variant="body2" sx={{ width: { xs: 110, sm: 170 }, flexShrink: 0 }} noWrap>
                      {area.label}
                    </Typography>
                    <Box sx={{ flex: 1, minWidth: 40, height: 10, borderRadius: 5, bgcolor: "var(--argos-trilha)", overflow: "hidden" }}>
                      <Box sx={{ width: `${(area.total / maiorTotal) * 100}%`, height: "100%", bgcolor: "color-mix(in srgb, var(--argos-texto2) 60%, transparent)", borderRadius: 5 }} />
                    </Box>
                    <Typography variant="body2" fontWeight={700} sx={{ width: 34, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {area.total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ width: 64, display: { xs: "none", sm: "block" } }}>
                      {area.quantidade} {area.quantidade === 1 ? "risco" : "riscos"}
                    </Typography>
                    <Box sx={{ width: 104, display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
                      <Marcador cor={pior.cor} />
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {pior.label}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}
