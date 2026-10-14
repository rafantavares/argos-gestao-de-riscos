import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Grid,
  IconButton,
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
  Tooltip,
  Typography,
} from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  projetos as servicoProjetos,
  recomendacoes as servicoRecomendacoes,
  riscos as servicoRiscos,
} from "../../services/api";
import MatrizRisco from "../../components/MatrizRisco";
import CartaoEstatistica from "../../components/CartaoEstatistica";
import EstadoVazio from "../../components/EstadoVazio";
import BarraConfianca from "../../components/BarraConfianca";
import { ChipCategoria, ChipSeveridade, ChipStatus, ChipUrgencia } from "../../components/Badges";
import { CATEGORIAS, CORES_CATEGORIA, CORES_SEVERIDADE, nivelSeveridade, pontuacaoSeveridade } from "../../constants";
import { tendenciaSemanal } from "../../utils/tendencias";

// Preferência do gerente de esconder a lista de ações (fica no navegador).
const CHAVE_ACOES_VISIVEIS = "argos_acoes_visiveis";
const ACOES_INICIAIS = 3;

function lerAcoesVisiveis() {
  try {
    return localStorage.getItem(CHAVE_ACOES_VISIVEIS) !== "nao";
  } catch {
    return true;
  }
}

export default function Dashboard() {
  const [riscos, setRiscos] = useState([]);
  const [meusProjetos, setMeusProjetos] = useState([]);
  const [recomendacoes, setRecomendacoes] = useState([]);
  const [respondendo, setRespondendo] = useState(null);
  const [filtroProjeto, setFiltroProjeto] = useState("");
  const [acoesVisiveis, setAcoesVisiveis] = useState(lerAcoesVisiveis);
  const [todasAcoes, setTodasAcoes] = useState(false);
  const navigate = useNavigate();

  async function carregar() {
    const [listaRiscos, listaProjetos, listaRecomendacoes] = await Promise.all([
      servicoRiscos.listarMeus(),
      servicoProjetos.meus(),
      servicoRecomendacoes.listarMinhas(),
    ]);
    setRiscos(listaRiscos);
    setMeusProjetos(listaProjetos);
    setRecomendacoes(listaRecomendacoes);
  }

  useEffect(() => {
    carregar();
  }, []);

  const riscoPorId = useMemo(() => new Map(riscos.map((r) => [r.id, r])), [riscos]);
  const projetoPorId = useMemo(() => new Map(meusProjetos.map((p) => [p.id, p])), [meusProjetos]);

  const riscosDoFiltro = filtroProjeto ? riscos.filter((r) => r.id_projeto === filtroProjeto) : riscos;

  const riscosAbertos = riscosDoFiltro.filter((r) => r.status !== "encerrado");
  const riscosCriticos = [...riscosAbertos]
    .sort(
      (a, b) =>
        pontuacaoSeveridade(b.probabilidade, b.impacto) - pontuacaoSeveridade(a.probabilidade, a.impacto) ||
        new Date(b.criado_em) - new Date(a.criado_em)
    )
    .slice(0, 5);

  const acoesPendentes = recomendacoes
    .filter((r) => r.aceita === null && riscoPorId.has(r.id_risco) && riscosDoFiltro.some((risco) => risco.id === r.id_risco))
    .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));

  const contagemPorCategoria = CATEGORIAS.map((c) => riscosDoFiltro.filter((r) => r.categoria === c.value).length);
  const contagemAlta = riscosDoFiltro.filter((r) => nivelSeveridade(r.probabilidade, r.impacto) === "alto").length;
  const tendenciaRiscos = useMemo(() => tendenciaSemanal(riscosDoFiltro), [riscosDoFiltro]);

  async function responder(recomendacao, aceita) {
    setRespondendo(recomendacao.id);
    try {
      await servicoRecomendacoes.responder(recomendacao.id, aceita);
      await carregar();
    } finally {
      setRespondendo(null);
    }
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Visão geral
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Exposição dos seus projetos e o que precisa da sua decisão.
          </Typography>
        </Box>
        {meusProjetos.length > 0 && (
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
        )}
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica titulo="Projetos vinculados" valor={meusProjetos.length} icone={<AccountTreeIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica
            titulo="Riscos cadastrados"
            valor={riscosDoFiltro.length}
            icone={<ReportProblemOutlinedIcon />}
            tendencia={tendenciaRiscos}
            cor="#FBBF24"
            rodape={`${contagemAlta} de severidade alta`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica
            titulo="Decisões pendentes"
            valor={acoesPendentes.length}
            icone={<PendingActionsIcon />}
            cor={acoesPendentes.length > 0 ? "#F87171" : "#4ADE80"}
            rodape="recomendações aguardando aceite"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Por categoria
            </Typography>
            <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
              {CATEGORIAS.map((c, i) => (
                <Box
                  key={c.value}
                  sx={{
                    px: 1.2,
                    py: 0.4,
                    borderRadius: 999,
                    bgcolor: `${CORES_CATEGORIA[c.value]}1A`,
                    border: `1px solid ${CORES_CATEGORIA[c.value]}55`,
                    color: CORES_CATEGORIA[c.value],
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {c.label} {contagemPorCategoria[i]}
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
              Matriz de risco
            </Typography>
            {riscos.length === 0 ? (
              <EstadoVazio compacto titulo="Cadastre um risco para ver a matriz preenchida." />
            ) : (
              <MatrizRisco riscos={riscosAbertos} aoClicarCelula={(p, i) => navigate("/gerente/riscos", { state: { celula: `${p}-${i}` } })} />
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ height: "100%" }}>
            <Box sx={{ px: 2, pt: 2, pb: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Riscos críticos
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Top 5 por severidade (probabilidade × impacto), excluindo riscos encerrados
              </Typography>
            </Box>
            {riscosCriticos.length === 0 ? (
              <EstadoVazio compacto titulo="Nenhum risco aberto" />
            ) : (
              <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {["#", "Risco", "Severidade", "Urgência", "Status", ""].map((cabecalho, i) => (
                      <TableCell
                        key={i}
                        sx={{ color: "text.secondary", fontWeight: 600, fontSize: 12, textTransform: "uppercase" }}
                      >
                        {cabecalho}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {riscosCriticos.map((risco, indice) => {
                    const nivel = nivelSeveridade(risco.probabilidade, risco.impacto);
                    return (
                      <TableRow
                        key={risco.id}
                        hover
                        sx={{ cursor: "pointer", "&:last-child td": { borderBottom: 0 } }}
                        onClick={() => navigate(`/gerente/riscos/${risco.id}/recomendacao`)}
                      >
                        <TableCell sx={{ width: 40 }}>
                          <Box
                            sx={{
                              width: 26,
                              height: 26,
                              borderRadius: "50%",
                              display: "grid",
                              placeItems: "center",
                              bgcolor: CORES_SEVERIDADE[nivel],
                              color: "#0B0E14",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            {indice + 1}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>
                          <Typography variant="body2" fontWeight={500} noWrap>
                            {risco.titulo}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                            {projetoPorId.get(risco.id_projeto)?.nome ?? "—"} · pontuação{" "}
                            {pontuacaoSeveridade(risco.probabilidade, risco.impacto)}/25
                          </Typography>
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
                        <TableCell align="right" sx={{ width: 40 }}>
                          <OpenInNewIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: acoesVisiveis ? 1.5 : 0 }}>
          <ShieldOutlinedIcon sx={{ color: "secondary.main" }} />
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Próximas ações recomendadas
              </Typography>
              {acoesPendentes.length > 0 && (
                <Chip size="small" label={acoesPendentes.length} color="secondary" variant="outlined" />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Planos de contingência sugeridos pelo modelo que aguardam sua decisão
            </Typography>
          </Box>
          <Button
            size="small"
            color="inherit"
            endIcon={acoesVisiveis ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => {
              const novo = !acoesVisiveis;
              setAcoesVisiveis(novo);
              try {
                localStorage.setItem(CHAVE_ACOES_VISIVEIS, novo ? "sim" : "nao");
              } catch {
                // sem localStorage: a preferência só não é lembrada
              }
            }}
            sx={{ color: "text.secondary", flexShrink: 0 }}
          >
            {acoesVisiveis ? "Esconder" : "Mostrar"}
          </Button>
        </Box>

        <Collapse in={acoesVisiveis} unmountOnExit>
        {acoesPendentes.length === 0 ? (
          <EstadoVazio
            compacto
            titulo="Nenhuma decisão pendente"
            descricao="Todas as recomendações geradas já foram aceitas ou rejeitadas."
          />
        ) : (
          <Stack spacing={1.5}>
            {(todasAcoes ? acoesPendentes : acoesPendentes.slice(0, ACOES_INICIAIS)).map((rec) => {
              const risco = riscoPorId.get(rec.id_risco);
              const ocupado = respondendo === rec.id;
              return (
                <Box
                  key={rec.id}
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderLeft: "4px solid #A78BFA",
                    bgcolor: "background.default",
                  }}
                >
                  <Box sx={{ flex: "1 1 260px", minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                      <Typography variant="body2" fontWeight={600}>
                        {risco.titulo}
                      </Typography>
                      <ChipCategoria categoria={risco.categoria} />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {rec.plano.descricao}
                    </Typography>
                    <Box sx={{ mt: 1, maxWidth: 260 }}>
                      <BarraConfianca confianca={rec.confianca} compacta />
                    </Box>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title="Aceitar plano">
                      <span>
                        <IconButton
                          color="success"
                          disabled={ocupado}
                          onClick={() => responder(rec, true)}
                          sx={{ border: "1px solid", borderColor: "success.main" }}
                        >
                          <CheckIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Rejeitar plano">
                      <span>
                        <IconButton
                          color="error"
                          disabled={ocupado}
                          onClick={() => responder(rec, false)}
                          sx={{ border: "1px solid", borderColor: "error.main" }}
                        >
                          <CloseIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Button size="small" onClick={() => navigate(`/gerente/riscos/${risco.id}/recomendacao`)}>
                      Detalhes
                    </Button>
                  </Stack>
                </Box>
              );
            })}
            {acoesPendentes.length > ACOES_INICIAIS && (
              <Button size="small" onClick={() => setTodasAcoes((todas) => !todas)} sx={{ alignSelf: "center" }}>
                {todasAcoes ? "Mostrar menos" : `Mostrar todas (${acoesPendentes.length})`}
              </Button>
            )}
          </Stack>
        )}
        </Collapse>
      </Paper>
    </Box>
  );
}
