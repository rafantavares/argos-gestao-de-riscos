import { useEffect, useMemo, useState } from "react";
import { Box, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import DatasetOutlinedIcon from "@mui/icons-material/DatasetOutlined";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import UpdateIcon from "@mui/icons-material/Update";
import { ml as servicoMl, recomendacoes as servicoRecomendacoes, riscos as servicoRiscos } from "../../services/api";
import { ALGORITMOS, CORES_ALGORITMOS, NOMES_ALGORITMOS } from "../../constants";
import CartaoEstatistica from "../../components/CartaoEstatistica";
import EstadoVazio from "../../components/EstadoVazio";
import BarraConfianca from "../../components/BarraConfianca";
import { ChipAceite, Marcador } from "../../components/Badges";
import { usePreferencias } from "../../contexts/PreferenciasContext";
import { tendenciaTaxaSemanal } from "../../utils/tendencias";

const METRICAS_COMPARADAS = [
  { chave: "acuracia", rotulo: "Acurácia" },
  { chave: "precisao", rotulo: "Precisão" },
  { chave: "recall", rotulo: "Recall" },
  { chave: "f1", rotulo: "F1 (macro)" },
];

// Grade e eixos dos gráficos nas cores do tema (claro/escuro).
const ESTILO_GRAFICO = {
  "& .MuiChartsGrid-line": { stroke: "var(--argos-borda-suave)" },
  "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": { stroke: "var(--argos-borda)" },
  "& .MuiChartsAxis-tickLabel, & .MuiChartsAxis-label": { fill: "var(--argos-texto2)" },
};
const LEGENDA = { legend: { labelStyle: { fontSize: "0.75rem", fill: "var(--argos-texto2)" }, itemMarkWidth: 10, itemMarkHeight: 10 } };

// Painel do modelo de recomendação (herdado do antigo perfil admin): como os
// três algoritmos se saem, o que pesa na decisão, a evolução a cada retreino e
// as últimas recomendações dos seus riscos.
export default function ModeloIA() {
  const { corReal, reduzirAnimacoes } = usePreferencias();
  const [metricas, setMetricas] = useState(null);
  const [importancia, setImportancia] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [recomendacoes, setRecomendacoes] = useState([]);
  const [riscos, setRiscos] = useState([]);

  useEffect(() => {
    servicoMl.metricas().then(setMetricas).catch(() => setMetricas(null));
    servicoMl.importanciaFeatures().then(setImportancia).catch(() => setImportancia(null));
    servicoRecomendacoes.metricasHistorico().then(setHistorico).catch(() => setHistorico([]));
    servicoRecomendacoes.listarMinhas().then(setRecomendacoes).catch(() => setRecomendacoes([]));
    servicoRiscos.listarMeus().then(setRiscos).catch(() => setRiscos([]));
  }, []);

  const algoritmos = metricas ? ALGORITMOS.filter((a) => metricas[a]) : [];
  const emUso = algoritmos.reduce((melhor, a) => (!melhor || metricas[a].acuracia > metricas[melhor].acuracia ? a : melhor), null);
  const respondidas = recomendacoes.filter((r) => r.aceita !== null);
  const aceitas = respondidas.filter((r) => r.aceita).length;
  const taxaAceitacao = respondidas.length ? Math.round((aceitas / respondidas.length) * 100) : null;
  const tendenciaAceite = useMemo(() => tendenciaTaxaSemanal(respondidas, (r) => r.aceita === true), [respondidas]);
  const carimbos = [...new Set(historico.map((m) => m.criado_em))].sort();

  const seriesDesempenho = algoritmos.map((a) => ({
    label: NOMES_ALGORITMOS[a],
    color: corReal(CORES_ALGORITMOS[a]),
    data: METRICAS_COMPARADAS.map((m) => (metricas[a][m.chave] != null ? Math.round(metricas[a][m.chave] * 1000) / 10 : null)),
    valueFormatter: (v) => (v == null ? "—" : `${v.toLocaleString("pt-BR")}%`),
  }));
  const seriesAcuracia = ALGORITMOS.map((a) => ({
    label: NOMES_ALGORITMOS[a],
    color: corReal(CORES_ALGORITMOS[a]),
    data: carimbos.map((c) => {
      const ponto = historico.find((m) => m.criado_em === c && m.algoritmo === a);
      return ponto ? Math.round(ponto.acuracia * 1000) / 10 : null;
    }),
  }));

  const riscoPorId = useMemo(() => new Map(riscos.map((r) => [r.id, r])), [riscos]);
  const ultimas = [...recomendacoes].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)).slice(0, 8);

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        Como o modelo que recomenda os planos de contingência está se saindo. Os três algoritmos são avaliados por validação
        cruzada; o de melhor acurácia é o que recomenda. Cada plano aceito volta como exemplo de treino.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica
            titulo="Algoritmo em uso"
            valor={emUso ? NOMES_ALGORITMOS[emUso] : "—"}
            icone={<AutoAwesomeOutlinedIcon />}
            cor="var(--argos-ia)"
            rodape={emUso ? `acurácia de ${(metricas[emUso].acuracia * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "modelo ainda não treinado"}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica
            titulo="Exemplos de treino"
            valor={metricas?._dataset?.n_exemplos ?? "—"}
            icone={<DatasetOutlinedIcon />}
            rodape={emUso ? `validação cruzada em ${metricas[emUso].n_divisoes} partes` : undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica
            titulo="Retreinos registrados"
            valor={carimbos.length}
            icone={<UpdateIcon />}
            rodape="um a cada plano aceito"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica
            titulo="Sua taxa de aceitação"
            valor={taxaAceitacao === null ? "—" : `${taxaAceitacao}%`}
            icone={<ThumbUpAltOutlinedIcon />}
            tendencia={respondidas.length > 0 ? tendenciaAceite : null}
            rodape={`${respondidas.length} recomendações respondidas`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Secao
            titulo="Desempenho dos algoritmos"
            subtitulo={emUso ? `Validação cruzada estratificada · ${metricas[emUso].n_divisoes} partes` : "Validação cruzada estratificada"}
          >
            {seriesDesempenho.length === 0 ? (
              <EstadoVazio compacto titulo="Métricas indisponíveis" />
            ) : (
              <BarChart
                skipAnimation={reduzirAnimacoes}
                height={300}
                layout="horizontal"
                margin={{ left: 90 }}
                yAxis={[{ data: METRICAS_COMPARADAS.map((m) => m.rotulo), scaleType: "band" }]}
                xAxis={[{ min: 0, max: 100, valueFormatter: (v) => `${v}%` }]}
                series={seriesDesempenho}
                grid={{ vertical: true }}
                slotProps={LEGENDA}
                sx={ESTILO_GRAFICO}
              />
            )}
          </Secao>
        </Grid>
        <Grid item xs={12} md={6}>
          <Secao titulo="O que pesa na decisão" subtitulo="Random Forest · peso relativo de cada atributo do risco">
            {!importancia || importancia.features.length === 0 ? (
              <EstadoVazio compacto titulo="Modelo ainda não treinado" />
            ) : (
              <BarChart
                skipAnimation={reduzirAnimacoes}
                height={300}
                layout="horizontal"
                margin={{ left: 150 }}
                yAxis={[{ data: importancia.features.map((f) => f.rotulo), scaleType: "band" }]}
                xAxis={[{ min: 0, valueFormatter: (v) => `${v}%` }]}
                series={[
                  {
                    data: importancia.features.map((f) => Math.round(f.importancia * 1000) / 10),
                    color: corReal("var(--argos-ia)"),
                    valueFormatter: (v) => `${v.toLocaleString("pt-BR")}%`,
                  },
                ]}
                grid={{ vertical: true }}
                sx={ESTILO_GRAFICO}
              />
            )}
          </Secao>
        </Grid>
      </Grid>

      <Box sx={{ mb: 3 }}>
        <Secao titulo="Evolução da acurácia" subtitulo="Um ponto a cada retreino disparado por um plano aceito">
          {carimbos.length === 0 ? (
            <EstadoVazio
              compacto
              titulo="Nenhum retreino registrado"
              descricao="Quando você aceitar uma recomendação, o modelo é retreinado e o primeiro ponto aparece aqui."
            />
          ) : (
            <LineChart
              skipAnimation={reduzirAnimacoes}
              height={280}
              xAxis={[{ data: carimbos.map((c) => new Date(c).toLocaleDateString("pt-BR")), scaleType: "point" }]}
              yAxis={[{ min: 0, max: 100, label: "Acurácia (%)" }]}
              series={seriesAcuracia}
              grid={{ horizontal: true }}
              slotProps={LEGENDA}
              sx={ESTILO_GRAFICO}
            />
          )}
        </Secao>
      </Box>

      {algoritmos.some((a) => metricas[a].matriz_confusao) && (
        <Box sx={{ mb: 3 }}>
          <Secao
            titulo="Matriz de confusão"
            subtitulo="Previsões da validação cruzada: linhas = nível real, colunas = nível previsto. A diagonal são os acertos; erros entre Baixo e Alto são os mais graves."
          >
            <Grid container spacing={3} sx={{ px: 1, pb: 1 }}>
              {algoritmos
                .filter((a) => metricas[a].matriz_confusao)
                .map((a) => (
                  <Grid item xs={12} md={4} key={a}>
                    <MatrizConfusao nome={NOMES_ALGORITMOS[a]} cor={CORES_ALGORITMOS[a]} dados={metricas[a].matriz_confusao} />
                  </Grid>
                ))}
            </Grid>
          </Secao>
        </Box>
      )}

      <Secao titulo="Últimas recomendações" subtitulo="Planos sugeridos pelo modelo para os seus riscos e a sua decisão" semPadding>
        {ultimas.length === 0 ? (
          <EstadoVazio compacto titulo="Nenhuma recomendação gerada ainda" />
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["Risco", "Plano recomendado", "Algoritmo", "Confiança", "Decisão", "Data"].map((c) => (
                    <TableCell key={c}>{c}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {ultimas.map((rec) => {
                  const risco = riscoPorId.get(rec.id_risco);
                  return (
                    <TableRow key={rec.id}>
                      <TableCell sx={{ maxWidth: 240 }}>
                        <Typography variant="body2" noWrap fontWeight={500}>
                          {risco ? `${risco.indice} ${risco.titulo}` : `Risco #${rec.id_risco}`}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Tooltip title={rec.plano.descricao}>
                          <Typography variant="body2" noWrap color="text.secondary">
                            {rec.plano.descricao}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{NOMES_ALGORITMOS[rec.algoritmo_usado] ?? rec.algoritmo_usado}</TableCell>
                      <TableCell sx={{ minWidth: 140 }}>
                        <BarraConfianca confianca={rec.confianca} compacta />
                      </TableCell>
                      <TableCell>
                        <ChipAceite aceita={rec.aceita} />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>
                        {new Date(rec.criado_em).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Secao>
    </Box>
  );
}

function MatrizConfusao({ nome, cor, dados }) {
  const { classes, valores } = dados;
  const maximo = Math.max(...valores.flat(), 1);
  const total = valores.flat().reduce((x, y) => x + y, 0);
  const acertos = valores.reduce((soma, linha, i) => soma + linha[i], 0);
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Marcador cor={cor} forma="circulo" />
        {nome} · {total ? ((acertos / total) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}% de acertos
      </Typography>
      <Box component="table" sx={{ borderCollapse: "separate", borderSpacing: 4, width: "100%" }}>
        <thead>
          <tr>
            <Box component="th" sx={{ fontSize: "0.6875rem", color: "text.secondary", textAlign: "left", fontWeight: 500 }}>
              Real \ Previsto
            </Box>
            {classes.map((c) => (
              <Box component="th" key={c} sx={{ fontSize: "0.75rem", color: "text.secondary", fontWeight: 600 }}>
                {c}
              </Box>
            ))}
          </tr>
        </thead>
        <tbody>
          {valores.map((linha, i) => (
            <tr key={classes[i]}>
              <Box component="th" sx={{ fontSize: "0.75rem", color: "text.secondary", fontWeight: 600, textAlign: "left" }}>
                {classes[i]}
              </Box>
              {linha.map((valor, j) => {
                const acerto = i === j;
                const grave = Math.abs(i - j) > 1;
                const intensidade = Math.round((0.15 + (valor / maximo) * 0.55) * 100);
                // Acertos em violeta (IA); erros em âmbar, e em vermelho os graves (Baixo ↔ Alto).
                const base = acerto ? "var(--argos-ia)" : grave ? "var(--argos-erro)" : "var(--argos-atencao)";
                return (
                  <Box
                    component="td"
                    key={j}
                    sx={{
                      textAlign: "center",
                      py: 1.2,
                      borderRadius: 1,
                      fontWeight: acerto ? 700 : 500,
                      bgcolor: valor === 0 ? "transparent" : `color-mix(in srgb, ${base} ${intensidade}%, transparent)`,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    {valor}
                  </Box>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}

function Secao({ titulo, subtitulo, children, semPadding = false }) {
  return (
    <Paper sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Typography variant="subtitle1" component="h2">
          {titulo}
        </Typography>
        {subtitulo && (
          <Typography variant="caption" color="text.secondary">
            {subtitulo}
          </Typography>
        )}
      </Box>
      <Box sx={{ px: semPadding ? 0 : 1, pb: semPadding ? 0 : 1, flexGrow: 1, minWidth: 0 }}>{children}</Box>
    </Paper>
  );
}
