import { Fragment, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SendIcon from "@mui/icons-material/Send";
import { chat as servicoChat, projetos as servicoProjetos } from "../services/api";

export const LARGURA_CHAT = 440;

const SUGESTOES = [
  "Um desenvolvedor-chave pode sair da equipe no meio do projeto.",
  "O cliente muda os requisitos toda semana.",
  "Quais são os riscos mais críticos deste projeto?",
];

// Formatação mínima das respostas: **negrito** e listas com "- ".
function TextoFormatado({ texto }) {
  return texto.split("\n").map((linha, i) => {
    const item = /^\s*[-*•]\s+/.test(linha);
    const conteudo = linha.replace(/^\s*[-*•]\s+/, "");
    const partes = conteudo.split(/(\*\*[^*]+\*\*)/g).map((parte, j) =>
      parte.startsWith("**") && parte.endsWith("**") ? (
        <strong key={j}>{parte.slice(2, -2)}</strong>
      ) : (
        <Fragment key={j}>{parte}</Fragment>
      )
    );
    if (!linha.trim()) return <Box key={i} sx={{ height: 8 }} />;
    return (
      <Typography key={i} variant="body2" component="div" sx={{ pl: item ? 1.5 : 0, textIndent: item ? -10 : 0 }}>
        {item ? "• " : ""}
        {partes}
      </Typography>
    );
  });
}

function Balao({ mensagem }) {
  const doUsuario = mensagem.papel === "usuario";
  return (
    <Box sx={{ display: "flex", justifyContent: doUsuario ? "flex-end" : "flex-start" }}>
      <Paper
        variant="outlined"
        sx={{
          px: 1.5,
          py: 1,
          maxWidth: "88%",
          borderRadius: 2,
          bgcolor: doUsuario ? "rgba(45, 212, 191, 0.10)" : "rgba(167, 139, 250, 0.07)",
          borderColor: doUsuario ? "rgba(45, 212, 191, 0.35)" : "rgba(167, 139, 250, 0.35)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {doUsuario ? <Typography variant="body2">{mensagem.texto}</Typography> : <TextoFormatado texto={mensagem.texto} />}
      </Paper>
    </Box>
  );
}

// Chat com o assistente de IA (modelo de linguagem com o contexto do projeto):
// o gerente descreve o problema e recebe sugestões de registro e tratamento do
// risco. Nada é gravado; o cadastro continua no formulário "Novo risco".
export default function ChatAssistente({ aberto, aoFechar }) {
  const [projetos, setProjetos] = useState([]);
  const [idProjeto, setIdProjeto] = useState("");
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const fimRef = useRef(null);

  useEffect(() => {
    if (!aberto || projetos.length > 0) return;
    servicoProjetos
      .meus()
      .then((lista) => {
        setProjetos(lista);
        if (lista.length > 0) setIdProjeto((atual) => atual || lista[0].id);
      })
      .catch(() => setErro("Não foi possível carregar seus projetos."));
  }, [aberto, projetos.length]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, enviando]);

  function novaConversa() {
    setMensagens([]);
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
      const { resposta } = await servicoChat.conversar(idProjeto, conversa);
      setMensagens([...conversa, { papel: "assistente", texto: resposta }]);
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
    <Drawer
      anchor="right"
      open={aberto}
      onClose={aoFechar}
      variant="persistent"
      sx={{ "& .MuiDrawer-paper": { width: { xs: "100%", sm: LARGURA_CHAT }, boxSizing: "border-box" } }}
    >
      <Toolbar />
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AutoAwesomeIcon sx={{ color: "secondary.main", fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={600} sx={{ flexGrow: 1 }}>
              Assistente de riscos
            </Typography>
            <Tooltip title="Nova conversa">
              <span>
                <IconButton size="small" onClick={novaConversa} disabled={mensagens.length === 0 || enviando}>
                  <RestartAltIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <IconButton size="small" onClick={aoFechar} aria-label="Fechar assistente">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <TextField
            select
            fullWidth
            size="small"
            label="Projeto"
            value={idProjeto}
            onChange={(e) => trocarProjeto(e.target.value)}
            sx={{ mt: 1.5 }}
            disabled={enviando}
          >
            {projetos.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.nome}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: "auto", px: 2, py: 2, minHeight: 0 }}>
          {mensagens.length === 0 ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Descreva um problema ou uma preocupação do projeto. O assistente sugere como registrar o risco
                (área, notas de impacto e probabilidade, exposição) e como tratá-lo (mitigação, contingência e
                gatilho), considerando os riscos que já estão registrados no projeto.
              </Typography>
              <Stack spacing={1} alignItems="flex-start">
                {SUGESTOES.map((sugestao) => (
                  <Chip
                    key={sugestao}
                    label={sugestao}
                    variant="outlined"
                    onClick={() => enviar(sugestao)}
                    disabled={!idProjeto}
                    sx={{ height: "auto", py: 0.5, "& .MuiChip-label": { whiteSpace: "normal" } }}
                  />
                ))}
              </Stack>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {mensagens.map((mensagem, i) => (
                <Balao key={i} mensagem={mensagem} />
              ))}
              {enviando && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                  <CircularProgress size={14} />
                  <Typography variant="caption">Analisando...</Typography>
                </Box>
              )}
            </Stack>
          )}
          <div ref={fimRef} />
        </Box>

        <Box sx={{ px: 2, pt: 1.5, pb: 2, borderTop: 1, borderColor: "divider" }}>
          {erro && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {erro}
            </Alert>
          )}
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
            <TextField
              fullWidth
              multiline
              maxRows={5}
              size="small"
              placeholder={idProjeto ? "Descreva o problema..." : "Selecione um projeto"}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={aoTeclar}
              disabled={!idProjeto || enviando}
              inputProps={{ maxLength: 4000 }}
            />
            <IconButton color="primary" onClick={() => enviar()} disabled={!texto.trim() || !idProjeto || enviando} aria-label="Enviar">
              <SendIcon />
            </IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Sugestões geradas por IA (Google Gemini) podem conter erros. Revise antes de registrar o risco.
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
}
