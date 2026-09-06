import { useEffect, useState } from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import {
  auth,
  projetos as servicoProjetos,
  recomendacoes as servicoRecomendacoes,
  riscos as servicoRiscos,
} from "../../services/api";
import { CORES_SEVERIDADE, nivelSeveridade } from "../../constants";

const NOMES_ALGORITMOS = {
  knn: "KNN",
  arvore_decisao: "Árvore de Decisão",
  random_forest: "Random Forest",
};
const CORES_ALGORITMOS = {
  knn: "#2DD4BF",
  arvore_decisao: "#60A5FA",
  random_forest: "#A78BFA",
};

export default function Dashboard() {
  const [projetos, setProjetos] = useState([]);
  const [gerentes, setGerentes] = useState([]);
  const [riscos, setRiscos] = useState([]);
  const [recomendacoes, setRecomendacoes] = useState([]);
  const [historicoMetricas, setHistoricoMetricas] = useState([]);

  useEffect(() => {
    servicoProjetos.listar().then(setProjetos);
    auth.listarGerentes().then(setGerentes);
    servicoRiscos.listarTodosAdmin().then(setRiscos);
    servicoRecomendacoes.listarTodasAdmin().then(setRecomendacoes);
    servicoRecomendacoes.metricasHistorico().then(setHistoricoMetricas);
  }, []);

  const contagemPorSeveridade = { baixo: 0, medio: 0, alto: 0 };
  riscos.forEach((r) => {
    contagemPorSeveridade[nivelSeveridade(r.probabilidade, r.impacto)] += 1;
  });

  const respondidas = recomendacoes.filter((r) => r.aceita !== null);
  const taxaAceitacao =
    respondidas.length === 0
      ? null
      : Math.round((respondidas.filter((r) => r.aceita).length / respondidas.length) * 100);

  const carimbosTempo = [...new Set(historicoMetricas.map((m) => m.criado_em))].sort();
  const algoritmos = ["knn", "arvore_decisao", "random_forest"];
  const seriesAcuracia = algoritmos.map((algoritmo) => ({
    label: NOMES_ALGORITMOS[algoritmo],
    color: CORES_ALGORITMOS[algoritmo],
    data: carimbosTempo.map((carimbo) => {
      const ponto = historicoMetricas.find(
        (m) => m.criado_em === carimbo && m.algoritmo === algoritmo
      );
      return ponto ? Math.round(ponto.acuracia * 1000) / 10 : null;
    }),
  }));

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica titulo="Projetos" valor={projetos.length} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica titulo="Gerentes" valor={gerentes.length} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Riscos por severidade
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {["baixo", "medio", "alto"].map((nivel) => (
                <Box
                  key={nivel}
                  sx={{
                    px: 1.2,
                    py: 0.4,
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#0B0E14",
                    bgcolor: CORES_SEVERIDADE[nivel],
                  }}
                >
                  {contagemPorSeveridade[nivel]}
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica
            titulo="Taxa de aceitação de recomendações"
            valor={taxaAceitacao === null ? "—" : `${taxaAceitacao}%`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Evolução da acurácia do modelo
          </Typography>
          <Paper sx={{ p: 2 }}>
            {carimbosTempo.length === 0 ? (
              <Typography color="text.secondary">
                Nenhum retreino registrado ainda — aceite uma recomendação para gerar o
                primeiro ponto.
              </Typography>
            ) : (
              <LineChart
                height={260}
                xAxis={[
                  {
                    data: carimbosTempo.map((c) => new Date(c).toLocaleDateString("pt-BR")),
                    scaleType: "point",
                  },
                ]}
                series={seriesAcuracia}
                yAxis={[{ min: 0, max: 100, label: "Acurácia (%)" }]}
              />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Projetos recentes
          </Typography>
          <Paper sx={{ p: 2 }}>
            {projetos.length === 0 ? (
              <Typography color="text.secondary">Nenhum projeto cadastrado ainda.</Typography>
            ) : (
              projetos
                .slice(0, 5)
                .map((projeto) => (
                  <Typography key={projeto.id} sx={{ py: 0.5 }}>
                    {projeto.nome}
                  </Typography>
                ))
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function CartaoEstatistica({ titulo, valor }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {titulo}
      </Typography>
      <Typography variant="h4" fontWeight={600}>
        {valor}
      </Typography>
    </Paper>
  );
}
