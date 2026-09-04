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
  Stack,
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
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import { auth, projetos as servicoProjetos } from "../../services/api";

export default function Projetos() {
  const [projetos, setProjetos] = useState([]);
  const [gerentes, setGerentes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [dialogoNovo, setDialogoNovo] = useState(false);
  const [projetoEmEdicao, setProjetoEmEdicao] = useState(null);
  const [projetoParaVincular, setProjetoParaVincular] = useState(null);

  async function carregar() {
    setCarregando(true);
    const [listaProjetos, listaGerentes] = await Promise.all([
      servicoProjetos.listar(),
      auth.listarGerentes(),
    ]);
    setProjetos(listaProjetos);
    setGerentes(listaGerentes);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Projetos
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogoNovo(true)}>
          Novo projeto
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Criado em</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!carregando && projetos.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary">Nenhum projeto cadastrado ainda.</Typography>
                </TableCell>
              </TableRow>
            )}
            {projetos.map((projeto) => (
              <TableRow key={projeto.id}>
                <TableCell>{projeto.nome}</TableCell>
                <TableCell>{projeto.descricao || "—"}</TableCell>
                <TableCell>{new Date(projeto.criado_em).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => setProjetoEmEdicao(projeto)} title="Editar">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setProjetoParaVincular(projeto)}
                    title="Gerenciar gerentes"
                  >
                    <GroupAddIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <DialogoProjeto
        titulo="Novo projeto"
        aberto={dialogoNovo}
        aoFechar={() => setDialogoNovo(false)}
        aoSalvar={async (dados) => {
          await servicoProjetos.criar(dados);
          setDialogoNovo(false);
          carregar();
        }}
      />

      <DialogoProjeto
        titulo="Editar projeto"
        aberto={Boolean(projetoEmEdicao)}
        valoresIniciais={projetoEmEdicao}
        aoFechar={() => setProjetoEmEdicao(null)}
        aoSalvar={async (dados) => {
          await servicoProjetos.editar(projetoEmEdicao.id, dados);
          setProjetoEmEdicao(null);
          carregar();
        }}
      />

      <DialogoVincularGerente
        projeto={projetoParaVincular}
        gerentes={gerentes}
        aoFechar={() => setProjetoParaVincular(null)}
      />
    </Box>
  );
}

function DialogoProjeto({ titulo, aberto, valoresIniciais, aoFechar, aoSalvar }) {
  const [nome, setNome] = useState(valoresIniciais?.nome ?? "");
  const [descricao, setDescricao] = useState(valoresIniciais?.descricao ?? "");
  const [erro, setErro] = useState("");

  useEffect(() => {
    setNome(valoresIniciais?.nome ?? "");
    setDescricao(valoresIniciais?.descricao ?? "");
    setErro("");
  }, [valoresIniciais, aberto]);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro("");
    try {
      await aoSalvar({ nome, descricao });
    } catch (e) {
      setErro(e.response?.data?.detail ?? "Não foi possível salvar o projeto.");
    }
  }

  return (
    <Dialog open={aberto} onClose={aoFechar} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={aoEnviar}>
        <DialogTitle>{titulo}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {erro && <Alert severity="error">{erro}</Alert>}
          <TextField
            label="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            autoFocus
          />
          <TextField
            label="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            multiline
            minRows={2}
          />
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

function DialogoVincularGerente({ projeto, gerentes, aoFechar }) {
  const [vinculados, setVinculados] = useState([]);
  const [idSelecionado, setIdSelecionado] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!projeto) return;
    servicoProjetos.listarGerentesVinculados(projeto.id).then(setVinculados);
    setIdSelecionado("");
    setErro("");
  }, [projeto]);

  if (!projeto) return null;

  const idsVinculados = new Set(vinculados.map((v) => v.id_gerente));
  const disponiveis = gerentes.filter((g) => !idsVinculados.has(g.id));

  async function vincular() {
    if (!idSelecionado) return;
    setErro("");
    try {
      await servicoProjetos.vincularGerente(projeto.id, idSelecionado);
      const atualizados = await servicoProjetos.listarGerentesVinculados(projeto.id);
      setVinculados(atualizados);
      setIdSelecionado("");
    } catch (e) {
      setErro(e.response?.data?.detail ?? "Não foi possível vincular o gerente.");
    }
  }

  return (
    <Dialog open onClose={aoFechar} fullWidth maxWidth="xs">
      <DialogTitle>Gerentes de "{projeto.nome}"</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {erro && <Alert severity="error">{erro}</Alert>}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {vinculados.length === 0 && (
            <Typography color="text.secondary" variant="body2">
              Nenhum gerente vinculado ainda.
            </Typography>
          )}
          {vinculados.map((v) => (
            <Chip key={v.id_gerente} label={v.gerente.nome} />
          ))}
        </Stack>

        {disponiveis.length > 0 && (
          <Stack direction="row" spacing={1}>
            <TextField
              select
              label="Vincular gerente"
              value={idSelecionado}
              onChange={(e) => setIdSelecionado(e.target.value)}
              fullWidth
              size="small"
            >
              {disponiveis.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.nome}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" onClick={vincular} disabled={!idSelecionado}>
              Vincular
            </Button>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={aoFechar}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
