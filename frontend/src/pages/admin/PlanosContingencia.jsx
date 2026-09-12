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
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { planos as servicoPlanos } from "../../services/api";
import { CATEGORIAS, IMPACTOS, PROBABILIDADES, rotulo } from "../../constants";
import { ChipCategoria, ChipSeveridade } from "../../components/Badges";
import TabelaDados from "../../components/TabelaDados";

export default function PlanosContingencia() {
  const [planos, setPlanos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [dialogoNovo, setDialogoNovo] = useState(false);
  const [planoEmEdicao, setPlanoEmEdicao] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState("");

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

  const planosFiltrados = filtroCategoria ? planos.filter((p) => p.categoria === filtroCategoria) : planos;

  const colunas = [
    {
      chave: "descricao",
      rotulo: "Plano",
      render: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>
            #{p.id}
          </Typography>
          <Typography variant="body2" sx={{ maxWidth: 520 }}>
            {p.descricao}
          </Typography>
        </Box>
      ),
    },
    { chave: "categoria", rotulo: "Categoria", largura: 150, render: (p) => <ChipCategoria categoria={p.categoria} /> },
    {
      chave: "nivel",
      rotulo: "Nível de resposta",
      largura: 170,
      render: (p) => <ChipSeveridade probabilidade={p.probabilidade} impacto={p.impacto} />,
    },
    {
      chave: "ativo",
      rotulo: "Ativo",
      largura: 90,
      render: (p) => (
        <Tooltip title={p.ativo ? "Desativar plano" : "Reativar plano"}>
          <Switch checked={p.ativo} onChange={() => alternarAtivo(p)} size="small" onClick={(e) => e.stopPropagation()} />
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Planos de contingência
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Catálogo de respostas que o modelo pode recomendar: três níveis por categoria PMBOK.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogoNovo(true)}>
          Novo plano
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Um plano novo só passa a ser recomendado pelo modelo depois que pelo menos uma recomendação
        com esse plano for aceita por um gerente (o feedback real vira exemplo de treino). Desativar um
        plano não apaga o histórico de recomendações já geradas com ele.
      </Alert>

      <TabelaDados
        colunas={colunas}
        linhas={planosFiltrados}
        carregando={carregando}
        textoBusca={(p) => `${p.descricao} ${rotulo(CATEGORIAS, p.categoria)}`}
        placeholderBusca="Buscar plano pela descrição"
        estiloLinha={(p) => (p.ativo ? {} : { opacity: 0.5 })}
        filtrosExtras={
          <TextField
            select
            size="small"
            label="Categoria"
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {CATEGORIAS.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
        }
        vazio={{
          titulo: "Nenhum plano cadastrado",
          descricao: "O catálogo inicial é semeado pelo backend na primeira execução.",
        }}
        acoes={(plano) => (
          <Tooltip title="Editar plano">
            <IconButton size="small" onClick={() => setPlanoEmEdicao(plano)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      />

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
          <TextField select label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} required>
            {CATEGORIAS.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Probabilidade típica"
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
          <TextField select label="Impacto típico" value={impacto} onChange={(e) => setImpacto(e.target.value)} required>
            {IMPACTOS.map((i) => (
              <MenuItem key={i.value} value={i.value}>
                {i.label}
              </MenuItem>
            ))}
          </TextField>
          {probabilidade && impacto && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Nível de resposta:
              </Typography>
              <ChipSeveridade probabilidade={probabilidade} impacto={impacto} />
            </Box>
          )}
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
