import { useEffect, useMemo, useState } from "react";
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
  Divider,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import FilterListIcon from "@mui/icons-material/FilterList";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import TimelineIcon from "@mui/icons-material/Timeline";
import {
  projetos as servicoProjetos,
  recomendacoes as servicoRecomendacoes,
  riscos as servicoRiscos,
} from "../../services/api";
import {
  CATEGORIAS,
  CORES_SEVERIDADE,
  FASES_PROJETO,
  IMPACTOS,
  ORCAMENTOS_IMPACTO,
  PROBABILIDADES,
  STATUS_RISCO,
  URGENCIAS,
  nivelSeveridade,
  pontuacaoSeveridade,
  rotulo,
} from "../../constants";
import { ChipAceite, ChipCategoria, ChipSeveridade, ChipStatus, ChipUrgencia } from "../../components/Badges";
import EstadoVazio from "../../components/EstadoVazio";
import { exportarCsv } from "../../utils/exportarCsv";

const COLUNAS_CSV = [
  { rotulo: "Título", valor: (r) => r.titulo },
  { rotulo: "Categoria", valor: (r) => rotulo(CATEGORIAS, r.categoria) },
  { rotulo: "Probabilidade", valor: (r) => rotulo(PROBABILIDADES, r.probabilidade) },
  { rotulo: "Impacto", valor: (r) => rotulo(IMPACTOS, r.impacto) },
  { rotulo: "Orçamento", valor: (r) => rotulo(ORCAMENTOS_IMPACTO, r.orcamento_impacto) },
  { rotulo: "Urgência", valor: (r) => rotulo(URGENCIAS, r.urgencia) },
  { rotulo: "Fase do projeto", valor: (r) => rotulo(FASES_PROJETO, r.fase_projeto) },
  { rotulo: "Status", valor: (r) => rotulo(STATUS_RISCO, r.status) },
];

export default function Riscos() {
  const [riscos, setRiscos] = useState([]);
  const [meusProjetos, setMeusProjetos] = useState([]);
  const [recomendacoes, setRecomendacoes] = useState([]);
  const [filtroProjeto, setFiltroProjeto] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const navigate = useNavigate();

  async function carregar() {
    setCarregando(true);
    const [listaRiscos, listaProjetos, listaRecomendacoes] = await Promise.all([
      servicoRiscos.listarMeus(),
      servicoProjetos.meus(),
      servicoRecomendacoes.listarMinhas(),
    ]);
    setRiscos(listaRiscos);
    setMeusProjetos(listaProjetos);
    setRecomendacoes(listaRecomendacoes);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  // Última recomendação de cada risco (para o badge do plano + status de aceite).
  const ultimaRecomendacaoPorRisco = useMemo(() => {
    const mapa = new Map();
    [...recomendacoes]
      .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
      .forEach((rec) => mapa.set(rec.id_risco, rec));
    return mapa;
  }, [recomendacoes]);

  const projetoPorId = useMemo(() => new Map(meusProjetos.map((p) => [p.id, p])), [meusProjetos]);

  const riscosFiltrados = useMemo(() => {
    const lista = filtroProjeto ? riscos.filter((r) => r.id_projeto === filtroProjeto) : riscos;
    return [...lista].sort(
      (a, b) =>
        pontuacaoSeveridade(b.probabilidade, b.impacto) - pontuacaoSeveridade(a.probabilidade, a.impacto) ||
        new Date(b.criado_em) - new Date(a.criado_em)
    );
  }, [riscos, filtroProjeto]);

  return (
    <Box>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Riscos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ordenados por severidade. Clique em um risco para ver a recomendação do modelo.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <TextField
            select
            size="small"
            label="Projeto"
            value={filtroProjeto}
            onChange={(e) => setFiltroProjeto(e.target.value)}
            sx={{ minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FilterListIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          >
            <MenuItem value="">Todos os projetos</MenuItem>
            {meusProjetos.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.nome}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={riscosFiltrados.length === 0}
            onClick={() => exportarCsv("riscos.csv", COLUNAS_CSV, riscosFiltrados)}
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
          Você ainda não está vinculado a nenhum projeto. Peça a um admin para te vincular antes de
          cadastrar riscos.
        </Alert>
      )}

      {!carregando && riscosFiltrados.length === 0 ? (
        <Paper>
          <EstadoVazio
            titulo={filtroProjeto ? "Nenhum risco neste projeto" : "Nenhum risco cadastrado ainda"}
            descricao="Registre o primeiro risco do projeto para receber uma recomendação de plano de contingência."
            acao={
              meusProjetos.length > 0 && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogoAberto(true)}>
                  Cadastrar risco
                </Button>
              )
            }
          />
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {riscosFiltrados.map((risco) => (
            <Grid item xs={12} md={6} xl={4} key={risco.id}>
              <CartaoRisco
                risco={risco}
                projeto={projetoPorId.get(risco.id_projeto)}
                recomendacao={ultimaRecomendacaoPorRisco.get(risco.id)}
                aoAbrir={() => navigate(`/gerente/riscos/${risco.id}/recomendacao`)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <DialogoNovoRisco
        aberto={dialogoAberto}
        projetos={meusProjetos}
        projetoInicial={filtroProjeto}
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

function CartaoRisco({ risco, projeto, recomendacao, aoAbrir }) {
  const nivel = nivelSeveridade(risco.probabilidade, risco.impacto);
  const fase = FASES_PROJETO.find((f) => f.value === risco.fase_projeto);

  return (
    <Paper
      onClick={aoAbrir}
      sx={{
        p: 2,
        height: "100%",
        cursor: "pointer",
        borderLeft: `5px solid ${CORES_SEVERIDADE[nivel]}`,
        transition: "transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
        "&:hover": { transform: "translateY(-2px)", boxShadow: 4, borderColor: "primary.main" },
        display: "flex",
        flexDirection: "column",
        gap: 1.2,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ lineHeight: 1.25 }}>
            {risco.titulo}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {projeto?.nome ?? "—"} · {new Date(risco.criado_em).toLocaleDateString("pt-BR")}
          </Typography>
        </Box>
        <ChipStatus status={risco.status} />
      </Box>

      <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
        <ChipCategoria categoria={risco.categoria} />
        <ChipSeveridade probabilidade={risco.probabilidade} impacto={risco.impacto} />
        <ChipUrgencia urgencia={risco.urgencia} />
        {fase && (
          <Tooltip title={`Risco identificado na fase de ${fase.label.toLowerCase()} do projeto`}>
            <Chip size="small" variant="outlined" icon={<TimelineIcon sx={{ fontSize: 14 }} />} label={fase.label} />
          </Tooltip>
        )}
      </Stack>

      <Typography variant="caption" color="text.secondary">
        Probabilidade {rotulo(PROBABILIDADES, risco.probabilidade).toLowerCase()} · impacto{" "}
        {rotulo(IMPACTOS, risco.impacto).toLowerCase()} · orçamento{" "}
        {rotulo(ORCAMENTOS_IMPACTO, risco.orcamento_impacto).toLowerCase()}
      </Typography>

      <Divider sx={{ my: 0.2 }} />

      {recomendacao ? (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          <ShieldOutlinedIcon sx={{ fontSize: 18, color: "secondary.main", mt: 0.2 }} />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.3 }}>
              <Typography variant="caption" fontWeight={700} sx={{ color: "secondary.main" }}>
                Plano recomendado
              </Typography>
              <ChipAceite aceita={recomendacao.aceita} />
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {recomendacao.plano.descricao}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
          Nenhuma recomendação gerada ainda — abra o risco para gerar.
        </Typography>
      )}
    </Paper>
  );
}

function SecaoFormulario({ titulo, descricao, children }) {
  return (
    <Box>
      <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: 1 }}>
        {titulo}
      </Typography>
      {descricao && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.2 }}>
          {descricao}
        </Typography>
      )}
      <Grid container spacing={2}>
        {children}
      </Grid>
    </Box>
  );
}

function CampoSelect({ label, value, onChange, opcoes, renderOpcao, ...props }) {
  return (
    <TextField select fullWidth label={label} value={value} onChange={(e) => onChange(e.target.value)} required {...props}>
      {opcoes.map((opcao) => (
        <MenuItem key={opcao.value} value={opcao.value}>
          {renderOpcao ? renderOpcao(opcao) : opcao.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

function IconeProgressoFase({ progresso }) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, mr: 1.2 }}>
      <Box sx={{ width: 44, height: 6, borderRadius: 999, bgcolor: "#262D3B", overflow: "hidden" }}>
        <Box sx={{ width: `${progresso}%`, height: "100%", bgcolor: "primary.main" }} />
      </Box>
    </Box>
  );
}

function DialogoNovoRisco({ aberto, projetos, projetoInicial, aoFechar, aoCriar }) {
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [probabilidade, setProbabilidade] = useState("");
  const [impacto, setImpacto] = useState("");
  const [orcamentoImpacto, setOrcamentoImpacto] = useState("");
  const [urgencia, setUrgencia] = useState("");
  const [faseProjeto, setFaseProjeto] = useState("");
  const [idProjeto, setIdProjeto] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setIdProjeto(projetoInicial || (projetos.length === 1 ? projetos[0].id : ""));
      setErro("");
    }
  }, [aberto, projetoInicial, projetos]);

  const previaSeveridade = probabilidade && impacto ? nivelSeveridade(probabilidade, impacto) : null;

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await aoCriar({
        titulo,
        categoria,
        probabilidade,
        impacto,
        orcamento_impacto: orcamentoImpacto,
        urgencia,
        fase_projeto: faseProjeto,
        id_projeto: idProjeto,
      });
    } catch (e) {
      setErro(e.response?.data?.detail ?? "Não foi possível cadastrar o risco.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={aberto} onClose={aoFechar} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={aoEnviar}>
        <DialogTitle sx={{ pb: 0.5 }}>Novo risco</DialogTitle>
        <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 1 }}>
          Todos os campos alimentam o modelo de recomendação.
        </Typography>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
          {erro && <Alert severity="error">{erro}</Alert>}

          <SecaoFormulario titulo="Identificação do risco" descricao="O que pode acontecer e de que natureza é o risco.">
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Título"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
                autoFocus
                placeholder="Ex.: Indisponibilidade do fornecedor de nuvem"
              />
            </Grid>
            <Grid item xs={12}>
              <CampoSelect label="Categoria (PMBOK)" value={categoria} onChange={setCategoria} opcoes={CATEGORIAS} />
            </Grid>
          </SecaoFormulario>

          <SecaoFormulario titulo="Avaliação" descricao="Dimensões que definem a severidade do risco.">
            <Grid item xs={6}>
              <CampoSelect label="Probabilidade" value={probabilidade} onChange={setProbabilidade} opcoes={PROBABILIDADES} />
            </Grid>
            <Grid item xs={6}>
              <CampoSelect label="Impacto" value={impacto} onChange={setImpacto} opcoes={IMPACTOS} />
            </Grid>
            <Grid item xs={6}>
              <CampoSelect
                label="Impacto no orçamento"
                value={orcamentoImpacto}
                onChange={setOrcamentoImpacto}
                opcoes={ORCAMENTOS_IMPACTO}
              />
            </Grid>
            <Grid item xs={6}>
              <CampoSelect label="Urgência (proximidade)" value={urgencia} onChange={setUrgencia} opcoes={URGENCIAS} />
            </Grid>
            {previaSeveridade && (
              <Grid item xs={12}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Severidade na matriz:
                  </Typography>
                  <ChipSeveridade probabilidade={probabilidade} impacto={impacto} />
                </Box>
              </Grid>
            )}
          </SecaoFormulario>

          <SecaoFormulario
            titulo="Contexto do projeto"
            descricao="Onde o risco foi identificado. A fase influencia o plano adequado: riscos descobertos tarde deixam menos margem de reação."
          >
            <Grid item xs={12} sm={6}>
              <CampoSelect label="Projeto" value={idProjeto} onChange={setIdProjeto} opcoes={projetos.map((p) => ({ value: p.id, label: p.nome }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CampoSelect
                label="Fase do projeto"
                value={faseProjeto}
                onChange={setFaseProjeto}
                opcoes={FASES_PROJETO}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TimelineIcon fontSize="small" sx={{ color: "primary.main" }} />
                    </InputAdornment>
                  ),
                }}
                renderOpcao={(fase) => (
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <IconeProgressoFase progresso={fase.progresso} />
                    {fase.label}
                  </Box>
                )}
              />
            </Grid>
          </SecaoFormulario>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={aoFechar}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={enviando}>
            {enviando ? "Cadastrando..." : "Cadastrar e ver recomendação"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
