import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
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
import DownloadIcon from "@mui/icons-material/Download";
import { projetos as servicoProjetos, riscos as servicoRiscos } from "../../services/api";
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
import { exportarCsv } from "../../utils/exportarCsv";

const COLUNAS_CSV = [
  { rotulo: "Título", valor: (r) => r.titulo },
  { rotulo: "Categoria", valor: (r) => rotulo(CATEGORIAS, r.categoria) },
  { rotulo: "Probabilidade", valor: (r) => rotulo(PROBABILIDADES, r.probabilidade) },
  { rotulo: "Impacto", valor: (r) => rotulo(IMPACTOS, r.impacto) },
  { rotulo: "Orçamento", valor: (r) => rotulo(ORCAMENTOS_IMPACTO, r.orcamento_impacto) },
  { rotulo: "Urgência", valor: (r) => rotulo(URGENCIAS, r.urgencia) },
  { rotulo: "Status", valor: (r) => rotulo(STATUS_RISCO, r.status) },
];

export default function Riscos() {
  const [riscos, setRiscos] = useState([]);
  const [meusProjetos, setMeusProjetos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const navigate = useNavigate();

  async function carregar() {
    setCarregando(true);
    const [listaRiscos, listaProjetos] = await Promise.all([
      servicoRiscos.listarMeus(),
      servicoProjetos.meus(),
    ]);
    setRiscos(listaRiscos);
    setMeusProjetos(listaProjetos);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Riscos
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={riscos.length === 0}
            onClick={() => exportarCsv("riscos.csv", COLUNAS_CSV, riscos)}
          >
            Exportar CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogoAberto(true)}
            disabled={meusProjetos.length === 0}
          >
            Novo risco
          </Button>
        </Box>
      </Box>

      {!carregando && meusProjetos.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Você ainda não está vinculado a nenhum projeto. Peça a um admin para te vincular antes
          de cadastrar riscos.
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Título</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Probabilidade</TableCell>
              <TableCell>Impacto</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!carregando && riscos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">Nenhum risco cadastrado ainda.</Typography>
                </TableCell>
              </TableRow>
            )}
            {riscos.map((risco) => (
              <TableRow key={risco.id}>
                <TableCell>{risco.titulo}</TableCell>
                <TableCell>{rotulo(CATEGORIAS, risco.categoria)}</TableCell>
                <TableCell>
                  <Chip size="small" label={rotulo(PROBABILIDADES, risco.probabilidade)} />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={rotulo(IMPACTOS, risco.impacto)} />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={rotulo(STATUS_RISCO, risco.status)}
                    sx={{
                      color: CORES_STATUS[risco.status],
                      borderColor: CORES_STATUS[risco.status],
                    }}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    onClick={() => navigate(`/gerente/riscos/${risco.id}/recomendacao`)}
                  >
                    Ver recomendação
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <DialogoNovoRisco
        aberto={dialogoAberto}
        projetos={meusProjetos}
        aoFechar={() => setDialogoAberto(false)}
        aoCriar={async (dados) => {
          const risco = await servicoRiscos.criar(dados);
          setDialogoAberto(false);
          carregar();
          navigate(`/gerente/riscos/${risco.id}/recomendacao`);
        }}
      />
    </Box>
  );
}

function DialogoNovoRisco({ aberto, projetos, aoFechar, aoCriar }) {
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [probabilidade, setProbabilidade] = useState("");
  const [impacto, setImpacto] = useState("");
  const [orcamentoImpacto, setOrcamentoImpacto] = useState("");
  const [urgencia, setUrgencia] = useState("");
  const [idProjeto, setIdProjeto] = useState("");
  const [erro, setErro] = useState("");

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro("");
    try {
      await aoCriar({
        titulo,
        categoria,
        probabilidade,
        impacto,
        orcamento_impacto: orcamentoImpacto,
        urgencia,
        id_projeto: idProjeto,
      });
    } catch (e) {
      setErro(e.response?.data?.detail ?? "Não foi possível cadastrar o risco.");
    }
  }

  return (
    <Dialog open={aberto} onClose={aoFechar} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={aoEnviar}>
        <DialogTitle>Novo risco</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {erro && <Alert severity="error">{erro}</Alert>}
          <TextField
            select
            label="Projeto"
            value={idProjeto}
            onChange={(e) => setIdProjeto(e.target.value)}
            required
          >
            {projetos.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.nome}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
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
          <TextField
            select
            label="Impacto financeiro (orçamento)"
            value={orcamentoImpacto}
            onChange={(e) => setOrcamentoImpacto(e.target.value)}
            required
          >
            {ORCAMENTOS_IMPACTO.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Urgência (proximidade)"
            value={urgencia}
            onChange={(e) => setUrgencia(e.target.value)}
            required
          >
            {URGENCIAS.map((u) => (
              <MenuItem key={u.value} value={u.value}>
                {u.label}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={aoFechar}>Cancelar</Button>
          <Button type="submit" variant="contained">
            Cadastrar e ver recomendação
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
