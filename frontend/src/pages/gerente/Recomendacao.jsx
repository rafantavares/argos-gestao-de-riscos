import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Fade,
  Grow,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EditNoteIcon from "@mui/icons-material/EditNote";
import ShieldIcon from "@mui/icons-material/Shield";
import { recomendacoes as servicoRecomendacoes, riscos as servicoRiscos } from "../../services/api";
import {
  CATEGORIAS,
  CORES_CATEGORIA,
  CORES_SEVERIDADE,
  FASES_PROJETO,
  IMPACTOS,
  NOMES_ALGORITMOS,
  ORCAMENTOS_IMPACTO,
  PROBABILIDADES,
  STATUS_RISCO,
  URGENCIAS,
  nivelSeveridade,
  rotulo,
} from "../../constants";
import BarraConfianca from "../../components/BarraConfianca";
import { ChipArea, ChipSeveridade, ChipStatus } from "../../components/Badges";

const CORES_NIVEL_TEXTO = { 1: "#4ADE80", 2: "#A3E635", 3: "#FBBF24", 4: "#FB923C", 5: "#F87171", baixa: "#4ADE80", baixo: "#4ADE80", media: "#FBBF24", medio: "#FBBF24", alta: "#F87171", alto: "#F87171" };

const ESCALA_PROB = { baixa: 1, media: 2, alta: 3 };
const ESCALA_IMP = { baixo: 1, medio: 2, alto: 3 };

// Frase explicativa montada a partir das features do risco e do nível do plano
// recomendado (mesmas regras de negócio que geraram o dataset de treino).
function explicarRecomendacao(risco, plano) {
  const produto = ESCALA_PROB[plano.probabilidade] * ESCALA_IMP[plano.impacto];
  const nivelPlano = produto <= 2 ? "baixo" : produto <= 4 ? "medio" : "alto";

  const ADJETIVO = { tecnico: "técnicos", organizacional: "organizacionais", externo: "externos", pessoal: "de pessoal" };
  const FASE = {
    iniciacao: "na iniciação",
    planejamento: "no planejamento",
    execucao: "na execução",
    encerramento: "no encerramento",
  };
  const RESPOSTA = {
    baixo: "ações preventivas de baixo custo, como monitoramento e revisões adicionais",
    medio: "planos de mitigação com realocação de recursos ou apoio externo",
    alto: "planos de resposta imediata, com mudanças estruturais no projeto",
  };

  const partes = [
    `Riscos ${ADJETIVO[risco.categoria]} de probabilidade ${risco.probabilidade} (${rotulo(PROBABILIDADES, risco.probabilidade).toLowerCase()}) e impacto ${risco.impacto} (${rotulo(IMPACTOS, risco.impacto).toLowerCase()})`,
  ];
  if (risco.urgencia === "alta") partes.push("com urgência alta");
  partes.push(`identificados ${FASE[risco.fase_projeto] ?? "no projeto"}`);

  let complemento = "";
  if (risco.urgencia === "alta" && ["execucao", "encerramento"].includes(risco.fase_projeto)) {
    complemento = " A urgência alta em fase avançada eleva o nível de resposta, pois há pouco tempo de reação.";
  } else if (risco.fase_projeto === "iniciacao" && risco.orcamento_impacto === "baixo") {
    complemento = " Identificado cedo e com baixa exposição financeira, o replanejamento ainda é barato.";
  } else if (risco.categoria === "externo" && risco.impacto >= 4 && risco.urgencia === "alta") {
    complemento = " Riscos externos iminentes de alto impacto exigem resposta contratual emergencial.";
  }

  return `${partes.join(", ")} tendem a exigir ${RESPOSTA[nivelPlano]}.${complemento}`;
}

export default function Recomendacao() {
  const { idRisco } = useParams();
  const navigate = useNavigate();
  const [risco, setRisco] = useState(null);
  const [recomendacao, setRecomendacao] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [novoStatus, setNovoStatus] = useState("");
  const [comentarioStatus, setComentarioStatus] = useState("");
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [confirmacao, setConfirmacao] = useState(null); // { aceita: bool }
  const [erro, setErro] = useState("");
  // Evita gerar duas recomendações quando o efeito roda duas vezes (StrictMode em dev).
  const carregandoRef = useRef(false);

  async function carregarHistorico() {
    setHistorico(await servicoRiscos.historico(idRisco));
  }

  async function carregar() {
    if (carregandoRef.current) return;
    carregandoRef.current = true;
    setCarregando(true);
    setErro("");
    try {
      const dadosRisco = await servicoRiscos.obter(idRisco);
      setRisco(dadosRisco);
      setNovoStatus(dadosRisco.status);
      await carregarHistorico();

      const existentes = await servicoRecomendacoes.listarPorRisco(idRisco);
      if (existentes.length > 0) {
        setRecomendacao(existentes[existentes.length - 1]);
      } else {
        setRecomendacao(await servicoRecomendacoes.gerar(idRisco));
      }
    } catch (e) {
      setErro(e.response?.data?.detail ?? "Não foi possível carregar a recomendação.");
    } finally {
      setCarregando(false);
      carregandoRef.current = false;
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idRisco]);

  async function responder(aceita) {
    setProcessando(true);
    setErro("");
    try {
      const atualizada = await servicoRecomendacoes.responder(recomendacao.id, aceita);
      setRecomendacao(atualizada);
      setConfirmacao({ aceita });
      // O aceite muda o status do risco no backend (em_tratamento).
      const riscoAtualizado = await servicoRiscos.obter(idRisco);
      setRisco(riscoAtualizado);
      setNovoStatus(riscoAtualizado.status);
    } catch (e) {
      setErro(e.response?.data?.detail ?? "Não foi possível registrar a resposta.");
    } finally {
      setProcessando(false);
    }
  }

  async function gerarNovaRecomendacao() {
    setProcessando(true);
    setErro("");
    try {
      setRecomendacao(await servicoRecomendacoes.gerar(idRisco));
    } catch (e) {
      setErro(e.response?.data?.detail ?? "Não foi possível gerar uma nova recomendação.");
    } finally {
      setProcessando(false);
    }
  }

  async function atualizarStatus() {
    setAtualizandoStatus(true);
    setErro("");
    try {
      const atualizado = await servicoRiscos.atualizarStatus(idRisco, novoStatus, comentarioStatus || undefined);
      setRisco(atualizado);
      setComentarioStatus("");
      await carregarHistorico();
    } catch (e) {
      setErro(e.response?.data?.detail ?? "Não foi possível atualizar o status.");
    } finally {
      setAtualizandoStatus(false);
    }
  }

  if (carregando) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, mt: 8 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Consultando o modelo de recomendação...
        </Typography>
      </Box>
    );
  }

  const nivel = risco ? nivelSeveridade(risco.probabilidade, risco.impacto) : null;

  return (
    <Box sx={{ maxWidth: 860 }}>
      <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => navigate("/gerente/riscos")} sx={{ mb: 1 }}>
        Voltar para riscos
      </Button>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 0.5 }}>
        Recomendação de plano de contingência
      </Typography>
      {risco && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {risco.indice} — {risco.titulo}
        </Typography>
      )}

      {erro && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {erro}
        </Alert>
      )}

      {/* Confirmação animada após a decisão */}
      {confirmacao && (
        <Grow in>
          <Paper
            sx={{
              p: 3,
              mb: 2,
              textAlign: "center",
              borderColor: confirmacao.aceita ? "success.main" : "warning.main",
              bgcolor: confirmacao.aceita ? "rgba(74, 222, 128, 0.08)" : "rgba(251, 191, 36, 0.08)",
            }}
          >
            {confirmacao.aceita ? (
              <CheckCircleIcon sx={{ fontSize: 56, color: "success.main" }} />
            ) : (
              <CancelIcon sx={{ fontSize: 56, color: "warning.main" }} />
            )}
            <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>
              {confirmacao.aceita ? "Plano aceito" : "Recomendação rejeitada"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {confirmacao.aceita
                ? "O risco passou para \"em tratamento\", o feedback foi incorporado ao treinamento do modelo e a contingência (plano aceito), a mitigação e o gatilho foram pré-preenchidos no registro do risco — revise e ajuste."
                : "O status do risco foi mantido. Você pode gerar uma nova recomendação a qualquer momento."}
            </Typography>
            <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 2 }}>
              <Button variant="contained" startIcon={<EditNoteIcon />} onClick={() => setConfirmacao(null)}>
                Revisar registro do risco
              </Button>
              <Button variant="outlined" onClick={() => navigate("/gerente/riscos")}>
                Voltar para riscos
              </Button>
            </Stack>
          </Paper>
        </Grow>
      )}

      {recomendacao && !confirmacao && (
        <Fade in>
          <Box>
            {/* Plano recomendado em destaque */}
            <Paper
              sx={{
                p: { xs: 2.5, md: 3.5 },
                mb: 2,
                position: "relative",
                overflow: "hidden",
                borderColor: "rgba(167, 139, 250, 0.45)",
                background:
                  "linear-gradient(135deg, rgba(167, 139, 250, 0.10) 0%, rgba(45, 212, 191, 0.06) 100%), #12161F",
              }}
            >
              <ShieldIcon
                sx={{ position: "absolute", right: -20, top: -20, fontSize: 180, color: "secondary.main", opacity: 0.06 }}
              />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "rgba(167, 139, 250, 0.18)",
                    color: "secondary.main",
                  }}
                >
                  <ShieldIcon />
                </Box>
                <Box>
                  <Typography variant="overline" sx={{ color: "secondary.main", fontWeight: 700, letterSpacing: 1 }}>
                    Plano recomendado
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    {NOMES_ALGORITMOS[recomendacao.algoritmo_usado] ?? recomendacao.algoritmo_usado} · acurácia{" "}
                    {(recomendacao.acuracia_momento * 100).toFixed(1)}% na validação cruzada
                  </Typography>
                </Box>
              </Box>

              <Typography
                variant="h5"
                sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, lineHeight: 1.35, mb: 3 }}
              >
                {recomendacao.plano.descricao}
              </Typography>

              <Box sx={{ mb: 3 }}>
                <BarraConfianca confianca={recomendacao.confianca} />
              </Box>

              {recomendacao.aceita === null && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={<CheckIcon />}
                    disabled={processando}
                    onClick={() => responder(true)}
                    sx={{ px: 4, py: 1.4, fontWeight: 700, fontSize: 15 }}
                  >
                    Aceitar plano
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="large"
                    startIcon={<CloseIcon />}
                    disabled={processando}
                    onClick={() => responder(false)}
                    sx={{ px: 4, py: 1.4, fontWeight: 700, fontSize: 15 }}
                  >
                    Rejeitar
                  </Button>
                </Stack>
              )}

              {recomendacao.aceita === true && (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  Recomendação aceita — esse par (risco, plano) foi incorporado ao histórico de treinamento
                  do modelo.
                </Alert>
              )}

              {recomendacao.aceita === false && (
                <Box>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Recomendação rejeitada. Gere uma nova para consultar o modelo outra vez.
                  </Alert>
                  <Button variant="outlined" startIcon={<AutoAwesomeIcon />} disabled={processando} onClick={gerarNovaRecomendacao}>
                    Gerar nova recomendação
                  </Button>
                </Box>
              )}
            </Paper>

            {/* Por que esta recomendação? */}
            {risco && (
              <Paper sx={{ p: 3, mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <AutoAwesomeIcon sx={{ color: "primary.main", fontSize: 20 }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Por que esta recomendação?
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
                  <ChipFeature rotulo="Grupo PMBOK" valor={rotulo(CATEGORIAS, risco.categoria)} cor={CORES_CATEGORIA[risco.categoria]} />
                  <ChipFeature rotulo="Probabilidade" valor={`${risco.probabilidade} · ${rotulo(PROBABILIDADES, risco.probabilidade)}`} cor={CORES_NIVEL_TEXTO[risco.probabilidade]} />
                  <ChipFeature rotulo="Impacto" valor={`${risco.impacto} · ${rotulo(IMPACTOS, risco.impacto)}`} cor={CORES_NIVEL_TEXTO[risco.impacto]} />
                  <ChipFeature rotulo="Orçamento" valor={rotulo(ORCAMENTOS_IMPACTO, risco.orcamento_impacto)} cor={CORES_NIVEL_TEXTO[risco.orcamento_impacto]} />
                  <ChipFeature rotulo="Urgência" valor={rotulo(URGENCIAS, risco.urgencia)} cor={CORES_NIVEL_TEXTO[risco.urgencia]} />
                  <ChipFeature rotulo="Fase" valor={rotulo(FASES_PROJETO, risco.fase_projeto)} cor="#2DD4BF" />
                  <ChipSeveridade probabilidade={risco.probabilidade} impacto={risco.impacto} />
                </Stack>
                <Typography variant="body1" sx={{ borderLeft: `3px solid ${CORES_SEVERIDADE[nivel]}`, pl: 2, py: 0.5 }}>
                  {explicarRecomendacao(risco, recomendacao.plano)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
                  O modelo foi treinado com exemplos rotulados segundo as práticas de resposta a riscos do
                  PMBOK; a confiança acima é a probabilidade que ele atribui à classe recomendada.
                </Typography>
              </Paper>
            )}
          </Box>
        </Fade>
      )}

      {risco && !confirmacao && <RegistroRisco risco={risco} aoSalvar={setRisco} />}

      {risco && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Ciclo de vida do risco
            </Typography>
            <ChipStatus status={risco.status} />
          </Box>

          {risco.status !== "encerrado" ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 1.5, mb: 3 }}>
              <TextField
                select
                label="Novo status"
                size="small"
                value={novoStatus}
                onChange={(e) => setNovoStatus(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                {STATUS_RISCO.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Comentário (opcional)"
                size="small"
                fullWidth
                value={comentarioStatus}
                onChange={(e) => setComentarioStatus(e.target.value)}
              />
              <Button
                variant="outlined"
                disabled={atualizandoStatus || novoStatus === risco.status}
                onClick={atualizarStatus}
              >
                Atualizar
              </Button>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
              Risco encerrado — não é possível mudar o status.
            </Typography>
          )}

          <Stack divider={<Divider />} spacing={1.5}>
            {historico.map((evento) => (
              <Box key={evento.id}>
                <Typography variant="body2">
                  {evento.status_anterior ? (
                    <>
                      {rotulo(STATUS_RISCO, evento.status_anterior)} →{" "}
                      <strong>{rotulo(STATUS_RISCO, evento.status_novo)}</strong>
                    </>
                  ) : (
                    <strong>{rotulo(STATUS_RISCO, evento.status_novo)}</strong>
                  )}
                </Typography>
                {evento.comentario && (
                  <Typography variant="body2" color="text.secondary">
                    {evento.comentario}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {new Date(evento.criado_em).toLocaleString("pt-BR")}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}

// Registro do risco (formato MR-MPS-SW): identificação, avaliação e os campos de
// tratamento, que o gerente revisa e refina (podem vir pré-preenchidos pela IA).
function RegistroRisco({ risco, aoSalvar }) {
  const [descricaoImpacto, setDescricaoImpacto] = useState(risco.descricao_impacto ?? "");
  const [mitigacao, setMitigacao] = useState(risco.mitigacao ?? "");
  const [contingencia, setContingencia] = useState(risco.contingencia ?? "");
  const [gatilho, setGatilho] = useState(risco.gatilho ?? "");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null); // { tipo, texto }

  // Reflete o que o backend gravou (ex.: pré-preenchimento ao aceitar o plano).
  useEffect(() => {
    setDescricaoImpacto(risco.descricao_impacto ?? "");
    setMitigacao(risco.mitigacao ?? "");
    setContingencia(risco.contingencia ?? "");
    setGatilho(risco.gatilho ?? "");
  }, [risco.descricao_impacto, risco.mitigacao, risco.contingencia, risco.gatilho]);

  const alterado =
    descricaoImpacto !== (risco.descricao_impacto ?? "") ||
    mitigacao !== (risco.mitigacao ?? "") ||
    contingencia !== (risco.contingencia ?? "") ||
    gatilho !== (risco.gatilho ?? "");

  async function salvar() {
    setSalvando(true);
    setMensagem(null);
    try {
      const atualizado = await servicoRiscos.atualizarTratamento(risco.id, {
        descricao_impacto: descricaoImpacto,
        mitigacao,
        contingencia,
        gatilho,
      });
      aoSalvar(atualizado);
      setMensagem({ tipo: "success", texto: "Registro atualizado." });
    } catch (e) {
      const detalhe = e.response?.data?.detail;
      setMensagem({ tipo: "error", texto: typeof detalhe === "string" ? detalhe : "Não foi possível salvar. Verifique os campos." });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Paper sx={{ p: 3, mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
        <EditNoteIcon sx={{ color: "primary.main", fontSize: 22 }} />
        <Typography variant="subtitle1" fontWeight={600}>
          Registro do risco {risco.indice}
        </Typography>
        <ChipArea area={risco.area_afetada} />
        <ChipSeveridade probabilidade={risco.probabilidade} impacto={risco.impacto} />
      </Box>
      <Stack spacing={2}>
        <TextField
          label="Descrição do impacto"
          value={descricaoImpacto}
          onChange={(e) => setDescricaoImpacto(e.target.value)}
          multiline
          minRows={2}
          fullWidth
        />
        <TextField
          label="Mitigação (ação preventiva)"
          value={mitigacao}
          onChange={(e) => setMitigacao(e.target.value)}
          multiline
          minRows={2}
          fullWidth
        />
        <TextField
          label="Contingência (ação reativa)"
          value={contingencia}
          onChange={(e) => setContingencia(e.target.value)}
          multiline
          minRows={2}
          fullWidth
        />
        <TextField
          label="Gatilho"
          value={gatilho}
          onChange={(e) => setGatilho(e.target.value)}
          multiline
          minRows={2}
          fullWidth
          helperText="Evento, sintoma ou indicador que avisa a hora de acionar a contingência."
        />
        {mensagem && <Alert severity={mensagem.tipo}>{mensagem.texto}</Alert>}
        <Box>
          <Button variant="contained" disabled={salvando || !alterado || descricaoImpacto.trim().length < 5} onClick={salvar}>
            {salvando ? "Salvando..." : "Salvar registro"}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}

function ChipFeature({ rotulo: nome, valor, cor }) {
  return (
    <Chip
      size="small"
      label={
        <span>
          <span style={{ opacity: 0.7 }}>{nome}: </span>
          <strong>{valor}</strong>
        </span>
      }
      sx={{ bgcolor: `${cor}1F`, color: cor, border: `1px solid ${cor}55` }}
    />
  );
}
