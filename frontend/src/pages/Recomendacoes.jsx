import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useParams } from "react-router-dom";
import { obterRisco } from "../services/riscos";
import { listarPlanos } from "../services/planosContingencia";
import {
  decidirRecomendacao,
  gerarRecomendacao,
  listarRecomendacoes,
} from "../services/recomendacoes";
import { ALGORITMOS } from "../constants";

async function enriquecer(recomendacao) {
  const [riscoSimilar, planos] = await Promise.all([
    obterRisco(recomendacao.id_risco_similar),
    listarPlanos(recomendacao.id_risco_similar),
  ]);
  return { ...recomendacao, riscoSimilar, planos };
}

export default function Recomendacoes() {
  const { riscoId } = useParams();

  const [risco, setRisco] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [algoritmo, setAlgoritmo] = useState("knn");
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");

  function carregarHistorico() {
    return listarRecomendacoes(riscoId).then((lista) =>
      Promise.all(lista.map(enriquecer))
    );
  }

  useEffect(() => {
    setCarregando(true);
    Promise.all([obterRisco(riscoId), carregarHistorico()])
      .then(([dadosRisco, dadosHistorico]) => {
        setRisco(dadosRisco);
        setHistorico(dadosHistorico.reverse());
      })
      .catch(() => setErro("Não foi possível carregar as recomendações."))
      .finally(() => setCarregando(false));
  }, [riscoId]);

  async function handleGerar() {
    setErro("");
    setGerando(true);
    try {
      await gerarRecomendacao(riscoId, algoritmo);
      const dadosHistorico = await carregarHistorico();
      setHistorico(dadosHistorico.reverse());
    } catch (erroRequisicao) {
      if (erroRequisicao.response?.status === 404) {
        setErro(erroRequisicao.response.data.detail);
      } else {
        setErro("Não foi possível gerar a recomendação.");
      }
    } finally {
      setGerando(false);
    }
  }

  async function handleDecisao(id, aceita) {
    await decidirRecomendacao(id, aceita);
    const dadosHistorico = await carregarHistorico();
    setHistorico(dadosHistorico.reverse());
  }

  if (carregando) {
    return <Skeleton variant="rounded" height={300} />;
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Recomendações para: {risco?.titulo}
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            select
            label="Algoritmo"
            value={algoritmo}
            onChange={(e) => setAlgoritmo(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {ALGORITMOS.map((a) => (
              <MenuItem key={a.value} value={a.value}>
                {a.label}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={handleGerar} disabled={gerando}>
            {gerando ? "Gerando..." : "Gerar recomendação"}
          </Button>
        </Stack>
        {erro && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {erro}
          </Alert>
        )}
      </Paper>

      <Typography variant="h6" gutterBottom>
        Histórico
      </Typography>

      <Stack spacing={2}>
        {historico.map((rec) => (
          <Paper key={rec.id} sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <Chip label={rec.algoritmo} size="small" />
                  <Chip label={`score: ${rec.score.toFixed(2)}`} size="small" variant="outlined" />
                  {rec.aceita === true && <Chip label="Aceita" color="success" size="small" />}
                  {rec.aceita === false && <Chip label="Rejeitada" color="error" size="small" />}
                  {rec.aceita === null && <Chip label="Pendente" size="small" />}
                </Stack>
                <Typography variant="subtitle2">
                  Baseado no risco: {rec.riscoSimilar.titulo}
                </Typography>
                {rec.planos.map((plano) => (
                  <Typography key={plano.id} variant="body2" color="text.secondary">
                    {plano.descricao} — {plano.acao}
                  </Typography>
                ))}
              </Box>

              {rec.aceita === null && (
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" color="success" onClick={() => handleDecisao(rec.id, true)}>
                    Aceitar
                  </Button>
                  <Button size="small" variant="outlined" color="error" onClick={() => handleDecisao(rec.id, false)}>
                    Rejeitar
                  </Button>
                </Stack>
              )}
            </Stack>
          </Paper>
        ))}
        {historico.length === 0 && (
          <Typography color="text.secondary">Nenhuma recomendação gerada ainda.</Typography>
        )}
      </Stack>
    </Box>
  );
}
