import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TimelineIcon from "@mui/icons-material/Timeline";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { riscos as servicoRiscos } from "../services/api";
import { FASES_PROJETO, IMPACTOS, PROBABILIDADES, faixaExposicao, rotulo } from "../constants";

const TENDENCIAS = {
  subindo: { label: "Exposição subindo", cor: "#F87171", icone: <TrendingUpIcon fontSize="small" /> },
  caindo: { label: "Exposição caindo", cor: "#4ADE80", icone: <TrendingDownIcon fontSize="small" /> },
  estavel: { label: "Exposição estável", cor: "#8A93A6", icone: <TrendingFlatIcon fontSize="small" /> },
};

// Reavaliação do risco conforme o andamento do projeto (MR-MPS-SW:2023, GPR 17): o
// gerente revisa as notas e a fase atual, e cada revisão vira um ponto da
// série de evolução da exposição.
export default function EvolucaoExposicao({ risco, aoReavaliar }) {
  const [evolucao, setEvolucao] = useState(null);
  const [probabilidade, setProbabilidade] = useState(risco.probabilidade);
  const [impacto, setImpacto] = useState(risco.impacto);
  const [fase, setFase] = useState(risco.fase_projeto);
  const [justificativa, setJustificativa] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null); // { tipo, texto }

  useEffect(() => {
    setProbabilidade(risco.probabilidade);
    setImpacto(risco.impacto);
    setFase(risco.fase_projeto);
    servicoRiscos
      .evolucao(risco.id)
      .then(setEvolucao)
      .catch(() => setEvolucao(null));
  }, [risco.id, risco.status, risco.probabilidade, risco.impacto, risco.fase_projeto]);

  const alterado =
    probabilidade !== risco.probabilidade || impacto !== risco.impacto || fase !== risco.fase_projeto;
  const encerrado = risco.status === "encerrado";
  const exposicaoNova = probabilidade * impacto;
  const faixaNova = faixaExposicao(exposicaoNova);

  function aplicarSugestao() {
    setProbabilidade(evolucao.sugestao.probabilidade);
    setImpacto(evolucao.sugestao.impacto);
    setJustificativa(evolucao.sugestao.motivo);
  }

  async function registrar() {
    setSalvando(true);
    setMensagem(null);
    try {
      const atualizado = await servicoRiscos.reavaliar(risco.id, {
        probabilidade,
        impacto,
        fase_projeto: fase,
        justificativa,
      });
      setJustificativa("");
      setMensagem({ tipo: "success", texto: "Reavaliação registrada." });
      aoReavaliar(atualizado);
    } catch (e) {
      const detalhe = e.response?.data?.detail;
      setMensagem({ tipo: "error", texto: typeof detalhe === "string" ? detalhe : "Não foi possível registrar a reavaliação." });
    } finally {
      setSalvando(false);
    }
  }

  const pontos = evolucao?.pontos ?? [];
  const tendencia = TENDENCIAS[evolucao?.tendencia ?? "estavel"];

  return (
    <Paper sx={{ p: 3, mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
        <TimelineIcon sx={{ color: "primary.main", fontSize: 22 }} />
        <Typography variant="subtitle1" fontWeight={600}>
          Evolução da exposição
        </Typography>
        {evolucao && (
          <Chip
            size="small"
            icon={tendencia.icone}
            label={tendencia.label}
            variant="outlined"
            sx={{ color: tendencia.cor, borderColor: tendencia.cor, "& .MuiChip-icon": { color: tendencia.cor } }}
          />
        )}
        {evolucao && (
          <Typography variant="caption" color="text.secondary">
            última avaliação há {evolucao.dias_desde_ultima_avaliacao} dia(s)
          </Typography>
        )}
      </Box>

      {evolucao?.reavaliacao_pendente && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Este risco está há {evolucao.dias_desde_ultima_avaliacao} dias sem reavaliação. Revise as notas conforme o
          andamento atual do projeto.
        </Alert>
      )}

      {pontos.length > 1 ? (
        <LineChart
          height={220}
          margin={{ left: 60, right: 50, top: 20, bottom: 30 }}
          xAxis={[
            {
              data: pontos.map((p, i) =>
                `${i === 0 ? "Inicial" : `Reav. ${i}`} (${new Date(p.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })})`
              ),
              scaleType: "point",
            },
          ]}
          yAxis={[{ min: 0, max: 25, label: "Exposição (1–25)" }]}
          series={[
            {
              data: pontos.map((p) => p.exposicao),
              label: "Exposição",
              color: "#2DD4BF",
              showMark: true,
              valueFormatter: (valor) => `${valor} · ${faixaExposicao(valor).label}`,
            },
          ]}
          slotProps={{ legend: { hidden: true } }}
        />
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Ainda sem reavaliações: a exposição atual é a da avaliação inicial ({risco.exposicao} ·{" "}
          {risco.avaliacao_exposicao}). Cada reavaliação registrada aparece aqui como um ponto da série.
        </Typography>
      )}

      {pontos.length > 1 && (
        <Stack divider={<Divider />} spacing={1} sx={{ mt: 1, mb: 2 }}>
          {pontos
            .slice(1)
            .reverse()
            .map((p) => (
              <Typography key={p.data} variant="body2">
                <strong>
                  {p.exposicao} · {p.avaliacao}
                </strong>{" "}
                (P{p.probabilidade} × I{p.impacto}, {rotulo(FASES_PROJETO, p.fase_projeto).toLowerCase()}) —{" "}
                {p.justificativa}{" "}
                <Typography component="span" variant="caption" color="text.secondary">
                  {new Date(p.data).toLocaleString("pt-BR")}
                </Typography>
              </Typography>
            ))}
        </Stack>
      )}

      {evolucao?.sugestao && !encerrado && (
        <Alert
          severity="info"
          icon={<AutoAwesomeIcon fontSize="small" />}
          sx={{ mb: 2 }}
          action={
            <Button size="small" color="inherit" onClick={aplicarSugestao}>
              Aplicar
            </Button>
          }
        >
          Sugestão de recálculo: probabilidade {evolucao.sugestao.probabilidade}, impacto {evolucao.sugestao.impacto}.{" "}
          {evolucao.sugestao.motivo}
        </Alert>
      )}

      {encerrado ? (
        <Typography variant="body2" color="text.secondary">
          Risco encerrado — não é mais reavaliado.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth size="small" label="Probabilidade" value={probabilidade} onChange={(e) => setProbabilidade(e.target.value)}>
              {PROBABILIDADES.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  {p.value} · {p.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth size="small" label="Impacto" value={impacto} onChange={(e) => setImpacto(e.target.value)}>
              {IMPACTOS.map((i) => (
                <MenuItem key={i.value} value={i.value}>
                  {i.value} · {i.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth size="small" label="Fase atual do projeto" value={fase} onChange={(e) => setFase(e.target.value)}>
              {FASES_PROJETO.map((f) => (
                <MenuItem key={f.value} value={f.value}>
                  {f.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Justificativa da reavaliação"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              helperText="O que mudou no projeto desde a última avaliação."
              inputProps={{ maxLength: 1000 }}
            />
          </Grid>
          <Grid item xs={12} sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Button variant="contained" disabled={salvando || !alterado || justificativa.trim().length < 5} onClick={registrar}>
              {salvando ? "Registrando..." : "Registrar reavaliação"}
            </Button>
            {alterado && (
              <Typography variant="body2" color="text.secondary">
                Nova exposição: <strong style={{ color: faixaNova.cor }}>{exposicaoNova} · {faixaNova.label}</strong>{" "}
                (atual {risco.exposicao} · {risco.avaliacao_exposicao})
              </Typography>
            )}
          </Grid>
          {mensagem && (
            <Grid item xs={12}>
              <Alert severity={mensagem.tipo}>{mensagem.texto}</Alert>
            </Grid>
          )}
        </Grid>
      )}
    </Paper>
  );
}
