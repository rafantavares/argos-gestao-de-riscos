import { Fragment, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PostAddIcon from "@mui/icons-material/PostAdd";
import SendIcon from "@mui/icons-material/Send";
import { chat as servicoChat, projetos as servicoProjetos } from "../../services/api";
import { useAviso, useConfirmacao } from "../../contexts/FeedbackContext";

const SUGESTOES = [
  "Um desenvolvedor-chave pode sair da equipe no meio do projeto.",
  "O cliente muda os requisitos toda semana.",
  "O servidor de homologação vive caindo e a equipe perde horas esperando.",
  "Quais são os riscos mais críticos deste projeto?",
];

// Formatação mínima das respostas: **negrito**, *itálico* e listas com "- ".
function TextoFormatado({ texto }) {
  return texto.split("\n").map((linha, i) => {
    if (!linha.trim()) return <Box key={i} sx={{ height: 8 }} />;
    const item = /^\s*[-*•]\s+/.test(linha);
    const conteudo = linha.replace(/^\s*[-*•]\s+/, "");
    const partes = conteudo.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((parte, j) => {
      if (parte.length > 4 && parte.startsWith("**") && parte.endsWith("**")) {
        return <strong key={j}>{parte.slice(2, -2)}</strong>;
      }
      if (parte.length > 2 && parte.startsWith("*") && parte.endsWith("*")) {
        return <em key={j}>{parte.slice(1, -1)}</em>;
      }
      return <Fragment key={j}>{parte}</Fragment>;
    });
    return (
      <Typography
        key={i}
        variant="body2"
        component="div"
        sx={{ lineHeight: 1.65, ...(item && { display: "flex", gap: 1, pl: 0.5 }) }}
      >
        {item && <Box component="span" sx={{ color: "secondary.main", flexShrink: 0 }}>•</Box>}
        <span>{partes}</span>
      </Typography>
    );
  });
}

function Mensagem({ mensagem, acao }) {
  const doUsuario = mensagem.papel === "usuario";
  if (doUsuario) {
    return (
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Paper
          variant="outlined"
          sx={{
            px: 2,
            py: 1.25,
            maxWidth: "75%",
            borderRadius: 2,
            bgcolor: "color-mix(in srgb, var(--argos-marca) 10%, transparent)",
            borderColor: "color-mix(in srgb, var(--argos-marca) 35%, transparent)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <Typography variant="body2">{mensagem.texto}</Typography>
        </Paper>
      </Box>
    );
  }
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1.5,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          bgcolor: "color-mix(in srgb, var(--argos-ia) 15%, transparent)",
          color: "secondary.main",
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: "1.125rem" }} />
      </Box>
      {/* Linhas de até ~75 caracteres: respostas longas ficam mais fáceis de ler. */}
      <Box sx={{ minWidth: 0, flex: 1, maxWidth: "75ch", wordBreak: "break-word", pt: 0.5 }}>
        <TextoFormatado texto={mensagem.texto} />
        {acao}
      </Box>
    </Box>
  );
}

// Chat com o assistente de IA (modelo de linguagem com o contexto do projeto):
// o gerente descreve o problema e recebe sugestões de registro e tratamento do
// risco. As conversas ficam salvas por projeto (histórico à esquerda) e um
// risco criado a partir de uma sugestão guarda a conversa de origem.
export default function Assistente() {
  const localizacao = useLocation();
  const navigate = useNavigate();
  const avisar = useAviso();
  const confirmar = useConfirmacao();
  const [projetos, setProjetos] = useState([]);
  const [idProjeto, setIdProjeto] = useState("");
  const [conversas, setConversas] = useState([]);
  const [idConversa, setIdConversa] = useState(null);
  const [riscosCriados, setRiscosCriados] = useState([]);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [gerandoRascunho, setGerandoRascunho] = useState(false);
  const [renomeando, setRenomeando] = useState(null); // { id, titulo }
  const [erro, setErro] = useState("");
  const fimRef = useRef(null);
  const conversaPedida = localizacao.state?.idConversa;

  useEffect(() => {
    servicoProjetos
      .meus()
      .then(async (lista) => {
        setProjetos(lista);
        // Vindo do detalhe de um risco: abre a conversa de origem no projeto certo.
        if (conversaPedida) {
          try {
            const conversa = await servicoChat.conversa(conversaPedida);
            setIdProjeto(conversa.id_projeto);
            abrirDetalhe(conversa);
            return;
          } catch {
            avisar("Essa conversa não existe mais.", "warning");
          }
        }
        if (lista.length > 0) setIdProjeto(lista[0].id);
      })
      .catch(() => setErro("Não foi possível carregar seus projetos."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!idProjeto) return;
    servicoChat.conversas(idProjeto).then(setConversas).catch(() => setConversas([]));
  }, [idProjeto]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, enviando]);

  function abrirDetalhe(conversa) {
    setIdConversa(conversa.id);
    setMensagens(conversa.mensagens.map(({ papel, texto: t, modelo }) => ({ papel, texto: t, modelo })));
    setRiscosCriados(conversa.riscos_criados ?? []);
    setErro("");
  }

  async function abrirConversa(id) {
    if (enviando || id === idConversa) return;
    try {
      abrirDetalhe(await servicoChat.conversa(id));
    } catch {
      avisar("Não foi possível abrir a conversa.", "error");
    }
  }

  function novaConversa() {
    setIdConversa(null);
    setMensagens([]);
    setRiscosCriados([]);
    setErro("");
  }

  function trocarProjeto(id) {
    setIdProjeto(id);
    novaConversa();
  }

  async function enviar(conteudo) {
    const pergunta = (conteudo ?? texto).trim();
    if (!pergunta || !idProjeto || enviando) return;
    const conversa = [...mensagens, { papel: "usuario", texto: pergunta }];
    setMensagens(conversa);
    setTexto("");
    setErro("");
    setEnviando(true);
    try {
      const historico = conversa.map(({ papel, texto: t }) => ({ papel, texto: t })).slice(-40);
      const resposta = await servicoChat.conversar(idProjeto, historico, idConversa);
      setMensagens([...conversa, { papel: "assistente", texto: resposta.resposta }]);
      if (!idConversa) setIdConversa(resposta.id_conversa);
      servicoChat.conversas(idProjeto).then(setConversas).catch(() => {});
    } catch (e) {
      const detalhe = e.response?.data?.detail;
      setErro(typeof detalhe === "string" ? detalhe : "Não foi possível falar com o assistente.");
      // Devolve a pergunta ao campo para o gerente tentar de novo.
      setMensagens(mensagens);
      setTexto(pergunta);
    } finally {
      setEnviando(false);
    }
  }

  // Leva a sugestão para o formulário "Novo risco", já preenchido, para revisão.
  async function preencherNovoRisco() {
    setGerandoRascunho(true);
    setErro("");
    try {
      const historico = mensagens.map(({ papel, texto: t }) => ({ papel, texto: t })).slice(-40);
      const rascunho = await servicoChat.rascunho(idProjeto, historico);
      navigate("/gerente/riscos", {
        state: { rascunho: { ...rascunho, id_projeto: idProjeto, id_conversa_origem: idConversa } },
      });
    } catch (e) {
      const detalhe = e.response?.data?.detail;
      setErro(typeof detalhe === "string" ? detalhe : "Não foi possível montar o rascunho do risco.");
      setGerandoRascunho(false);
    }
  }

  async function salvarNome() {
    const { id, titulo } = renomeando;
    setRenomeando(null);
    if (!titulo.trim()) return;
    try {
      const atualizada = await servicoChat.renomearConversa(id, titulo.trim());
      setConversas((atuais) => atuais.map((c) => (c.id === id ? { ...c, titulo: atualizada.titulo } : c)));
    } catch {
      avisar("Não foi possível renomear a conversa.", "error");
    }
  }

  async function excluirConversa(conversa) {
    const ok = await confirmar({
      titulo: "Excluir a conversa?",
      mensagem: `"${conversa.titulo}" e todas as mensagens serão apagadas. Os riscos criados a partir dela continuam registrados.`,
      confirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    try {
      await servicoChat.excluirConversa(conversa.id);
      setConversas((atuais) => atuais.filter((c) => c.id !== conversa.id));
      if (conversa.id === idConversa) novaConversa();
      avisar("Conversa excluída.");
    } catch {
      avisar("Não foi possível excluir a conversa.", "error");
    }
  }

  function aoTeclar(evento) {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      enviar();
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: { md: "calc(100vh - 120px)" }, minHeight: 480 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ flexGrow: 1, minWidth: 240, alignSelf: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Descreva um problema do projeto e receba sugestões de como registrar e tratar o risco.
          </Typography>
        </Box>
        <TextField
          select
          size="small"
          label="Projeto"
          value={idProjeto}
          onChange={(e) => trocarProjeto(e.target.value)}
          disabled={enviando}
          sx={{ minWidth: 220 }}
        >
          {projetos.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.nome}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" } }}>
        {/* Histórico de conversas do projeto */}
        <Paper
          sx={{
            width: { md: 270 },
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            maxHeight: { xs: 220, md: "none" },
            overflow: "hidden",
          }}
        >
          <Box sx={{ p: 1.5 }}>
            <Button fullWidth variant="outlined" color="secondary" startIcon={<AddIcon />} onClick={novaConversa} disabled={enviando}>
              Nova conversa
            </Button>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
            {conversas.length === 0 ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", p: 1.5, textAlign: "center" }}>
                As conversas deste projeto aparecem aqui.
              </Typography>
            ) : (
              conversas.map((c) => {
                const ativa = c.id === idConversa;
                return (
                  <Box
                    key={c.id}
                    onClick={() => abrirConversa(c.id)}
                    onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && abrirConversa(c.id)}
                    role="button"
                    tabIndex={0}
                    aria-current={ativa ? "true" : undefined}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 1.25,
                      py: 0.9,
                      mb: 0.5,
                      borderRadius: 1.5,
                      cursor: "pointer",
                      bgcolor: ativa ? "color-mix(in srgb, var(--argos-ia) 12%, transparent)" : "transparent",
                      "&:hover": { bgcolor: ativa ? "color-mix(in srgb, var(--argos-ia) 16%, transparent)" : "var(--argos-sobreposicao)" },
                      "&:hover .acoes, &:focus-within .acoes": { opacity: 1 },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {renomeando?.id === c.id ? (
                        <TextField
                          size="small"
                          variant="standard"
                          autoFocus
                          fullWidth
                          value={renomeando.titulo}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setRenomeando({ id: c.id, titulo: e.target.value })}
                          onBlur={salvarNome}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") salvarNome();
                            if (e.key === "Escape") setRenomeando(null);
                          }}
                          inputProps={{ maxLength: 120 }}
                        />
                      ) : (
                        <Typography variant="body2" noWrap fontWeight={ativa ? 600 : 400}>
                          {c.titulo}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {new Date(c.atualizado_em ?? c.criado_em).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Typography>
                    </Box>
                    <Box className="acoes" sx={{ display: "flex", opacity: ativa ? 1 : 0, transition: "opacity 0.15s" }}>
                      <IconButton
                        size="small"
                        aria-label="Renomear"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenomeando({ id: c.id, titulo: c.titulo });
                        }}
                      >
                        <EditOutlinedIcon sx={{ fontSize: "1rem" }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="Excluir"
                        onClick={(e) => {
                          e.stopPropagation();
                          excluirConversa(c);
                        }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: "1rem" }} />
                      </IconButton>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
        </Paper>

        {/* Conversa aberta */}
        <Paper sx={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {riscosCriados.length > 0 && (
            <Box sx={{ px: { xs: 2, md: 4 }, py: 1, borderBottom: 1, borderColor: "divider", display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="caption" color="text.secondary">
                Riscos criados a partir desta conversa:
              </Typography>
              {riscosCriados.map((r) => (
                <Chip
                  key={r.id}
                  size="small"
                  variant="outlined"
                  color="primary"
                  label={`${r.indice} · ${r.titulo}`}
                  onClick={() => navigate(`/gerente/riscos/${r.id}/recomendacao`)}
                />
              ))}
            </Box>
          )}
          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: { xs: 2, md: 4 }, py: 3 }}>
            <Box sx={{ maxWidth: 860, mx: "auto" }}>
              {mensagens.length === 0 ? (
                <Box sx={{ textAlign: "center", py: { xs: 2, md: 6 } }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      mx: "auto",
                      mb: 2,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "color-mix(in srgb, var(--argos-ia) 15%, transparent)",
                      color: "secondary.main",
                    }}
                  >
                    <AutoAwesomeIcon />
                  </Box>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                    Como posso ajudar com os riscos do projeto?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560, mx: "auto", mb: 3 }}>
                    O assistente sugere a área afetada, as notas de impacto e probabilidade, a exposição, a mitigação, a
                    contingência e o gatilho, considerando os riscos que já estão registrados no projeto.
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
                    {SUGESTOES.map((sugestao) => (
                      <Chip
                        key={sugestao}
                        label={sugestao}
                        variant="outlined"
                        onClick={() => enviar(sugestao)}
                        disabled={!idProjeto}
                        sx={{ height: "auto", py: 0.75, maxWidth: 400, "& .MuiChip-label": { whiteSpace: "normal" } }}
                      />
                    ))}
                  </Box>
                </Box>
              ) : (
                <Stack spacing={3}>
                  {mensagens.map((mensagem, i) => (
                    <Mensagem
                      key={i}
                      mensagem={mensagem}
                      acao={
                        mensagem.papel === "assistente" &&
                        i === mensagens.length - 1 && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            startIcon={gerandoRascunho ? <CircularProgress size={14} color="inherit" /> : <PostAddIcon />}
                            onClick={preencherNovoRisco}
                            disabled={gerandoRascunho || enviando}
                            sx={{ mt: 1.5 }}
                          >
                            {gerandoRascunho ? "Montando o rascunho…" : "Preencher novo risco com esta sugestão"}
                          </Button>
                        )
                      }
                    />
                  ))}
                  {enviando && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, color: "text.secondary", pl: 0.5 }}>
                      <CircularProgress size={16} color="secondary" />
                      <Typography variant="body2">Analisando o projeto...</Typography>
                    </Box>
                  )}
                </Stack>
              )}
              <div ref={fimRef} />
            </Box>
          </Box>

          <Box sx={{ borderTop: 1, borderColor: "divider", px: { xs: 2, md: 4 }, pt: 2, pb: 1.5 }}>
            <Box sx={{ maxWidth: 860, mx: "auto" }}>
              {erro && (
                <Alert severity="error" sx={{ mb: 1.5 }}>
                  {erro}
                </Alert>
              )}
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={6}
                  placeholder={idProjeto ? "Descreva o problema ou faça uma pergunta…" : "Selecione um projeto"}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={aoTeclar}
                  disabled={!idProjeto || enviando}
                  inputProps={{ maxLength: 4000 }}
                />
                <IconButton
                  color="primary"
                  onClick={() => enviar()}
                  disabled={!texto.trim() || !idProjeto || enviando}
                  aria-label="Enviar"
                  sx={{ mb: 0.5 }}
                >
                  <SendIcon />
                </IconButton>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Enter envia · Shift+Enter quebra a linha · As conversas ficam salvas no histórico · Sugestões geradas por
                IA (Google Gemini) podem conter erros: revise antes de registrar o risco.
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
