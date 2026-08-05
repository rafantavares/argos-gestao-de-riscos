import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { obterRisco } from "../services/riscos";
import { criarPlano, listarPlanos } from "../services/planosContingencia";
import { CATEGORIAS, IMPACTOS, PROBABILIDADES, rotulo } from "../constants";

const PLANO_VAZIO = { descricao: "", acao: "", responsavel: "", prazo: "" };

export default function RiscoDetalhe() {
  const { riscoId } = useParams();
  const navigate = useNavigate();

  const [risco, setRisco] = useState(null);
  const [planos, setPlanos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [form, setForm] = useState(PLANO_VAZIO);
  const [erroForm, setErroForm] = useState("");

  function carregar() {
    setCarregando(true);
    Promise.all([obterRisco(riscoId), listarPlanos(riscoId)])
      .then(([dadosRisco, dadosPlanos]) => {
        setRisco(dadosRisco);
        setPlanos(dadosPlanos);
      })
      .catch(() => setErro("Não foi possível carregar o risco."))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, [riscoId]);

  async function handleCriarPlano(evento) {
    evento.preventDefault();
    setErroForm("");
    try {
      await criarPlano({
        ...form,
        prazo: form.prazo || null,
        id_risco: Number(riscoId),
      });
      setForm(PLANO_VAZIO);
      carregar();
    } catch {
      setErroForm("Não foi possível cadastrar o plano de contingência.");
    }
  }

  if (carregando) {
    return <Skeleton variant="rounded" height={300} />;
  }

  if (erro || !risco) {
    return <Alert severity="error">{erro || "Risco não encontrado."}</Alert>;
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            {risco.titulo}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip label={rotulo(CATEGORIAS, risco.categoria)} size="small" />
            <Chip label={`Prob.: ${rotulo(PROBABILIDADES, risco.probabilidade)}`} size="small" />
            <Chip label={`Impacto: ${rotulo(IMPACTOS, risco.impacto)}`} size="small" />
            <Chip label={risco.status} size="small" variant="outlined" />
          </Stack>
        </Box>
        <Button variant="contained" onClick={() => navigate(`/riscos/${riscoId}/recomendacoes`)}>
          Solicitar recomendação
        </Button>
      </Stack>

      {risco.descricao && (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {risco.descricao}
        </Typography>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Planos de contingência
        </Typography>

        <List>
          {planos.map((plano) => (
            <ListItem key={plano.id} divider>
              <ListItemText
                primary={plano.descricao}
                secondary={
                  <>
                    {plano.acao}
                    {plano.responsavel && ` · Responsável: ${plano.responsavel}`}
                    {plano.prazo && ` · Prazo: ${plano.prazo}`}
                  </>
                }
              />
            </ListItem>
          ))}
          {planos.length === 0 && (
            <Typography color="text.secondary">Nenhum plano cadastrado ainda.</Typography>
          )}
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Novo plano de contingência
        </Typography>
        <Box component="form" onSubmit={handleCriarPlano}>
          <Stack spacing={2}>
            <TextField
              label="Descrição"
              required
              fullWidth
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
            <TextField
              label="Ação"
              required
              fullWidth
              multiline
              minRows={2}
              value={form.acao}
              onChange={(e) => setForm({ ...form, acao: e.target.value })}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Responsável"
                fullWidth
                value={form.responsavel}
                onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
              />
              <TextField
                label="Prazo"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.prazo}
                onChange={(e) => setForm({ ...form, prazo: e.target.value })}
              />
            </Stack>
            {erroForm && <Alert severity="error">{erroForm}</Alert>}
            <Button type="submit" variant="outlined" sx={{ alignSelf: "flex-start" }}>
              Adicionar plano
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
