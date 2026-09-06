import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { recomendacoes as servicoRecomendacoes, riscos as servicoRiscos } from "../../services/api";
import {
  CATEGORIAS,
  CORES_STATUS,
  IMPACTOS,
  ORCAMENTOS_IMPACTO,
  PROBABILIDADES,
  STATUS_RISCO,
  URGENCIAS,
  rotulo,
} from "../../constants";

const NOMES_ALGORITMOS = {
  knn: "KNN",
  arvore_decisao: "Árvore de Decisão",
  random_forest: "Random Forest",
};

export default function Recomendacao() {
  const { idRisco } = useParams();
  const [risco, setRisco] = useState(null);
  const [recomendacao, setRecomendacao] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [novoStatus, setNovoStatus] = useState("");
  const [comentarioStatus, setComentarioStatus] = useState("");
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");

  async function carregarHistorico() {
    setHistorico(await servicoRiscos.historico(idRisco));
  }

  async function carregar() {
    setCarregando(true);
    setErro("");
    try {
      const dadosRisco = await servicoRiscos.obter(idRisco);
      setRisco(dadosRisco);
      setNovoStatus(dadosRisco.status);
      await carregarHistorico();

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

  async function atualizarStatus() {
    setAtualizandoStatus(true);
    setErro("");
    try {
      const atualizado = await servicoRiscos.atualizarStatus(
        idRisco,
        novoStatus,
        comentarioStatus || undefined
      );
      setRisco(atualizado);
      setComentarioStatus("");
      await carregarHistorico();
    } catch (e) {
      setErro(e.response?.data?.detail ?? "Não foi possível atualizar o status.");
    } finally {
      setAtualizandoStatus(false);
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
            <Chip
              size="small"
              label={`Orçamento: ${rotulo(ORCAMENTOS_IMPACTO, risco.orcamento_impacto)}`}
            />
            <Chip size="small" label={`Urgência: ${rotulo(URGENCIAS, risco.urgencia)}`} />
            <Chip
              size="small"
              variant="outlined"
              label={rotulo(STATUS_RISCO, risco.status)}
              sx={{ color: CORES_STATUS[risco.status], borderColor: CORES_STATUS[risco.status] }}
            />
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

      {risco && (
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Histórico do risco
          </Typography>

          {risco.status !== "encerrado" ? (
            <Stack direction="row" spacing={2} sx={{ mt: 1, mb: 3 }}>
              <TextField
                select
                label="Novo status"
                size="small"
                value={novoStatus}
                onChange={(e) => setNovoStatus(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                {STATUS_RISCO.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Comentário (opcional)"
                size="small"
                fullWidth
                value={comentarioStatus}
                onChange={(e) => setComentarioStatus(e.target.value)}
              />
              <Button
                variant="outlined"
                disabled={atualizandoStatus || novoStatus === risco.status}
                onClick={atualizarStatus}
              >
                Atualizar
              </Button>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
              Risco encerrado — não é possível mudar o status.
            </Typography>
          )}

          <Stack divider={<Divider />} spacing={1.5}>
            {historico.map((evento) => (
              <Box key={evento.id}>
                <Typography variant="body2">
                  {evento.status_anterior ? (
                    <>
                      {rotulo(STATUS_RISCO, evento.status_anterior)} →{" "}
                      <strong>{rotulo(STATUS_RISCO, evento.status_novo)}</strong>
                    </>
                  ) : (
                    <strong>{rotulo(STATUS_RISCO, evento.status_novo)}</strong>
                  )}
                </Typography>
                {evento.comentario && (
                  <Typography variant="body2" color="text.secondary">
                    {evento.comentario}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {new Date(evento.criado_em).toLocaleString("pt-BR")}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
