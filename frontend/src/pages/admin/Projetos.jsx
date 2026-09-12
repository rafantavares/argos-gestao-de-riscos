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
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import { auth, projetos as servicoProjetos, riscos as servicoRiscos } from "../../services/api";
import TabelaDados from "../../components/TabelaDados";

export default function Projetos() {
  const [projetos, setProjetos] = useState([]);
  const [gerentes, setGerentes] = useState([]);
  const [riscos, setRiscos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [dialogoNovo, setDialogoNovo] = useState(false);
  const [projetoEmEdicao, setProjetoEmEdicao] = useState(null);
  const [projetoParaVincular, setProjetoParaVincular] = useState(null);

  async function carregar() {
    setCarregando(true);
    const [listaProjetos, listaGerentes, listaRiscos] = await Promise.all([
      servicoProjetos.listar(),
      auth.listarGerentes(),
      servicoRiscos.listarTodosAdmin(),
    ]);
    setProjetos(listaProjetos);
    setGerentes(listaGerentes);
    setRiscos(listaRiscos);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const colunas = [
    {
      chave: "nome",
      rotulo: "Projeto",
      render: (p) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {p.nome}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", maxWidth: 420 }}>
            {p.descricao || "Sem descrição"}
          </Typography>
        </Box>
      ),
    },
    {
      chave: "riscos",
      rotulo: "Riscos",
      largura: 110,
      render: (p) => {
        const total = riscos.filter((r) => r.id_projeto === p.id).length;
        return <Chip size="small" label={total} variant={total === 0 ? "outlined" : "filled"} />;
      },
    },
    {
      chave: "criado_em",
      rotulo: "Criado em",
      largura: 140,
      render: (p) => new Date(p.criado_em).toLocaleDateString("pt-BR"),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Projetos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Projetos administrados por você e os gerentes vinculados a cada um.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogoNovo(true)}>
          Novo projeto
        </Button>
      </Box>

      <TabelaDados
        colunas={colunas}
        linhas={projetos}
        carregando={carregando}
        textoBusca={(p) => `${p.nome} ${p.descricao ?? ""}`}
        placeholderBusca="Buscar projeto por nome ou descrição"
        vazio={{
          titulo: "Nenhum projeto cadastrado",
          descricao: "Crie o primeiro projeto e vincule um gerente para que ele possa registrar riscos.",
          acao: (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogoNovo(true)}>
              Criar projeto
            </Button>
          ),
        }}
        acoes={(projeto) => (
          <>
            <Tooltip title="Editar projeto">
              <IconButton size="small" onClick={() => setProjetoEmEdicao(projeto)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Gerenciar gerentes vinculados">
              <IconButton size="small" onClick={() => setProjetoParaVincular(projeto)}>
                <GroupAddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      />

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
          <TextField label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
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
      setVinculados(await servicoProjetos.listarGerentesVinculados(projeto.id));
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
