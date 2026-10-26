import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import DownloadIcon from "@mui/icons-material/Download";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import {
  auth,
  ml as servicoMl,
  projetos as servicoProjetos,
  recomendacoes as servicoRecomendacoes,
  relatorio as servicoRelatorio,
  riscos as servicoRiscos,
} from "../../services/api";
import {
  ALGORITMOS,
  AREAS_AFETADAS,
  CATEGORIAS,
  CORES_ALGORITMOS,
  CORES_SERIE_CATEGORIA,
  CORES_SEVERIDADE,
  FASES_PROJETO,
  IMPACTOS,
  NOMES_ALGORITMOS,
  ORCAMENTOS_IMPACTO,
  PROBABILIDADES,
  ROTULOS_SEVERIDADE,
  STATUS_RISCO,
  URGENCIAS,
  nivelSeveridade,
  rotulo,
} from "../../constants";
import CartaoEstatistica from "../../components/CartaoEstatistica";
import EstadoVazio from "../../components/EstadoVazio";
import { ChipAceite } from "../../components/Badges";
import BarraConfianca from "../../components/BarraConfianca";
import { exportarCsv } from "../../utils/exportarCsv";
import { tendenciaSemanal, tendenciaTaxaSemanal } from "../../utils/tendencias";

const METRICAS_COMPARADAS = [
  { chave: "acuracia", rotulo: "Acurácia" },
  { chave: "precisao", rotulo: "Precisão" },
  { chave: "recall", rotulo: "Recall" },
  { chave: "f1", rotulo: "F1 (macro)" },
];

const COLUNAS_RELATORIO = [
  { rotulo: "Projeto", valor: (l) => l.projeto },
  { rotulo: "Índice", valor: (l) => l.indice },
  { rotulo: "Risco", valor: (l) => l.titulo },
  { rotulo: "Gerente", valor: (l) => l.gerente },
  { rotulo: "Categoria (área afetada)", valor: (l) => rotulo(AREAS_AFETADAS, l.area_afetada) },
  { rotulo: "Grupo PMBOK", valor: (l) => rotulo(CATEGORIAS, l.categoria) },
  { rotulo: "Descrição do impacto", valor: (l) => l.descricao_impacto },
  { rotulo: "Impacto", valor: (l) => `${l.impacto} - ${rotulo(IMPACTOS, l.impacto)}` },
  { rotulo: "Probabilidade", valor: (l) => `${l.probabilidade} - ${rotulo(PROBABILIDADES, l.probabilidade)}` },
  { rotulo: "Exposição", valor: (l) => l.exposicao },
  { rotulo: "Avaliação da exposição", valor: (l) => l.avaliacao_exposicao },
  { rotulo: "Mitigação", valor: (l) => l.mitigacao ?? "" },
  { rotulo: "Contingência", valor: (l) => l.contingencia ?? "" },
  { rotulo: "Gatilho", valor: (l) => l.gatilho ?? "" },
  { rotulo: "Orçamento", valor: (l) => rotulo(ORCAMENTOS_IMPACTO, l.orcamento_impacto) },
  { rotulo: "Urgência", valor: (l) => rotulo(URGENCIAS, l.urgencia) },
  { rotulo: "Fase do projeto", valor: (l) => rotulo(FASES_PROJETO, l.fase_projeto) },
  { rotulo: "Status do risco", valor: (l) => rotulo(STATUS_RISCO, l.status) },
  { rotulo: "Plano recomendado", valor: (l) => l.recomendacao?.descricao_plano ?? "" },
  { rotulo: "Algoritmo", valor: (l) => NOMES_ALGORITMOS[l.recomendacao?.algoritmo_usado] ?? "" },
  {
    rotulo: "Confiança",
    valor: (l) => (l.recomendacao?.confianca != null ? `${Math.round(l.recomendacao.confianca * 100)}%` : ""),
  },
  {
    rotulo: "Aceite",
    valor: (l) =>
      l.recomendacao ? (l.recomendacao.aceita === null ? "Pendente" : l.recomendacao.aceita ? "Aceita" : "Rejeitada") : "",
  },
  {
    rotulo: "Data da recomendação",
    valor: (l) => (l.recomendacao ? new Date(l.recomendacao.criado_em).toLocaleString("pt-BR") : ""),
  },
];

export default function Dashboard() {
  const [projetos, setProjetos] = useState([]);
  const [gerentes, setGerentes] = useState([]);
  const [riscos, setRiscos] = useState([]);
  const [recomendacoes, setRecomendacoes] = useState([]);
  const [historicoMetricas, setHistoricoMetricas] = useState([]);
  const [metricas, setMetricas] = useState(null);
  const [importancia, setImportancia] = useState(null);
  const [projetoExportacao, setProjetoExportacao] = useState("");
  const [gerenteExportacao, setGerenteExportacao] = useState("");
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    servicoProjetos.listar().then(setProjetos);
    auth.listarGerentes().then(setGerentes);
    servicoRiscos.listarTodosAdmin().then(setRiscos);
    servicoRecomendacoes.listarTodasAdmin().then(setRecomendacoes);
    servicoRecomendacoes.metricasHistorico().then(setHistoricoMetricas);
    servicoMl.metricas().then(setMetricas).catch(() => setMetricas(null));
    servicoMl.importanciaFeatures().then(setImportancia).catch(() => setImportancia(null));
  }, []);

  // --- indicadores com tendência ---
  const contagemPorSeveridade = { baixo: 0, medio: 0, alto: 0 };
  riscos.forEach((r) => {
    contagemPorSeveridade[nivelSeveridade(r.probabilidade, r.impacto)] += 1;
  });

  const respondidas = recomendacoes.filter((r) => r.aceita !== null);
  const taxaAceitacao =
    respondidas.length === 0
      ? null
      : Math.round((respondidas.filter((r) => r.aceita).length / respondidas.length) * 100);

  const tendenciaProjetos = useMemo(() => tendenciaSemanal(projetos), [projetos]);
  const tendenciaGerentes = useMemo(() => tendenciaSemanal(gerentes), [gerentes]);
  const tendenciaRiscos = useMemo(() => tendenciaSemanal(riscos), [riscos]);
  const tendenciaAceite = useMemo(
    () => tendenciaTaxaSemanal(respondidas, (r) => r.aceita === true),
    [respondidas]
  );

  // --- riscos por categoria e projeto (barras empilhadas) ---
  const projetosComRiscos = projetos.filter((p) => riscos.some((r) => r.id_projeto === p.id));
  const seriesCategoriaProjeto = CATEGORIAS.map((categoria) => ({
    label: categoria.label,
    color: CORES_SERIE_CATEGORIA[categoria.value],
    stack: "total",
    data: projetosComRiscos.map(
      (p) => riscos.filter((r) => r.id_projeto === p.id && r.categoria === categoria.value).length
    ),
  }));

  // --- performance dos algoritmos (barras horizontais agrupadas por métrica) ---
  const algoritmosDisponiveis = metricas ? ALGORITMOS.filter((a) => metricas[a]) : [];
  const seriesPerformance = algoritmosDisponiveis.map((algoritmo) => ({
    label: NOMES_ALGORITMOS[algoritmo],
    color: CORES_ALGORITMOS[algoritmo],
    data: METRICAS_COMPARADAS.map((m) =>
      metricas[algoritmo][m.chave] != null ? Math.round(metricas[algoritmo][m.chave] * 1000) / 10 : null
    ),
    valueFormatter: (v) => (v == null ? "—" : `${v.toFixed(1)}%`),
  }));

  // --- evolução da acurácia (histórico de retreinos) ---
  const carimbosTempo = [...new Set(historicoMetricas.map((m) => m.criado_em))].sort();
  const seriesAcuracia = ALGORITMOS.map((algoritmo) => ({
    label: NOMES_ALGORITMOS[algoritmo],
    color: CORES_ALGORITMOS[algoritmo],
    data: carimbosTempo.map((carimbo) => {
      const ponto = historicoMetricas.find((m) => m.criado_em === carimbo && m.algoritmo === algoritmo);
      return ponto ? Math.round(ponto.acuracia * 1000) / 10 : null;
    }),
  }));

  // --- últimas recomendações ---
  const riscoPorId = useMemo(() => new Map(riscos.map((r) => [r.id, r])), [riscos]);
  const projetoPorId = useMemo(() => new Map(projetos.map((p) => [p.id, p])), [projetos]);
  const ultimasRecomendacoes = [...recomendacoes]
    .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
    .slice(0, 8);

  async function exportarRelatorio() {
    setExportando(true);
    try {
      const dados = await servicoRelatorio.riscos(projetoExportacao || undefined, gerenteExportacao || undefined);
      // Uma linha por (risco, recomendação); risco sem recomendação vira uma linha só.
      const linhas = dados.riscos.flatMap((risco) =>
        risco.recomendacoes.length === 0
          ? [{ ...risco, recomendacao: null }]
          : risco.recomendacoes.map((rec) => ({ ...risco, recomendacao: rec }))
      );
      const sufixoProjeto = projetoExportacao ? `projeto-${projetoExportacao}` : "todos-projetos";
      const sufixoGerente = gerenteExportacao ? `-gerente-${gerenteExportacao}` : "";
      exportarCsv(`relatorio-riscos-${sufixoProjeto}${sufixoGerente}.csv`, COLUNAS_RELATORIO, linhas);
    } finally {
      setExportando(false);
    }
  }

  return (
    <Box>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Visão geral
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Indicadores consolidados de todos os projetos administrados.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap", width: { xs: "100%", sm: "auto" } }}>
          <TextField
            SelectProps={{ displayEmpty: true }}
            InputLabelProps={{ shrink: true }}
            select
            size="small"
            label="Projeto do relatório"
            value={projetoExportacao}
            onChange={(e) => setProjetoExportacao(e.target.value)}
            sx={{ minWidth: { xs: "100%", sm: 210 } }}
          >
            <MenuItem value="">Todos os projetos</MenuItem>
            {projetos.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.nome}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            SelectProps={{ displayEmpty: true }}
            InputLabelProps={{ shrink: true }}
            select
            size="small"
            label="Gerente do relatório"
            value={gerenteExportacao}
            onChange={(e) => setGerenteExportacao(e.target.value)}
            sx={{ minWidth: { xs: "100%", sm: 190 } }}
          >
            <MenuItem value="">Todos os gerentes</MenuItem>
            {gerentes.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.nome}
              </MenuItem>
            ))}
          </TextField>
          <Tooltip title="Exporta riscos e recomendações (GET /relatorio/riscos) em CSV">
            <span>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                disabled={exportando || riscos.length === 0}
                onClick={exportarRelatorio}
              >
                {exportando ? "Gerando..." : "Exportar CSV"}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica
            titulo="Projetos"
            valor={projetos.length}
            icone={<AccountTreeIcon />}
            tendencia={tendenciaProjetos}
            cor="var(--argos-marca)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica
            titulo="Gerentes"
            valor={gerentes.length}
            icone={<ManageAccountsIcon />}
            tendencia={tendenciaGerentes}
            cor="var(--argos-ia)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica
            titulo="Riscos cadastrados"
            valor={riscos.length}
            icone={<ReportProblemOutlinedIcon />}
            tendencia={tendenciaRiscos}
            cor="var(--argos-atencao)"
            rodape={
              <Box component="span" sx={{ display: "inline-flex", gap: 1 }}>
                {["baixo", "medio", "alto"].map((nivel) => (
                  <Box component="span" key={nivel} sx={{ color: CORES_SEVERIDADE[nivel], fontWeight: 700 }}>
                    {contagemPorSeveridade[nivel]} {ROTULOS_SEVERIDADE[nivel].toLowerCase()}
                  </Box>
                ))}
              </Box>
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica
            titulo="Taxa de aceitação"
            valor={taxaAceitacao === null ? "—" : `${taxaAceitacao}%`}
            icone={<ThumbUpAltOutlinedIcon />}
            tendencia={respondidas.length > 0 ? tendenciaAceite : null}
            cor="var(--argos-sucesso)"
            rodape={`${respondidas.length} recomendações respondidas`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <SecaoGrafico titulo="Riscos por categoria e projeto" subtitulo="Distribuição das categorias PMBOK em cada projeto">
            {projetosComRiscos.length === 0 ? (
              <EstadoVazio compacto titulo="Nenhum risco cadastrado" descricao="Os gerentes ainda não registraram riscos nos projetos." />
            ) : (
              <BarChart
                height={280}
                xAxis={[{ data: projetosComRiscos.map((p) => p.nome), scaleType: "band" }]}
                series={seriesCategoriaProjeto}
                slotProps={{ legend: { labelStyle: { fontSize: 12 } } }}
              />
            )}
          </SecaoGrafico>
        </Grid>
        <Grid item xs={12} md={5}>
          <SecaoGrafico
            titulo="Importância das features"
            subtitulo={`Random Forest · peso relativo de cada atributo na decisão`}
          >
            {!importancia || importancia.features.length === 0 ? (
              <EstadoVazio compacto titulo="Modelo ainda não treinado" />
            ) : (
              <BarChart
                height={280}
                layout="horizontal"
                margin={{ left: 150 }}
                yAxis={[{ data: importancia.features.map((f) => f.rotulo), scaleType: "band" }]}
                xAxis={[{ min: 0, valueFormatter: (v) => `${v}%` }]}
                series={[
                  {
                    data: importancia.features.map((f) => Math.round(f.importancia * 1000) / 10),
                    color: "var(--argos-marca)",
                    valueFormatter: (v) => `${v.toFixed(1)}%`,
                  },
                ]}
                grid={{ vertical: true }}
              />
            )}
          </SecaoGrafico>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <SecaoGrafico
            titulo="Performance dos algoritmos"
            subtitulo={
              metricas?.random_forest
                ? `Validação cruzada estratificada · ${metricas.random_forest.n_divisoes} divisões · ${metricas._dataset?.n_exemplos ?? "—"} exemplos`
                : "Validação cruzada estratificada"
            }
          >
            {seriesPerformance.length === 0 ? (
              <EstadoVazio compacto titulo="Métricas indisponíveis" />
            ) : (
              <BarChart
                height={300}
                layout="horizontal"
                margin={{ left: 90 }}
                yAxis={[{ data: METRICAS_COMPARADAS.map((m) => m.rotulo), scaleType: "band" }]}
                xAxis={[{ min: 0, max: 100, valueFormatter: (v) => `${v}%` }]}
                series={seriesPerformance}
                grid={{ vertical: true }}
                slotProps={{ legend: { labelStyle: { fontSize: 12 } } }}
              />
            )}
          </SecaoGrafico>
        </Grid>
        <Grid item xs={12} md={6}>
          <SecaoGrafico titulo="Evolução da acurácia" subtitulo="Um ponto a cada retreino disparado por feedback aceito">
            {carimbosTempo.length === 0 ? (
              <EstadoVazio
                compacto
                titulo="Nenhum retreino registrado"
                descricao="Quando um gerente aceitar uma recomendação, o modelo é retreinado e o primeiro ponto aparece aqui."
              />
            ) : (
              <LineChart
                height={300}
                xAxis={[
                  {
                    data: carimbosTempo.map((c) => new Date(c).toLocaleDateString("pt-BR")),
                    scaleType: "point",
                  },
                ]}
                series={seriesAcuracia}
                yAxis={[{ min: 0, max: 100, label: "Acurácia (%)" }]}
                slotProps={{ legend: { labelStyle: { fontSize: 12 } } }}
              />
            )}
          </SecaoGrafico>
        </Grid>
      </Grid>

      {algoritmosDisponiveis.some((a) => metricas[a].matriz_confusao) && (
        <Box sx={{ mb: 3 }}>
          <SecaoGrafico
            titulo="Matriz de confusão"
            subtitulo="Previsões da validação cruzada: linhas = nível real, colunas = nível previsto. A diagonal são os acertos; erros entre Baixo e Alto são os mais graves."
          >
            <Grid container spacing={3}>
              {algoritmosDisponiveis
                .filter((a) => metricas[a].matriz_confusao)
                .map((a) => (
                  <Grid item xs={12} md={4} key={a}>
                    <MatrizConfusao nome={NOMES_ALGORITMOS[a]} cor={CORES_ALGORITMOS[a]} dados={metricas[a].matriz_confusao} />
                  </Grid>
                ))}
            </Grid>
          </SecaoGrafico>
        </Box>
      )}

      <SecaoGrafico titulo="Últimas recomendações" subtitulo="Planos sugeridos pelo modelo e a decisão de cada gerente" semPadding>
        {ultimasRecomendacoes.length === 0 ? (
          <EstadoVazio compacto titulo="Nenhuma recomendação gerada ainda" />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Risco", "Projeto", "Plano recomendado", "Algoritmo", "Confiança", "Aceite", "Data"].map((cabecalho) => (
                  <TableCell
                    key={cabecalho}
                    sx={{ color: "text.secondary", fontWeight: 600, fontSize: 12 }}
                  >
                    {cabecalho}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {ultimasRecomendacoes.map((rec) => {
                const risco = riscoPorId.get(rec.id_risco);
                return (
                  <TableRow key={rec.id} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body2" noWrap fontWeight={500}>
                        {risco?.titulo ?? `Risco #${rec.id_risco}`}
                      </Typography>
                    </TableCell>
                    <TableCell>{risco ? projetoPorId.get(risco.id_projeto)?.nome ?? "—" : "—"}</TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Tooltip title={rec.plano.descricao}>
                        <Typography variant="body2" noWrap color="text.secondary">
                          {rec.plano.descricao}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {NOMES_ALGORITMOS[rec.algoritmo_usado] ?? rec.algoritmo_usado}
                    </TableCell>
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
        )}
      </SecaoGrafico>
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
      <Typography variant="subtitle2" sx={{ color: cor, fontWeight: 700, mb: 1 }}>
        {nome} · {total ? ((acertos / total) * 100).toFixed(1) : "—"}% de acertos
      </Typography>
      <Box component="table" sx={{ borderCollapse: "separate", borderSpacing: 4, width: "100%" }}>
        <thead>
          <tr>
            <Box component="th" sx={{ fontSize: 11, color: "text.secondary", textAlign: "left" }}>
              Real \ Previsto
            </Box>
            {classes.map((c) => (
              <Box component="th" key={c} sx={{ fontSize: 12, color: "text.secondary", fontWeight: 600 }}>
                {c}
              </Box>
            ))}
          </tr>
        </thead>
        <tbody>
          {valores.map((linha, i) => (
            <tr key={classes[i]}>
              <Box component="th" sx={{ fontSize: 12, color: "text.secondary", fontWeight: 600, textAlign: "left" }}>
                {classes[i]}
              </Box>
              {linha.map((valor, j) => {
                const acerto = i === j;
                const grave = Math.abs(i - j) > 1;
                const intensidade = valor / maximo;
                const fundo = acerto
                  ? `color-mix(in srgb, var(--argos-marca) ${Math.round((0.12 + intensidade * 0.6) * 100)}%, transparent)`
                  : valor === 0
                    ? "transparent"
                    : grave
                      ? `color-mix(in srgb, var(--argos-erro) ${Math.round((0.25 + intensidade * 0.6) * 100)}%, transparent)`
                      : `color-mix(in srgb, var(--argos-atencao) ${Math.round((0.15 + intensidade * 0.6) * 100)}%, transparent)`;
                return (
                  <Box
                    component="td"
                    key={j}
                    sx={{
                      textAlign: "center",
                      py: 1.2,
                      borderRadius: 1,
                      fontWeight: acerto ? 700 : 500,
                      bgcolor: fundo,
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

function SecaoGrafico({ titulo, subtitulo, children, semPadding = false }) {
  return (
    <Paper sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {titulo}
        </Typography>
        {subtitulo && (
          <Typography variant="caption" color="text.secondary">
            {subtitulo}
          </Typography>
        )}
      </Box>
      <Box sx={{ px: semPadding ? 0 : 1, pb: semPadding ? 0 : 1, flexGrow: 1, overflowX: "auto", minWidth: 0 }}>{children}</Box>
    </Paper>
  );
}
