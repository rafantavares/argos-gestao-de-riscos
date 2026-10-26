import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Tooltip,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useAuth } from "../contexts/AuthContext";
import { Logo } from "../components/Logo";
import PainelLogin from "../components/PainelLogin";
import { usePreferencias } from "../contexts/PreferenciasContext";
import { VERSAO_SISTEMA } from "../constants";
import { api } from "../services/api";

const TENTATIVAS_LOGIN = 10; // ~1 min no total, o tempo de o servidor acordar


export default function Login() {
  const { usuario, carregando, entrar, cadastrar } = useAuth();
  const { escuro, alternarModo } = usePreferencias();
  // "entrar" ou "criar" (cadastro aberto: a conta nasce como gerente de projetos).
  const [modo, setModo] = useState("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aguardando, setAguardando] = useState("");

  // O servidor gratuito (Render) dorme após 15 min sem uso e leva até ~1 min
  // para acordar: já o chamamos ao abrir a tela, enquanto o usuário digita.
  useEffect(() => {
    api.get("/health", { timeout: 90000 }).catch(() => {});
  }, []);

  if (!carregando && usuario) {
    return <Navigate to="/" replace />;
  }

  const criando = modo === "criar";

  function trocarModo() {
    setModo(criando ? "entrar" : "criar");
    setErro("");
  }

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      for (let tentativa = 1; tentativa <= TENTATIVAS_LOGIN; tentativa += 1) {
        try {
          if (criando) await cadastrar(nome, email, senha);
          else await entrar(email, senha);
          return;
        } catch (e) {
          const codigo = e.response?.status;
          const detalhe = e.response?.data?.detail;
          if (codigo === 401) {
            setErro("E-mail ou senha incorretos.");
            return;
          }
          if (criando && codigo === 400 && typeof detalhe === "string") {
            setErro(`${detalhe}. Entre com ela ou use outro e-mail.`);
            return;
          }
          if (codigo && codigo < 500) {
            setErro(
              criando
                ? "Confira os campos: nome, um e-mail válido e senha com pelo menos 8 caracteres."
                : "Não foi possível entrar. Confira o e-mail e a senha."
            );
            return;
          }
          // Sem resposta ou erro 5xx: o servidor está acordando ou reiniciando.
          if (tentativa === TENTATIVAS_LOGIN) {
            setErro("O servidor não respondeu. Tente de novo em alguns instantes.");
            return;
          }
          setAguardando(`O servidor está iniciando, aguarde… (tentativa ${tentativa + 1} de ${TENTATIVAS_LOGIN})`);
          await new Promise((esperar) => setTimeout(esperar, 6000));
        }
      }
    } finally {
      setAguardando("");
      setEnviando(false);
    }
  }

  return (
    <Box
      sx={{
        height: { md: "100vh" },
        minHeight: "100vh",
        display: "flex",
        overflow: { md: "hidden" },
        bgcolor: "background.default",
      }}
    >
      {/* Coluna do formulário */}
      <Box
        component="main"
        sx={{
          flex: { xs: 1, md: "0 0 520px" },
          display: "flex",
          flexDirection: "column",
          px: { xs: 3, sm: 6, md: 8 },
          py: { xs: 3, md: 5.5 },
          bgcolor: "background.paper",
          position: "relative",
          zIndex: 1,
          boxShadow: { md: "12px 0 40px rgba(0,0,0,0.25)" },
        }}
      >
        <Logo size={40} fontSize={23} />

        <Box sx={{ my: "auto", py: 4, width: "100%", maxWidth: 400, mx: { xs: "auto", md: 0 } }}>
          <Typography component="h1" sx={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 30, fontWeight: 600, letterSpacing: "-0.01em", mb: 1 }}>
            {criando ? "Criar conta" : "Bem-vindo de volta"}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3.5 }}>
            {criando
              ? "Cadastre-se como gerente de projetos para registrar e acompanhar os riscos dos seus projetos."
              : "Entre para acompanhar os riscos dos seus projetos."}
          </Typography>

          <Box component="form" onSubmit={aoEnviar} sx={{ display: "flex", flexDirection: "column", gap: 2.2 }}>
            {aguardando && <Alert severity="info">{aguardando}</Alert>}
            {erro && <Alert severity="error">{erro}</Alert>}
            {criando && (
              <TextField
                label="Nome"
                name="name"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                autoComplete="name"
                inputProps={{ minLength: 2, maxLength: 120 }}
              />
            )}
            <TextField
              label="E-mail"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              inputProps={{ spellCheck: false, autoCapitalize: "none" }}
            />
            <TextField
              label="Senha"
              type={mostrarSenha ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              name="password"
              autoComplete={criando ? "new-password" : "current-password"}
              helperText={criando ? "Pelo menos 8 caracteres" : undefined}
              inputProps={criando ? { minLength: 8, maxLength: 100 } : undefined}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}>
                      <IconButton
                        onClick={() => setMostrarSenha((v) => !v)}
                        aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                        edge="end"
                      >
                        {mostrarSenha ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={enviando}
              sx={{ py: 1.5, fontWeight: 600, mt: 0.5, boxShadow: "0 8px 24px color-mix(in srgb, var(--argos-marca) 25%, transparent)" }}
            >
              {enviando ? (criando ? "Criando conta…" : "Entrando…") : criando ? "Criar conta" : "Entrar"}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5 }}>
            {criando ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
            <Button variant="text" size="small" onClick={trocarModo} disabled={enviando} sx={{ verticalAlign: "baseline", fontWeight: 600 }}>
              {criando ? "Entrar" : "Criar conta"}
            </Button>
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Typography variant="caption" color="text.secondary">
            TCC · Engenharia de Software · v{VERSAO_SISTEMA}
          </Typography>
          <Tooltip title={escuro ? "Usar modo claro" : "Usar modo escuro"}>
            <IconButton
              onClick={alternarModo}
              aria-label={escuro ? "Usar modo claro" : "Usar modo escuro"}
              sx={{ border: 1, borderColor: "divider" }}
            >
              {escuro ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Painel da marca: radar de riscos e cartões do produto */}
      <Box sx={{ flex: 1, minWidth: 0, display: { xs: "none", md: "block" } }}>
        <PainelLogin />
      </Box>
    </Box>
  );
}
