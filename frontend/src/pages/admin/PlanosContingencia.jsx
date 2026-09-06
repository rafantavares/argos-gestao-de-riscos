import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { planos as servicoPlanos } from "../../services/api";
import { CATEGORIAS, IMPACTOS, PROBABILIDADES, rotulo } from "../../constants";

export default function PlanosContingencia() {
  const [planos, setPlanos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [dialogoNovo, setDialogoNovo] = useState(false);
  const [planoEmEdicao, setPlanoEmEdicao] = useState(null);

  async function carregar() {
    setCarregando(true);
    setPlanos(await servicoPlanos.listar());
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function alternarAtivo(plano) {
    await servicoPlanos.alternarAtivo(plano.id, !plano.ativo);
    carregar();
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Planos de contingência
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogoNovo(true)}>
          Novo plano
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Um plano novo só passa a ser recomendado pelo modelo depois que pelo menos uma
        recomendação com esse plano for aceita por um gerente (o feedback real vira exemplo de
        treino). Desativar um plano não apaga o histórico de recomendações já geradas com ele.
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Descrição</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Probabilidade</TableCell>
              <TableCell>Impacto</TableCell>
              <TableCell>Ativo</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!carregando && planos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">Nenhum plano cadastrado ainda.</Typography>
                </TableCell>
              </TableRow>
            )}
            {planos.map((plano) => (
              <TableRow key={plano.id} sx={{ opacity: plano.ativo ? 1 : 0.5 }}>
                <TableCell sx={{ maxWidth: 420 }}>{plano.descricao}</TableCell>
                <TableCell>
                  <Chip size="small" label={rotulo(CATEGORIAS, plano.categoria)} />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={rotulo(PROBABILIDADES, plano.probabilidade)} />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={rotulo(IMPACTOS, plano.impacto)} />
                </TableCell>
                <TableCell>
                  <Switch checked={plano.ativo} onChange={() => alternarAtivo(plano)} size="small" />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => setPlanoEmEdicao(plano)} title="Editar">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <DialogoPlano
        titulo="Novo plano de contingência"
        aberto={dialogoNovo}
        aoFechar={() => setDialogoNovo(false)}
        aoSalvar={async (dados) => {
          await servicoPlanos.criar(dados);
          setDialogoNovo(false);
          carregar();
        }}
      />

      <DialogoPlano
        titulo="Editar plano de contingência"
        aberto={Boolean(planoEmEdicao)}
        valoresIniciais={planoEmEdicao}
        aoFechar={() => setPlanoEmEdicao(null)}
        aoSalvar={async (dados) => {
          await servicoPlanos.editar(planoEmEdicao.id, dados);
          setPlanoEmEdicao(null);
          carregar();
        }}
      />
    </Box>
  );
}

function DialogoPlano({ titulo, aberto, valoresIniciais, aoFechar, aoSalvar }) {
  const [descricao, setDescricao] = useState(valoresIniciais?.descricao ?? "");
  const [categoria, setCategoria] = useState(valoresIniciais?.categoria ?? "");
  const [probabilidade, setProbabilidade] = useState(valoresIniciais?.probabilidade ?? "");
  const [impacto, setImpacto] = useState(valoresIniciais?.impacto ?? "");
  const [erro, setErro] = useState("");

  useEffect(() => {
    setDescricao(valoresIniciais?.descricao ?? "");
    setCategoria(valoresIniciais?.categoria ?? "");
    setProbabilidade(valoresIniciais?.probabilidade ?? "");
    setImpacto(valoresIniciais?.impacto ?? "");
    setErro("");
  }, [valoresIniciais, aberto]);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro("");
    try {
      await aoSalvar({ descricao, categoria, probabilidade, impacto });
    } catch (e) {
      setErro(e.response?.data?.detail ?? "Não foi possível salvar o plano.");
    }
  }

  return (
    <Dialog open={aberto} onClose={aoFechar} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={aoEnviar}>
        <DialogTitle>{titulo}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {erro && <Alert severity="error">{erro}</Alert>}
          <TextField
            label="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            multiline
            minRows={2}
            required
            autoFocus
          />
          <TextField
            select
            label="Categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            required
          >
            {CATEGORIAS.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Probabilidade"
            value={probabilidade}
            onChange={(e) => setProbabilidade(e.target.value)}
            required
          >
            {PROBABILIDADES.map((p) => (
              <MenuItem key={p.value} value={p.value}>
                {p.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Impacto"
            value={impacto}
            onChange={(e) => setImpacto(e.target.value)}
            required
          >
            {IMPACTOS.map((i) => (
              <MenuItem key={i.value} value={i.value}>
                {i.label}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={aoFechar}>Cancelar</Button>
          <Button type="submit" variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
