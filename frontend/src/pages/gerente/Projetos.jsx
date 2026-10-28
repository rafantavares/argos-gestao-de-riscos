import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { projetos as servicoProjetos, riscos as servicoRiscos } from "../../services/api";
import { FAIXAS_EXPOSICAO, faixaExposicao, precisaReavaliar } from "../../constants";
import { ChipReavaliar, Marcador } from "../../components/Badges";
import { texturaFaixa } from "../../theme";
import EstadoVazio from "../../components/EstadoVazio";
import { useAviso } from "../../contexts/FeedbackContext";

// Resumo de risco de um projeto, a partir dos riscos ativos (não encerrados).
function resumir(riscosDoProjeto) {
  const ativos = riscosDoProjeto.filter((r) => r.status !== "encerrado");
  const porFaixa = FAIXAS_EXPOSICAO.map((f) => ({ ...f, quantidade: ativos.filter((r) => faixaExposicao(r.exposicao).indice === f.indice).length }));
  const media = ativos.length ? ativos.reduce((s, r) => s + r.exposicao, 0) / ativos.length : null;
  return {
    total: riscosDoProjeto.length,
    ativos: ativos.length,
    porFaixa,
    media,
    reavaliar: ativos.filter(precisaReavaliar).length,
  };
}

// Barra empilhada com a quantidade de riscos ativos em cada faixa de exposição.
function DistribuicaoFaixas({ porFaixa, ativos }) {
  if (!ativos) {
    return <Box sx={{ height: 10, borderRadius: 5, bgcolor: "var(--argos-trilha)" }} />;
  }
  const descricao = porFaixa
    .filter((f) => f.quantidade)
    .map((f) => `${f.quantidade} ${f.label.toLowerCase()}`)
    .join(", ");
  return (
    <Box role="img" aria-label={`Riscos ativos por gravidade: ${descricao}`} sx={{ display: "flex", gap: "2px", height: 10 }}>
      {porFaixa
        .filter((f) => f.quantidade)
        .map((f) => (
          <Tooltip key={f.label} title={`${f.label}: ${f.quantidade}`}>
            <Box sx={{ flex: f.quantidade, bgcolor: f.cor, borderRadius: "3px", minWidth: 6, ...texturaFaixa(f.indice) }} />
          </Tooltip>
        ))}
    </Box>
  );
}

function CartaoProjeto({ projeto, resumo, aoEditar, aoVerRiscos }) {
  const faixaMedia = resumo.media != null ? faixaExposicao(Math.max(1, Math.round(resumo.media))) : null;
  return (
    <Paper component="article" aria-labelledby={`projeto-${projeto.id}`} sx={{ p: 2.5, height: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id={`projeto-${projeto.id}`} component="h2" variant="subtitle1" sx={{ lineHeight: 1.3, wordBreak: "break-word" }}>
            {projeto.nome}
          </Typography>
          <Typography
            variant="body2"
            color={projeto.descricao ? "text.secondary" : "text.disabled"}
            sx={{ mt: 0.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {projeto.descricao || "Sem descrição"}
          </Typography>
        </Box>
        <Tooltip title="Editar projeto">
          <IconButton size="small" aria-label={`Editar o projeto ${projeto.nome}`} onClick={aoEditar} sx={{ color: "text.secondary" }}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Riscos ativos
          </Typography>
          <Typography sx={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: "1.625rem", fontWeight: 600, lineHeight: 1.1 }}>
            {resumo.ativos}
          </Typography>
          {resumo.total > resumo.ativos && (
            <Typography variant="caption" color="text.secondary">
              {resumo.total - resumo.ativos} encerrado{resumo.total - resumo.ativos === 1 ? "" : "s"}
            </Typography>
          )}
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Exposição média
          </Typography>
          <Typography sx={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: "1.625rem", fontWeight: 600, lineHeight: 1.1 }}>
            {resumo.media != null ? resumo.media.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}
          </Typography>
          {faixaMedia && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
              <Marcador cor={faixaMedia.cor} tamanho={8} />
              {faixaMedia.label}
            </Typography>
          )}
        </Box>
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
          {resumo.ativos ? "Por gravidade" : "Nenhum risco ativo"}
        </Typography>
        <DistribuicaoFaixas porFaixa={resumo.porFaixa} ativos={resumo.ativos} />
      </Box>

      <Box sx={{ mt: "auto", pt: 1.5, borderTop: 1, borderColor: "divider", display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: "auto" }}>
          Criado em {new Date(projeto.criado_em).toLocaleDateString("pt-BR")}
        </Typography>
        {resumo.reavaliar > 0 && <ChipReavaliar />}
        <Button size="small" endIcon={<ArrowForwardIcon />} onClick={aoVerRiscos}>
          Ver riscos
        </Button>
      </Box>
    </Paper>
  );
}

export default function Projetos() {
  const navigate = useNavigate();
  const avisar = useAviso();
  const [projetos, setProjetos] = useState([]);
  const [riscos, setRiscos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [dialogoNovo, setDialogoNovo] = useState(false);
  const [projetoEmEdicao, setProjetoEmEdicao] = useState(null);

  async function carregar() {
    setCarregando(true);
    try {
      const [listaProjetos, listaRiscos] = await Promise.all([servicoProjetos.meus(), servicoRiscos.listarMeus()]);
      setProjetos(listaProjetos);
      setRiscos(listaRiscos);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const resumos = useMemo(
    () => new Map(projetos.map((p) => [p.id, resumir(riscos.filter((r) => r.id_projeto === p.id))])),
    [projetos, riscos]
  );
  const termo = busca.trim().toLowerCase();
  const visiveis = projetos
    .filter((p) => !termo || `${p.nome} ${p.descricao ?? ""}`.toLowerCase().includes(termo))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: "auto" }}>
          Seus projetos e a situação de risco de cada um. Quem cria o projeto já fica vinculado a ele.
        </Typography>
        {projetos.length > 3 && (
          <TextField
            size="small"
            placeholder="Buscar projeto…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            inputProps={{ "aria-label": "Buscar projeto por nome ou descrição" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: "100%", sm: 260 } }}
          />
        )}
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogoNovo(true)}>
          Novo projeto
        </Button>
      </Box>

      {carregando ? (
        <Grid container spacing={2}>
          {[0, 1, 2].map((i) => (
            <Grid item xs={12} md={6} xl={4} key={i}>
              <Skeleton variant="rounded" height={260} />
            </Grid>
          ))}
        </Grid>
      ) : projetos.length === 0 ? (
        <Paper>
          <EstadoVazio
            titulo="Nenhum projeto ainda"
            descricao="Crie o primeiro projeto para começar a cadastrar riscos."
            acao={
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogoNovo(true)}>
                Criar projeto
              </Button>
            }
          />
        </Paper>
      ) : visiveis.length === 0 ? (
        <Paper>
          <EstadoVazio titulo="Nenhum projeto com esse nome" descricao="Confira a busca ou limpe o campo para ver todos." />
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {visiveis.map((projeto) => (
            <Grid item xs={12} md={6} xl={4} key={projeto.id}>
              <CartaoProjeto
                projeto={projeto}
                resumo={resumos.get(projeto.id)}
                aoEditar={() => setProjetoEmEdicao(projeto)}
                aoVerRiscos={() => navigate("/gerente/riscos", { state: { projeto: projeto.id } })}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <DialogoProjeto
        titulo="Novo projeto"
        rotuloSalvar="Criar projeto"
        aberto={dialogoNovo}
        aoFechar={() => setDialogoNovo(false)}
        aoSalvar={async (dados) => {
          const criado = await servicoProjetos.criar(dados);
          setDialogoNovo(false);
          avisar(`Projeto "${criado.nome}" criado.`);
          carregar();
        }}
      />

      <DialogoProjeto
        titulo="Editar projeto"
        rotuloSalvar="Salvar alterações"
        aberto={Boolean(projetoEmEdicao)}
        valoresIniciais={projetoEmEdicao}
        aoFechar={() => setProjetoEmEdicao(null)}
        aoSalvar={async (dados) => {
          await servicoProjetos.editar(projetoEmEdicao.id, dados);
          setProjetoEmEdicao(null);
          avisar("Projeto atualizado.");
          carregar();
        }}
      />
    </Box>
  );
}

function DialogoProjeto({ titulo, rotuloSalvar, aberto, valoresIniciais, aoFechar, aoSalvar }) {
  const [nome, setNome] = useState(valoresIniciais?.nome ?? "");
  const [descricao, setDescricao] = useState(valoresIniciais?.descricao ?? "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setNome(valoresIniciais?.nome ?? "");
    setDescricao(valoresIniciais?.descricao ?? "");
    setErro("");
  }, [valoresIniciais, aberto]);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await aoSalvar({ nome: nome.trim(), descricao });
    } catch (e) {
      const detalhe = e.response?.data?.detail;
      setErro(typeof detalhe === "string" ? detalhe : "Não foi possível salvar o projeto. Confira o nome (2 a 150 caracteres).");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onClose={aoFechar} fullWidth maxWidth="sm">
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
            inputProps={{ minLength: 2, maxLength: 150 }}
            placeholder="Ex.: Portal do Cliente…"
            sx={{ mt: 1 }}
          />
          <TextField
            label="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            multiline
            minRows={3}
            helperText="Opcional: objetivo, cliente ou escopo do projeto."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={aoFechar}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={salvando}>
            {salvando ? "Salvando…" : rotuloSalvar}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
