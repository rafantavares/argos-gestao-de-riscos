import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { recomendacoes as servicoRecomendacoes, riscos as servicoRiscos } from "../../services/api";
import { CATEGORIAS, IMPACTOS, PROBABILIDADES, rotulo } from "../../constants";

const NOMES_ALGORITMOS = {
  knn: "KNN",
  arvore_decisao: "Árvore de Decisão",
  random_forest: "Random Forest",
};

export default function Recomendacao() {
  const { idRisco } = useParams();
  const [risco, setRisco] = useState(null);
  const [recomendacao, setRecomendacao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");

  async function carregar() {
    setCarregando(true);
    setErro("");
    try {
      const dadosRisco = await servicoRiscos.obter(idRisco);
      setRisco(dadosRisco);

      const existentes = await servicoRecomendacoes.listarPorRisco(idRisco);
      if (existentes.length > 0) {
        setRecomendacao(existentes[existentes.length - 1]);
      } else {
        const nova = await servicoRecomendacoes.gerar(idRisco);
        setRecomendacao(nova);
      }
    } catch (e) {
      setErro(e.response?.data?.detail ?? "Não foi possível carregar a recomendação.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idRisco]);

  async function responder(aceita) {
    setProcessando(true);
    setErro("");
    try {
      const atualizada = await servicoRecomendacoes.responder(recomendacao.id, aceita);
      setRecomendacao(atualizada);
    } catch (e) {
      setErro(e.response?.data?.detail ?? "Não foi possível registrar a resposta.");
    } finally {
      setProcessando(false);
    }
  }

  async function gerarNovaRecomendacao() {
    setProcessando(true);
    setErro("");
    try {
      const nova = await servicoRecomendacoes.gerar(idRisco);
      setRecomendacao(nova);
    } catch (e) {
      setErro(e.response?.data?.detail ?? "Não foi possível gerar uma nova recomendação.");
    } finally {
      setProcessando(false);
    }
  }

  if (carregando) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        Recomendação de plano de contingência
      </Typography>

      {erro && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {erro}
        </Alert>
      )}

      {risco && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {risco.titulo}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip size="small" label={rotulo(CATEGORIAS, risco.categoria)} />
            <Chip size="small" label={`Probabilidade: ${rotulo(PROBABILIDADES, risco.probabilidade)}`} />
            <Chip size="small" label={`Impacto: ${rotulo(IMPACTOS, risco.impacto)}`} />
          </Stack>
        </Paper>
      )}

      {recomendacao && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="overline" color="text.secondary">
            Plano recomendado
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {recomendacao.plano.descricao}
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
            <Chip
              size="small"
              variant="outlined"
              label={`Algoritmo: ${NOMES_ALGORITMOS[recomendacao.algoritmo_usado] ?? recomendacao.algoritmo_usado}`}
            />
            <Chip
              size="small"
              variant="outlined"
              label={`Acurácia: ${(recomendacao.acuracia_momento * 100).toFixed(1)}%`}
            />
          </Stack>

          {recomendacao.aceita === null && (
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckIcon />}
                disabled={processando}
                onClick={() => responder(true)}
              >
                Aceitar
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CloseIcon />}
                disabled={processando}
                onClick={() => responder(false)}
              >
                Rejeitar
              </Button>
            </Stack>
          )}

          {recomendacao.aceita === true && (
            <Alert severity="success">
              Recomendação aceita — esse par (risco, plano) foi incorporado ao histórico de
              treinamento do modelo.
            </Alert>
          )}

          {recomendacao.aceita === false && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Recomendação rejeitada.
              </Alert>
              <Button variant="outlined" disabled={processando} onClick={gerarNovaRecomendacao}>
                Gerar nova recomendação
              </Button>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
