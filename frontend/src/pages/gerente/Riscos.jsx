import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
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
  AREAS_AFETADAS,
  CATEGORIAS,
  FASES_PROJETO,
  IMPACTOS,
  ORCAMENTOS_IMPACTO,
  PROBABILIDADES,
  STATUS_RISCO,
  URGENCIAS,
  faixaExposicao,
  pontuacaoSeveridade,
  rotulo,
} from "../../constants";
import { ChipAceite, ChipArea, ChipSeveridade, ChipStatus, ChipUrgencia } from "../../components/Badges";
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
            Ordenados por exposição (impacto × probabilidade). Clique em um risco para ver a recomendação do modelo.
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
  const faixa = faixaExposicao(risco.exposicao);
  const fase = FASES_PROJETO.find((f) => f.value === risco.fase_projeto);

  return (
    <Paper
      onClick={aoAbrir}
      sx={{
        p: 2,
        height: "100%",
        cursor: "pointer",
        borderLeft: `5px solid ${faixa.cor}`,
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
            <Box component="span" sx={{ color: "primary.main", mr: 0.8 }}>
              {risco.indice}
            </Box>
            {risco.titulo}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {projeto?.nome ?? "—"} · {new Date(risco.criado_em).toLocaleDateString("pt-BR")}
          </Typography>
        </Box>
        <ChipStatus status={risco.status} />
      </Box>

      <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
        <ChipArea area={risco.area_afetada} />
        <ChipSeveridade probabilidade={risco.probabilidade} impacto={risco.impacto} />
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
      sx={{ p: 1.5, borderColor: "rgba(167, 139, 250, 0.45)", bgcolor: "rgba(167, 139, 250, 0.06)" }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 1 }}>
        <AutoAwesomeIcon sx={{ fontSize: 18, color: "secondary.main" }} />
        <Typography variant="caption" fontWeight={700} sx={{ color: "secondary.main", letterSpacing: 0.5 }}>
          ASSISTENTE DE IA
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

function DialogoNovoRisco({ aberto, projetos, projetoInicial, aoFechar, aoCriar }) {
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
    }
  }, [aberto, projetoInicial, projetos]);

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
                placeholder="Ex.: Indisponibilidade do fornecedor de nuvem"
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
                  <>
                    <Typography variant="h6" sx={{ lineHeight: 1 }}>
                      {exposicao}
                    </Typography>
                    <ChipSeveridade probabilidade={probabilidade} impacto={impacto} />
                  </>
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

          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 1 }}>
              <Box>
                <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: 1 }}>
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
            {enviando ? "Cadastrando..." : "Cadastrar e ver recomendação"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
