import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { listarProjetos } from "../services/projetos";
import { criarRisco, listarRiscos } from "../services/riscos";
import CardRisco from "../components/CardRisco";
import { CATEGORIAS, IMPACTOS, PROBABILIDADES } from "../constants";

const RISCO_VAZIO = {
  titulo: "",
  descricao: "",
  categoria: "",
  probabilidade: "",
  impacto: "",
  id_projeto: "",
};

export default function Riscos() {
  const navigate = useNavigate();

  const [projetos, setProjetos] = useState([]);
  const [projetoFiltro, setProjetoFiltro] = useState("");
  const [riscos, setRiscos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [dialogAberto, setDialogAberto] = useState(false);
  const [form, setForm] = useState(RISCO_VAZIO);
  const [erroForm, setErroForm] = useState("");

  useEffect(() => {
    listarProjetos()
      .then(setProjetos)
      .catch(() => setErro("Não foi possível carregar os projetos."));
  }, []);

  function carregarRiscos() {
    setCarregando(true);
    listarRiscos(projetoFiltro || undefined)
      .then(setRiscos)
      .catch(() => setErro("Não foi possível carregar os riscos."))
      .finally(() => setCarregando(false));
  }

  useEffect(carregarRiscos, [projetoFiltro]);

  async function handleCriarRisco(evento) {
    evento.preventDefault();
    setErroForm("");
    try {
      await criarRisco({ ...form, id_projeto: Number(form.id_projeto) });
      setDialogAberto(false);
      setForm(RISCO_VAZIO);
      carregarRiscos();
    } catch {
      setErroForm("Não foi possível cadastrar o risco. Verifique os dados.");
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          Riscos
        </Typography>
        <Button
          variant="contained"
          onClick={() => setDialogAberto(true)}
          disabled={projetos.length === 0}
        >
          Novo risco
        </Button>
      </Stack>

      {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

      {projetos.length === 0 && !erro && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Nenhum projeto disponível. Peça a um administrador para cadastrar um projeto antes de
          registrar riscos.
        </Alert>
      )}

      <TextField
        select
        label="Filtrar por projeto"
        value={projetoFiltro}
        onChange={(e) => setProjetoFiltro(e.target.value)}
        sx={{ mb: 3, minWidth: 260 }}
      >
        <MenuItem value="">Todos os projetos</MenuItem>
        {projetos.map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {p.nome}
          </MenuItem>
        ))}
      </TextField>

      {carregando ? (
        <Skeleton variant="rounded" height={200} />
      ) : (
        <Grid container spacing={2}>
          {riscos.map((risco) => (
            <Grid item xs={12} sm={6} md={4} key={risco.id}>
              <CardRisco risco={risco} onClick={() => navigate(`/riscos/${risco.id}`)} />
            </Grid>
          ))}
          {riscos.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.secondary">Nenhum risco cadastrado ainda.</Typography>
            </Grid>
          )}
        </Grid>
      )}

      <Dialog open={dialogAberto} onClose={() => setDialogAberto(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCriarRisco}>
          <DialogTitle>Novo risco</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Título"
                required
                fullWidth
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
              <TextField
                label="Descrição"
                fullWidth
                multiline
                minRows={2}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
              <TextField
                label="Projeto"
                select
                required
                fullWidth
                value={form.id_projeto}
                onChange={(e) => setForm({ ...form, id_projeto: e.target.value })}
              >
                {projetos.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.nome}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Categoria"
                select
                required
                fullWidth
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              >
                {CATEGORIAS.map((c) => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Probabilidade"
                select
                required
                fullWidth
                value={form.probabilidade}
                onChange={(e) => setForm({ ...form, probabilidade: e.target.value })}
              >
                {PROBABILIDADES.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Impacto"
                select
                required
                fullWidth
                value={form.impacto}
                onChange={(e) => setForm({ ...form, impacto: e.target.value })}
              >
                {IMPACTOS.map((i) => (
                  <MenuItem key={i.value} value={i.value}>
                    {i.label}
                  </MenuItem>
                ))}
              </TextField>
              {erroForm && <Alert severity="error">{erroForm}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Cadastrar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
