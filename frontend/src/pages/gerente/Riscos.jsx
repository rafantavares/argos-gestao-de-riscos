import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import SearchIcon from "@mui/icons-material/Search";
import SortIcon from "@mui/icons-material/Sort";
import GridViewIcon from "@mui/icons-material/GridView";
import TableRowsIcon from "@mui/icons-material/TableRows";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useAviso, useConfirmacao } from "../../contexts/FeedbackContext";
import ViewKanbanOutlinedIcon from "@mui/icons-material/ViewKanbanOutlined";
import MiniMatriz from "../../components/MiniMatriz";
import QuadroRiscos from "../../components/QuadroRiscos";
import TimelineIcon from "@mui/icons-material/Timeline";
import {
  projetos as servicoProjetos,
  recomendacoes as servicoRecomendacoes,
  riscos as servicoRiscos,
} from "../../services/api";
import {
  AREAS_AFETADAS,
  CATEGORIAS,
  FAIXAS_EXPOSICAO,
  FASES_PROJETO,
  IMPACTOS,
  ORCAMENTOS_IMPACTO,
  PROBABILIDADES,
  STATUS_RISCO,
  URGENCIAS,
  faixaExposicao,
  pontuacaoSeveridade,
  precisaReavaliar,
  rotulo,
} from "../../constants";
import { ChipAceite, ChipArea, ChipReavaliar, ChipSeveridade, ChipStatus, ChipUrgencia, Marcador } from "../../components/Badges";
import EstadoVazio from "../../components/EstadoVazio";
import { exportarCsv } from "../../utils/exportarCsv";

const COLUNAS_CSV = [
  { rotulo: "Índice", valor: (r) => r.indice },
  { rotulo: "Categoria (área afetada)", valor: (r) => rotulo(AREAS_AFETADAS, r.area_afetada) },
  { rotulo: "Risco", valor: (r) => r.titulo },
  { rotulo: "Descrição do impacto", valor: (r) => r.descricao_impacto },
  { rotulo: "Impacto", valor: (r) => `${r.impacto} - ${rotulo(IMPACTOS, r.impacto)}` },
  { rotulo: "Probabilidade", valor: (r) => `${r.probabilidade} - ${rotulo(PROBABILIDADES, r.probabilidade)}` },
  { rotulo: "Exposição", valor: (r) => r.exposicao },
  { rotulo: "Avaliação da exposição", valor: (r) => r.avaliacao_exposicao },
  { rotulo: "Mitigação", valor: (r) => r.mitigacao ?? "" },
  { rotulo: "Contingência", valor: (r) => r.contingencia ?? "" },
  { rotulo: "Gatilho", valor: (r) => r.gatilho ?? "" },
  { rotulo: "Grupo PMBOK", valor: (r) => rotulo(CATEGORIAS, r.categoria) },
  { rotulo: "Orçamento", valor: (r) => rotulo(ORCAMENTOS_IMPACTO, r.orcamento_impacto) },
  { rotulo: "Urgência", valor: (r) => rotulo(URGENCIAS, r.urgencia) },
  { rotulo: "Fase do projeto", valor: (r) => rotulo(FASES_PROJETO, r.fase_projeto) },
  { rotulo: "Status", valor: (r) => rotulo(STATUS_RISCO, r.status) },
];

// ---------- filtros e ordenação da lista ----------

const ORDENACOES = [
  { value: "exposicao_desc", label: "Maior exposição" },
  { value: "exposicao_asc", label: "Menor exposição" },
  { value: "recentes", label: "Mais recentes" },
  { value: "antigos", label: "Mais antigos" },
  { value: "atualizados", label: "Atualizados recentemente" },
  { value: "urgencia", label: "Maior urgência" },
  { value: "indice", label: "Índice (R01, R02...)" },
  { value: "titulo", label: "Título (A–Z)" },
];

const SITUACOES_RECOMENDACAO = [
  { value: "pendente", label: "Aguardando decisão" },
  { value: "aceita", label: "Plano aceito" },
  { value: "rejeitada", label: "Plano rejeitado" },
  { value: "sem", label: "Sem recomendação" },
];

const PESO_URGENCIA = { alta: 3, media: 2, baixa: 1 };

const FILTROS_PADRAO = {
  busca: "",
  ordenacao: "exposicao_desc",
  projeto: "",
  gravidade: "",
  status: "ativos",
  area: "",
  recomendacao: "",
  celula: "", // "probabilidade-impacto", vindo do clique na matriz de risco
};

// Os filtros ficam na sessão do navegador: ao abrir um risco e voltar, a lista
// continua como estava.
const CHAVE_FILTROS = "argos_filtros_riscos";

function lerFiltros() {
  try {
    return { ...FILTROS_PADRAO, ...JSON.parse(sessionStorage.getItem(CHAVE_FILTROS) ?? "{}") };
  } catch {
    return FILTROS_PADRAO;
  }
}

// Texto dos filtros ativos, para o cabeçalho do relatório em PDF.
function descreverFiltros(filtros, projetos) {
  const partes = [];
  if (filtros.busca.trim()) partes.push(`busca "${filtros.busca.trim()}"`);
  if (filtros.projeto) partes.push(`projeto ${projetos.find((p) => p.id === filtros.projeto)?.nome ?? ""}`);
  if (filtros.gravidade) partes.push(`gravidade ${filtros.gravidade}`);
  const status = { "": "todos os status", ativos: "ativos", reavaliar: "reavaliação pendente", arquivados: "arquivados" };
  partes.push(`status: ${status[filtros.status] ?? rotulo(STATUS_RISCO, filtros.status)}`);
  if (filtros.area) partes.push(`área ${rotulo(AREAS_AFETADAS, filtros.area)}`);
  if (filtros.recomendacao) partes.push(`recomendação: ${rotulo(SITUACOES_RECOMENDACAO, filtros.recomendacao)}`);
  if (filtros.celula) partes.push(`matriz P${filtros.celula.replace("-", " × I")}`);
  partes.push(`ordenado por ${rotulo(ORDENACOES, filtros.ordenacao).toLowerCase()}`);
  return partes.join(" · ");
}

function normalizar(texto) {
  return (texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function situacaoRecomendacao(rec) {
  if (!rec) return "sem";
  if (rec.aceita === null) return "pendente";
  return rec.aceita ? "aceita" : "rejeitada";
}

const COMPARADORES = {
  exposicao_desc: (a, b) => b.exposicao - a.exposicao,
  exposicao_asc: (a, b) => a.exposicao - b.exposicao,
  recentes: (a, b) => new Date(b.criado_em) - new Date(a.criado_em),
  antigos: (a, b) => new Date(a.criado_em) - new Date(b.criado_em),
  atualizados: (a, b) => new Date(b.atualizado_em) - new Date(a.atualizado_em),
  urgencia: (a, b) => (PESO_URGENCIA[b.urgencia] ?? 0) - (PESO_URGENCIA[a.urgencia] ?? 0) || b.exposicao - a.exposicao,
  indice: (a, b) => a.indice.localeCompare(b.indice, "pt-BR", { numeric: true }),
  titulo: (a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"),
};

function BarraFiltros({ filtros, alterar, limpar, projetos, total, visiveis }) {
  const campo = (nome) => ({
    value: filtros[nome],
    onChange: (e) => alterar(nome, e.target.value),
    size: "small",
    fullWidth: true,
    // Mostra "Todos"/"Todas" em vez de deixar o campo vazio.
    SelectProps: { displayEmpty: true },
    InputLabelProps: { shrink: true },
  });
  const ativos = Object.keys(FILTROS_PADRAO).filter(
    (k) => k !== "ordenacao" && filtros[k] !== FILTROS_PADRAO[k]
  ).length;
  const alterado = ativos > 0 || filtros.ordenacao !== FILTROS_PADRAO.ordenacao;

  return (
    <Paper sx={{ p: 2, mb: 2.5 }}>
      <TextField
        {...campo("busca")}
        placeholder="Buscar por título, índice (ex.: R03) ou descrição"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          mt: 2,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" },
        }}
      >
        <Box>
          <TextField
            select
            label="Ordenar por"
            {...campo("ordenacao")}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SortIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          >
            {ORDENACOES.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <Box>
          <TextField select label="Projeto" {...campo("projeto")}>
            <MenuItem value="">Todos os projetos</MenuItem>
            {projetos.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.nome}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <Box>
          <TextField select label="Gravidade" {...campo("gravidade")}>
            <MenuItem value="">Todas</MenuItem>
            {FAIXAS_EXPOSICAO.map((f) => (
              <MenuItem key={f.label} value={f.label}>
                <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                  <Marcador cor={f.cor} />
                  {f.label}
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <Box>
          <TextField select label="Status" {...campo("status")}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="ativos">Ativos (sem encerrados)</MenuItem>
            <MenuItem value="reavaliar">Reavaliação pendente</MenuItem>
            <MenuItem value="arquivados">Arquivados</MenuItem>
            {STATUS_RISCO.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <Box>
          <TextField select label="Área afetada" {...campo("area")}>
            <MenuItem value="">Todas</MenuItem>
            {AREAS_AFETADAS.map((a) => (
              <MenuItem key={a.value} value={a.value}>
                {a.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <Box>
          <TextField select label="Recomendação" {...campo("recomendacao")}>
            <MenuItem value="">Todas</MenuItem>
            {SITUACOES_RECOMENDACAO.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1.5, mt: 1.5 }}>
        {filtros.celula && (
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            label={`Matriz: probabilidade ${filtros.celula.split("-")[0]} × impacto ${filtros.celula.split("-")[1]}`}
            onDelete={() => alterar("celula", "")}
            sx={{ mr: "auto" }}
          />
        )}
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
          {visiveis === total ? `${total} riscos` : `${visiveis} de ${total} riscos`}
        </Typography>
        <Button size="small" onClick={limpar} disabled={!alterado}>
          Limpar{ativos > 0 ? ` (${ativos})` : ""}
        </Button>
      </Box>
    </Paper>
  );
}

export default function Riscos() {
  const [riscos, setRiscos] = useState([]);
  const [meusProjetos, setMeusProjetos] = useState([]);
  const [recomendacoes, setRecomendacoes] = useState([]);
  const [filtros, setFiltros] = useState(lerFiltros);
  const [vista, setVista] = useState(() => {
    try {
      return localStorage.getItem("argos_vista_riscos") || "cartoes";
    } catch {
      return "cartoes";
    }
  });
  const avisar = useAviso();
  const confirmar = useConfirmacao();
  const filtroProjeto = filtros.projeto;
  const [carregando, setCarregando] = useState(true);
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const navigate = useNavigate();
  const localizacao = useLocation();
  const [rascunho, setRascunho] = useState(null);

  // Vindo do Assistente IA: abre o "Novo risco" pré-preenchido com a sugestão.
  useEffect(() => {
    if (localizacao.state?.celula) {
      setFiltros({ ...FILTROS_PADRAO, celula: localizacao.state.celula });
      navigate(localizacao.pathname, { replace: true, state: null });
    }
    if (localizacao.state?.rascunho) {
      setRascunho(localizacao.state.rascunho);
      setDialogoAberto(true);
      navigate(localizacao.pathname, { replace: true, state: null });
    }
  }, [localizacao.state, localizacao.pathname, navigate]);

  async function carregar() {
    setCarregando(true);
    const [listaRiscos, listaProjetos, listaRecomendacoes] = await Promise.all([
      servicoRiscos.listarMeus(true),
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

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAVE_FILTROS, JSON.stringify(filtros));
    } catch {
      // sem sessionStorage: os filtros só não são lembrados
    }
  }, [filtros]);

  // Arrastar no quadro muda o status (com o mesmo histórico da tela do risco).
  async function mudarStatus(risco, statusNovo) {
    if (
      statusNovo === "encerrado" &&
      !(await confirmar({
        titulo: `Encerrar ${risco.indice}?`,
        mensagem: "Encerrado é o estado final: o status não poderá mais ser alterado nem o risco reavaliado.",
        confirmar: "Encerrar",
        perigo: true,
      }))
    ) {
      return;
    }
    try {
      const atualizado = await servicoRiscos.atualizarStatus(risco.id, statusNovo, "Movido no quadro de riscos");
      setRiscos((atuais) => atuais.map((r) => (r.id === atualizado.id ? atualizado : r)));
      avisar(`${risco.indice} → ${rotulo(STATUS_RISCO, statusNovo)}`);
    } catch (e) {
      const detalhe = e.response?.data?.detail;
      avisar(typeof detalhe === "string" ? detalhe : "Não foi possível mudar o status.", "error");
    }
  }

  function alterarFiltro(nome, valor) {
    setFiltros((atuais) => ({ ...atuais, [nome]: valor }));
  }

  const riscosFiltrados = useMemo(() => {
    const termo = normalizar(filtros.busca.trim());
    // No quadro, cada coluna já é um status: o filtro de status só vale para "Arquivados".
    const status = vista === "quadro" && filtros.status !== "arquivados" ? "" : filtros.status;
    const lista = riscos.filter((r) => {
      if ((status === "arquivados") !== Boolean(r.arquivado)) return false;
      if (filtros.projeto && r.id_projeto !== filtros.projeto) return false;
      if (filtros.gravidade && r.avaliacao_exposicao !== filtros.gravidade) return false;
      if (status === "ativos" && r.status === "encerrado") return false;
      if (status === "reavaliar" && !precisaReavaliar(r)) return false;
      if (status && !["ativos", "reavaliar", "arquivados"].includes(status) && r.status !== status) {
        return false;
      }
      if (filtros.area && r.area_afetada !== filtros.area) return false;
      if (filtros.celula && `${r.probabilidade}-${r.impacto}` !== filtros.celula) return false;
      if (
        filtros.recomendacao &&
        situacaoRecomendacao(ultimaRecomendacaoPorRisco.get(r.id)) !== filtros.recomendacao
      ) {
        return false;
      }
      if (termo && !normalizar(`${r.indice} ${r.titulo} ${r.descricao_impacto}`).includes(termo)) return false;
      return true;
    });
    const comparar = COMPARADORES[filtros.ordenacao] ?? COMPARADORES.exposicao_desc;
    // Desempate estável: mais recente primeiro.
    return lista.sort((a, b) => comparar(a, b) || new Date(b.criado_em) - new Date(a.criado_em));
  }, [riscos, filtros, ultimaRecomendacaoPorRisco, vista]);

  return (
    <Box>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}
      >
        <Box sx={{ mr: "auto" }}>
          <Typography variant="body2" color="text.secondary">
            Clique em um risco para ver a recomendação do modelo, o registro e a evolução da exposição.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={vista}
            onChange={(_, nova) => {
              if (!nova) return;
              setVista(nova);
              try {
                localStorage.setItem("argos_vista_riscos", nova);
              } catch {
                // sem localStorage: a preferência só não é lembrada
              }
            }}
          >
            <ToggleButton value="cartoes" aria-label="Ver em cartões">
              <Tooltip title="Cartões">
                <GridViewIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="quadro" aria-label="Ver em quadro">
              <Tooltip title="Quadro (arraste para mudar o status)">
                <ViewKanbanOutlinedIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="tabela" aria-label="Ver em tabela">
              <Tooltip title="Tabela">
                <TableRowsIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={riscosFiltrados.length === 0}
            onClick={() => exportarCsv("riscos.csv", COLUNAS_CSV, riscosFiltrados)}
          >
            Exportar CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdfIcon />}
            disabled={riscosFiltrados.length === 0}
            onClick={() =>
              navigate("/gerente/relatorio", {
                state: { ids: riscosFiltrados.map((r) => r.id), filtros: descreverFiltros(filtros, meusProjetos) },
              })
            }
          >
            Relatório PDF
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

      <BarraFiltros
        filtros={filtros}
        alterar={alterarFiltro}
        limpar={() => setFiltros(FILTROS_PADRAO)}
        projetos={meusProjetos}
        total={riscos.filter((r) => !r.arquivado).length}
        visiveis={riscosFiltrados.length}
      />

      {!carregando && meusProjetos.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Você ainda não está vinculado a nenhum projeto. Peça a um admin para te vincular antes de
          cadastrar riscos.
        </Alert>
      )}

      {!carregando && riscosFiltrados.length === 0 ? (
        <Paper>
          <EstadoVazio
            titulo={riscos.length > 0 ? "Nenhum risco com esses filtros" : "Nenhum risco cadastrado ainda"}
            descricao={
              riscos.length > 0
                ? "Ajuste ou limpe os filtros para ver os outros riscos."
                : "Registre o primeiro risco do projeto para receber uma recomendação de plano de contingência."
            }
            acao={
              riscos.length > 0 ? (
                <Button variant="outlined" onClick={() => setFiltros(FILTROS_PADRAO)}>
                  Limpar filtros
                </Button>
              ) : (
                meusProjetos.length > 0 && (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogoAberto(true)}>
                    Cadastrar risco
                  </Button>
                )
              )
            }
          />
        </Paper>
      ) : vista === "quadro" ? (
        <QuadroRiscos
          riscos={riscosFiltrados}
          projetoPorId={projetoPorId}
          aoAbrir={(risco) => navigate(`/gerente/riscos/${risco.id}/recomendacao`)}
          aoMudarStatus={mudarStatus}
        />
      ) : vista === "tabela" ? (
        <TabelaRiscos
          riscos={riscosFiltrados}
          projetoPorId={projetoPorId}
          recomendacaoPorRisco={ultimaRecomendacaoPorRisco}
          aoAbrir={(risco) => navigate(`/gerente/riscos/${risco.id}/recomendacao`)}
        />
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
        projetoInicial={rascunho?.id_projeto || filtroProjeto}
        rascunho={rascunho}
        aoFechar={() => {
          setDialogoAberto(false);
          setRascunho(null);
        }}
        aoCriar={async (dados) => {
          const risco = await servicoRiscos.criar(dados);
          avisar(`Risco ${risco.indice} cadastrado.`);
          setDialogoAberto(false);
          carregar();
          navigate(`/gerente/riscos/${risco.id}/recomendacao`);
        }}
      />
    </Box>
  );
}

// Visão compacta em tabela (mesma ordenação e filtros dos cartões).
function TabelaRiscos({ riscos, projetoPorId, recomendacaoPorRisco, aoAbrir }) {
  return (
    <Paper sx={{ overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Índice</TableCell>
            <TableCell>Risco</TableCell>
            <TableCell>Projeto</TableCell>
            <TableCell>Área</TableCell>
            <TableCell>Exposição</TableCell>
            <TableCell>Urgência</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Plano</TableCell>
            <TableCell>Cadastro</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {riscos.map((risco) => {
            const rec = recomendacaoPorRisco.get(risco.id);
            return (
              <TableRow
                key={risco.id}
                hover
                tabIndex={0}
                aria-label={`Abrir ${risco.indice} ${risco.titulo}`}
                onClick={() => aoAbrir(risco)}
                onKeyDown={(e) => e.key === "Enter" && aoAbrir(risco)}
                sx={{ cursor: "pointer" }}
              >
                <TableCell sx={{ color: "primary.main", fontWeight: 600 }}>{risco.indice}</TableCell>
                <TableCell sx={{ maxWidth: 320 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {risco.titulo}
                  </Typography>
                  {precisaReavaliar(risco) && (
                    <Box sx={{ mt: 0.5 }}>
                      <ChipReavaliar />
                    </Box>
                  )}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{projetoPorId.get(risco.id_projeto)?.nome ?? "—"}</TableCell>
                <TableCell>
                  <ChipArea area={risco.area_afetada} />
                </TableCell>
                <TableCell>
                  <ChipSeveridade probabilidade={risco.probabilidade} impacto={risco.impacto} />
                </TableCell>
                <TableCell>
                  <ChipUrgencia urgencia={risco.urgencia} />
                </TableCell>
                <TableCell>
                  <ChipStatus status={risco.status} />
                </TableCell>
                <TableCell>{rec ? <ChipAceite aceita={rec.aceita} /> : "—"}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{new Date(risco.criado_em).toLocaleDateString("pt-BR")}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}

function CartaoRisco({ risco, projeto, recomendacao, aoAbrir }) {
  const fase = FASES_PROJETO.find((f) => f.value === risco.fase_projeto);

  return (
    <Paper
      onClick={aoAbrir}
      onKeyDown={(e) => e.key === "Enter" && aoAbrir()}
      tabIndex={0}
      role="link"
      aria-label={`Abrir ${risco.indice} ${risco.titulo}`}
      sx={{
        p: 2.25,
        height: "100%",
        cursor: "pointer",
        transition: "border-color 150ms ease",
        "&:hover": { borderColor: "var(--argos-borda-forte)" },
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ lineHeight: 1.25 }}>
            <Box component="span" sx={{ color: "primary.main", mr: 0.8 }}>
              {risco.indice}
            </Box>
            {risco.titulo}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
            {projeto?.nome ?? "—"} · {new Date(risco.criado_em).toLocaleDateString("pt-BR")}
          </Typography>
        </Box>
        <MiniMatriz probabilidade={risco.probabilidade} impacto={risco.impacto} />
      </Box>

      {/* Gravidade e situação primeiro; depois os atributos do registro. */}
      <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
        <ChipSeveridade probabilidade={risco.probabilidade} impacto={risco.impacto} />
        <ChipStatus status={risco.status} />
        {precisaReavaliar(risco) && <ChipReavaliar />}
        <ChipArea area={risco.area_afetada} />
        <ChipUrgencia urgencia={risco.urgencia} />
        {fase && (
          <Tooltip title={`Risco identificado na fase de ${fase.label.toLowerCase()} do projeto`}>
            <Chip size="small" variant="outlined" icon={<TimelineIcon sx={{ fontSize: 14 }} />} label={fase.label} />
          </Tooltip>
        )}
      </Stack>

      <Typography variant="caption" color="text.secondary">
        Probabilidade {risco.probabilidade} ({rotulo(PROBABILIDADES, risco.probabilidade).toLowerCase()}) · impacto{" "}
        {risco.impacto} ({rotulo(IMPACTOS, risco.impacto).toLowerCase()}) · orçamento{" "}
        {rotulo(ORCAMENTOS_IMPACTO, risco.orcamento_impacto).toLowerCase()}
      </Typography>

      <Divider sx={{ my: 0.2 }} />

      {recomendacao ? (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          <AutoAwesomeIcon sx={{ fontSize: 18, color: "secondary.main", mt: 0.2 }} />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.3 }}>
              <Typography variant="caption" fontWeight={600} sx={{ color: "secondary.main" }}>
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
          Nenhuma recomendação gerada ainda. Abra o risco para gerar.
        </Typography>
      )}
    </Paper>
  );
}

function SecaoFormulario({ titulo, descricao, children }) {
  return (
    <Box>
      <Typography component="h3" variant="subtitle1">
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
      <Box sx={{ width: 44, height: 6, borderRadius: 999, bgcolor: "var(--argos-borda)", overflow: "hidden" }}>
        <Box sx={{ width: `${progresso}%`, height: "100%", bgcolor: "primary.main" }} />
      </Box>
    </Box>
  );
}

function CampoTexto({ label, value, onChange, ajuda, obrigatorio = false, linhas = 2, ...props }) {
  return (
    <TextField
      fullWidth
      multiline
      minRows={linhas}
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      helperText={ajuda}
      required={obrigatorio}
      {...props}
    />
  );
}

// Painel do assistente de IA: sugestão de área, riscos parecidos e auditoria de
// coerência entre a descrição do impacto e as notas.
function PainelAssistente({ analise, carregando, notasAtuais, aoUsarArea, aoAplicarNota, aoAplicarNotas }) {
  if (!analise && !carregando) return null;
  const {
    area_sugerida: areaSugerida,
    notas_sugeridas: notasSugeridas,
    similares = [],
    alertas_coerencia: alertas = [],
  } = analise ?? {};
  // Só mostra a previsão enquanto as notas digitadas forem diferentes dela.
  const mostrarNotas =
    notasSugeridas &&
    (Number(notasAtuais.probabilidade) !== notasSugeridas.probabilidade ||
      Number(notasAtuais.impacto) !== notasSugeridas.impacto);
  if (!carregando && !areaSugerida && !mostrarNotas && similares.length === 0 && alertas.length === 0) return null;

  return (
    <Paper
      variant="outlined"
      sx={{ p: 1.5, borderColor: "color-mix(in srgb, var(--argos-ia) 45%, transparent)", bgcolor: "color-mix(in srgb, var(--argos-ia) 6%, transparent)" }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 1 }}>
        <AutoAwesomeIcon sx={{ fontSize: 18, color: "secondary.main" }} />
        <Typography variant="caption" fontWeight={600} sx={{ color: "secondary.main" }}>
          Assistente de IA
        </Typography>
        {carregando && <CircularProgress size={12} />}
      </Box>
      <Stack spacing={1}>
        {areaSugerida && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="body2">
              Área sugerida: <strong>{rotulo(AREAS_AFETADAS, areaSugerida.area_afetada)}</strong>{" "}
              <Typography component="span" variant="caption" color="text.secondary">
                ({Math.round(areaSugerida.confianca * 100)}% de confiança · grupo PMBOK{" "}
                {rotulo(CATEGORIAS, areaSugerida.categoria).toLowerCase()})
              </Typography>
            </Typography>
            <Button size="small" onClick={() => aoUsarArea(areaSugerida.area_afetada)}>
              Usar
            </Button>
          </Box>
        )}
        {mostrarNotas && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="body2">
              Notas previstas pelo histórico: <strong>probabilidade {notasSugeridas.probabilidade}</strong> ·{" "}
              <strong>impacto {notasSugeridas.impacto}</strong>{" "}
              <Typography component="span" variant="caption" color="text.secondary">
                (com base em{" "}
                {notasSugeridas.referencias
                  .map((r) => `${r.indice} ${r.titulo} — ${r.projeto}, P${r.probabilidade}/I${r.impacto}`)
                  .join("; ")}
                )
              </Typography>
            </Typography>
            <Button size="small" onClick={() => aoAplicarNotas(notasSugeridas)}>
              Aplicar
            </Button>
          </Box>
        )}
        {similares.length > 0 && (
          <Alert severity="warning" icon={<ContentCopyIcon fontSize="small" />} sx={{ py: 0 }}>
            Já existe risco parecido neste projeto:{" "}
            {similares.map((s) => `${s.indice} — ${s.titulo} (${Math.round(s.similaridade * 100)}%)`).join("; ")}.
            Confira antes de cadastrar para evitar duplicidade.
          </Alert>
        )}
        {alertas.map((alerta) => (
          <Alert
            key={alerta.tipo}
            severity="warning"
            sx={{ py: 0 }}
            action={
              <Button
                size="small"
                color="inherit"
                onClick={() => aoAplicarNota(alerta.tipo.startsWith("probabilidade") ? "probabilidade" : "impacto", alerta.valor_sugerido)}
              >
                Aplicar {alerta.valor_sugerido}
              </Button>
            }
          >
            {alerta.mensagem}
          </Alert>
        ))}
      </Stack>
    </Paper>
  );
}

const ATRASO_ASSISTENTE_MS = 600;

function DialogoNovoRisco({ aberto, projetos, projetoInicial, rascunho, aoFechar, aoCriar }) {
  const [titulo, setTitulo] = useState("");
  const [descricaoImpacto, setDescricaoImpacto] = useState("");
  const [areaAfetada, setAreaAfetada] = useState("");
  const [probabilidade, setProbabilidade] = useState("");
  const [impacto, setImpacto] = useState("");
  const [orcamentoImpacto, setOrcamentoImpacto] = useState("");
  const [urgencia, setUrgencia] = useState("");
  const [faseProjeto, setFaseProjeto] = useState("");
  const [mitigacao, setMitigacao] = useState("");
  const [contingencia, setContingencia] = useState("");
  const [gatilho, setGatilho] = useState("");
  const [idProjeto, setIdProjeto] = useState("");
  const [analise, setAnalise] = useState(null);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setIdProjeto(projetoInicial || (projetos.length === 1 ? projetos[0].id : ""));
      setErro("");
      setAnalise(null);
      if (rascunho) {
        setTitulo(rascunho.titulo || "");
        setDescricaoImpacto(rascunho.descricao_impacto || "");
        setAreaAfetada(rascunho.area_afetada || "");
        setProbabilidade(rascunho.probabilidade || "");
        setImpacto(rascunho.impacto || "");
        setMitigacao(rascunho.mitigacao || "");
        setContingencia(rascunho.contingencia || "");
        setGatilho(rascunho.gatilho || "");
      }
    }
  }, [aberto, projetoInicial, projetos, rascunho]);

  // Consulta o assistente enquanto o gerente digita (com pequena espera para
  // não chamar a API a cada tecla).
  useEffect(() => {
    if (!aberto || !idProjeto || titulo.trim().length < 3) {
      setAnalise(null);
      return undefined;
    }
    let cancelado = false;
    const temporizador = setTimeout(async () => {
      setAnalisando(true);
      try {
        const resposta = await servicoRiscos.assistente({
          id_projeto: idProjeto,
          titulo,
          descricao_impacto: descricaoImpacto,
          area_afetada: areaAfetada || undefined,
          probabilidade: probabilidade || undefined,
          impacto: impacto || undefined,
        });
        if (!cancelado) setAnalise(resposta);
      } catch {
        if (!cancelado) setAnalise(null);
      } finally {
        if (!cancelado) setAnalisando(false);
      }
    }, ATRASO_ASSISTENTE_MS);
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [aberto, idProjeto, titulo, descricaoImpacto, areaAfetada, probabilidade, impacto]);

  const exposicao = probabilidade && impacto ? pontuacaoSeveridade(probabilidade, impacto) : null;
  const faixa = exposicao ? faixaExposicao(exposicao) : null;
  const grupoPmbok = areaAfetada ? AREAS_AFETADAS.find((a) => a.value === areaAfetada)?.categoria : null;

  function aplicarNota(campo, valor) {
    if (campo === "probabilidade") setProbabilidade(valor);
    else setImpacto(valor);
  }

  // Preenche só o que o gerente ainda não escreveu.
  function aplicarSugestoes() {
    const sugestao = analise?.sugestao_plano;
    if (!sugestao) return;
    if (!mitigacao) setMitigacao(sugestao.mitigacao);
    if (!contingencia) setContingencia(sugestao.contingencia);
    if (!gatilho) setGatilho(sugestao.gatilho);
  }

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await aoCriar({
        titulo,
        descricao_impacto: descricaoImpacto,
        area_afetada: areaAfetada,
        probabilidade,
        impacto,
        orcamento_impacto: orcamentoImpacto,
        urgencia,
        fase_projeto: faseProjeto,
        mitigacao: mitigacao || null,
        contingencia: contingencia || null,
        gatilho: gatilho || null,
        id_projeto: idProjeto,
        // Vindo do Assistente IA: guarda de qual conversa nasceu o risco.
        id_conversa_origem: rascunho?.id_conversa_origem ?? null,
      });
    } catch (e) {
      const detalhe = e.response?.data?.detail;
      setErro(typeof detalhe === "string" ? detalhe : "Não foi possível cadastrar o risco. Verifique os campos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={aberto} onClose={aoFechar} fullWidth maxWidth="md">
      <Box component="form" onSubmit={aoEnviar}>
        <DialogTitle sx={{ pb: 0.5 }}>Novo risco</DialogTitle>
        <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 1 }}>
          Registro no formato PMBOK / MR-MPS-SW. O identificador (R01, R02...) é gerado automaticamente.
        </Typography>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
          {erro && <Alert severity="error">{erro}</Alert>}

          <SecaoFormulario titulo="Identificação do risco" descricao="O que pode acontecer, onde e qual a consequência.">
            <Grid item xs={12} sm={6}>
              <CampoSelect
                label="Projeto"
                value={idProjeto}
                onChange={setIdProjeto}
                opcoes={projetos.map((p) => ({ value: p.id, label: p.nome }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CampoSelect
                label="Categoria (área afetada)"
                value={areaAfetada}
                onChange={setAreaAfetada}
                opcoes={AREAS_AFETADAS}
                helperText={grupoPmbok ? `Grupo PMBOK: ${rotulo(CATEGORIAS, grupoPmbok)}` : " "}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Risco (título)"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
                autoFocus
                placeholder="Ex.: Indisponibilidade do fornecedor de nuvem…"
              />
            </Grid>
            <Grid item xs={12}>
              <CampoTexto
                label="Descrição do impacto"
                value={descricaoImpacto}
                onChange={setDescricaoImpacto}
                obrigatorio
                ajuda="Consequência se o problema se concretizar."
                inputProps={{ minLength: 5, maxLength: 2000 }}
              />
            </Grid>
            <Grid item xs={12}>
              <PainelAssistente
                analise={analise}
                carregando={analisando}
                aoUsarArea={setAreaAfetada}
                notasAtuais={{ probabilidade, impacto }}
                aoAplicarNota={aplicarNota}
                aoAplicarNotas={(notas) => {
                  setProbabilidade(notas.probabilidade);
                  setImpacto(notas.impacto);
                }}
              />
            </Grid>
          </SecaoFormulario>

          <SecaoFormulario
            titulo="Avaliação"
            descricao="Impacto e probabilidade de 1 a 5. A exposição é o produto dos dois."
          >
            <Grid item xs={12} sm={6}>
              <CampoSelect
                label="Impacto"
                value={impacto}
                onChange={setImpacto}
                opcoes={IMPACTOS}
                renderOpcao={(o) => `${o.value} — ${o.label}`}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CampoSelect
                label="Probabilidade"
                value={probabilidade}
                onChange={setProbabilidade}
                opcoes={PROBABILIDADES}
                renderOpcao={(o) => `${o.value} — ${o.label}`}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, flexWrap: "wrap" }}>
                <Typography variant="caption" color="text.secondary">
                  Exposição (impacto × probabilidade):
                </Typography>
                {exposicao ? (
                  <ChipSeveridade probabilidade={probabilidade} impacto={impacto} />
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    preencha impacto e probabilidade
                  </Typography>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <CampoSelect
                label="Impacto no orçamento"
                value={orcamentoImpacto}
                onChange={setOrcamentoImpacto}
                opcoes={ORCAMENTOS_IMPACTO}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <CampoSelect label="Urgência (proximidade)" value={urgencia} onChange={setUrgencia} opcoes={URGENCIAS} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <CampoSelect
                label="Fase do projeto"
                value={faseProjeto}
                onChange={setFaseProjeto}
                opcoes={FASES_PROJETO}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TimelineIcon fontSize="small" sx={{ color: "text.secondary" }} />
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

          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 1 }}>
              <Box>
                <Typography component="h3" variant="subtitle1">
                  Tratamento
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.2 }}>
                  Opcional agora: ao aceitar o plano recomendado, os campos vazios são preenchidos e você só revisa.
                </Typography>
              </Box>
              <Tooltip title="Preenche os campos vazios a partir da área afetada e da exposição">
                <span>
                  <Button
                    size="small"
                    color="secondary"
                    variant="outlined"
                    startIcon={<AutoAwesomeIcon />}
                    disabled={!analise?.sugestao_plano}
                    onClick={aplicarSugestoes}
                  >
                    Sugerir com IA
                  </Button>
                </span>
              </Tooltip>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <CampoTexto
                  label="Mitigação (ação preventiva)"
                  value={mitigacao}
                  onChange={setMitigacao}
                  ajuda="O que fazer para tentar evitar o risco."
                />
              </Grid>
              <Grid item xs={12}>
                <CampoTexto
                  label="Contingência (ação reativa)"
                  value={contingencia}
                  onChange={setContingencia}
                  ajuda="O que fazer se o problema realmente acontecer."
                />
              </Grid>
              <Grid item xs={12}>
                <CampoTexto
                  label="Gatilho"
                  value={gatilho}
                  onChange={setGatilho}
                  ajuda="Evento, sintoma ou indicador que avisa a hora de acionar a contingência."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={aoFechar}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={enviando}>
            {enviando ? "Cadastrando…" : "Cadastrar e ver recomendação"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
