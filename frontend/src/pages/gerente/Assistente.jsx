import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PostAddIcon from "@mui/icons-material/PostAdd";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SendIcon from "@mui/icons-material/Send";
import { chat as servicoChat, projetos as servicoProjetos } from "../../services/api";

const SUGESTOES = [
  "Um desenvolvedor-chave pode sair da equipe no meio do projeto.",
  "O cliente muda os requisitos toda semana.",
  "O servidor de homologação vive caindo e a equipe perde horas esperando.",
  "Quais são os riscos mais críticos deste projeto?",
];

// A conversa fica na sessão do navegador (uma por projeto), para não se perder
// ao trocar de página. O servidor não guarda histórico.
const CHAVE_SESSAO = "argos_chat_";

function lerConversa(idProjeto) {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO + idProjeto)) ?? [];
  } catch {
    return [];
  }
}

function guardarConversa(idProjeto, mensagens) {
  try {
    sessionStorage.setItem(CHAVE_SESSAO + idProjeto, JSON.stringify(mensagens));
  } catch {
    // Sem sessionStorage (modo privado etc.): a conversa só não sobrevive à navegação.
  }
}

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
            bgcolor: "rgba(45, 212, 191, 0.10)",
            borderColor: "rgba(45, 212, 191, 0.35)",
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
          bgcolor: "rgba(167, 139, 250, 0.15)",
          color: "secondary.main",
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: 18 }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1, wordBreak: "break-word", pt: 0.5 }}>
        <TextoFormatado texto={mensagem.texto} />
        {acao}
      </Box>
    </Box>
  );
}

// Chat com o assistente de IA (modelo de linguagem com o contexto do projeto):
// o gerente descreve o problema e recebe sugestões de registro e tratamento do
// risco. Nada é gravado; o cadastro continua no formulário "Novo risco".
export default function Assistente() {
  const [projetos, setProjetos] = useState([]);
  const [idProjeto, setIdProjeto] = useState("");
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [gerandoRascunho, setGerandoRascunho] = useState(false);
  const fimRef = useRef(null);
  const navigate = useNavigate();

  // Leva a sugestão para o formulário "Novo risco", já preenchido, para revisão.
  async function preencherNovoRisco() {
    setGerandoRascunho(true);
    setErro("");
    try {
      const rascunho = await servicoChat.rascunho(idProjeto, mensagens);
      navigate("/gerente/riscos", { state: { rascunho: { ...rascunho, id_projeto: idProjeto } } });
    } catch (e) {
      const detalhe = e.response?.data?.detail;
      setErro(typeof detalhe === "string" ? detalhe : "Não foi possível montar o rascunho do risco.");
      setGerandoRascunho(false);
    }
  }

  useEffect(() => {
    servicoProjetos
      .meus()
      .then((lista) => {
        setProjetos(lista);
        if (lista.length > 0) {
          setIdProjeto(lista[0].id);
          setMensagens(lerConversa(lista[0].id));
        }
      })
      .catch(() => setErro("Não foi possível carregar seus projetos."));
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, enviando]);

  function atualizarConversa(novas) {
    setMensagens(novas);
    guardarConversa(idProjeto, novas);
  }

  function trocarProjeto(id) {
    setIdProjeto(id);
    setMensagens(lerConversa(id));
    setErro("");
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
      const { resposta } = await servicoChat.conversar(idProjeto, conversa);
      atualizarConversa([...conversa, { papel: "assistente", texto: resposta }]);
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

  function aoTeclar(evento) {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      enviar();
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: { md: "calc(100vh - 112px)" }, minHeight: 480 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ flexGrow: 1, minWidth: 240 }}>
          <Typography variant="h5" fontWeight={600}>
            Assistente IA
          </Typography>
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
        <Button
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={() => {
            atualizarConversa([]);
            setErro("");
          }}
          disabled={mensagens.length === 0 || enviando}
          sx={{ height: 40 }}
        >
          Nova conversa
        </Button>
      </Box>

      <Paper sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
                    bgcolor: "rgba(167, 139, 250, 0.15)",
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
                          {gerandoRascunho ? "Montando o rascunho..." : "Preencher novo risco com esta sugestão"}
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
                placeholder={idProjeto ? "Descreva o problema ou faça uma pergunta..." : "Selecione um projeto"}
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
              Enter envia · Shift+Enter quebra a linha · Sugestões geradas por IA (Google Gemini) podem conter erros:
              revise antes de registrar o risco.
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
