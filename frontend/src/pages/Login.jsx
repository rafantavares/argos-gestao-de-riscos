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
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import UpdateIcon from "@mui/icons-material/Update";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useAuth } from "../contexts/AuthContext";
import { Logo } from "../components/Logo";
import MatrizVitrine from "../components/MatrizVitrine";
import { usePreferencias } from "../contexts/PreferenciasContext";
import { VERSAO_SISTEMA } from "../constants";
import { api } from "../services/api";

const TENTATIVAS_LOGIN = 10; // ~1 min no total, o tempo de o servidor acordar

// O que o Argos faz, cada item ligado a uma função real do sistema.
const DIFERENCIAIS = [
  { icone: GridViewOutlinedIcon, titulo: "Matriz de risco", texto: "Probabilidade × impacto no padrão PMBOK, com a exposição de cada projeto." },
  { icone: AutoAwesomeOutlinedIcon, titulo: "Plano recomendado por IA", texto: "Um modelo treinado indica o plano de contingência e aprende com as suas decisões.", ia: true },
  { icone: UpdateIcon, titulo: "Monitoramento contínuo", texto: "Reavaliações e histórico de cada risco, como pede o MR-MPS-SW:2023." },
];

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
        minHeight: "100vh",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        bgcolor: "background.default",
      }}
    >
      {/* Coluna esquerda: o produto (matriz de risco) e o que ele faz */}
      <Box
        component="section"
        aria-label="Sobre o Argos"
        sx={{
          flexBasis: { md: "58%" },
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          gap: { xs: 3, md: 4 },
          p: { xs: 3, sm: 4, md: 6 },
          minHeight: { md: "100vh" },
          bgcolor: "var(--argos-fundo)",
          borderRight: { md: "1px solid var(--argos-borda-suave)" },
        }}
      >
        <Logo size={40} fontSize={24} />

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: { xs: 3, md: 4.5 } }}>
          <Box sx={{ maxWidth: 620 }}>
            <Typography
              component="p"
              sx={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 600,
                fontSize: { xs: 30, md: 38, xl: 44 },
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                textWrap: "balance",
                mb: 1.75,
              }}
            >
              Saiba onde está o risco do seu projeto antes que ele vire problema.
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 520 }}>
              Registre os riscos, acompanhe a exposição de cada projeto e receba o plano de contingência mais adequado.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 420px)" },
              alignItems: "center",
              gap: { xs: 4, lg: 5 },
            }}
          >
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gap: 2.25, maxWidth: 420 }}>
              {DIFERENCIAIS.map(({ icone: Icone, titulo, texto, ia }) => (
                <Box component="li" key={titulo} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      flexShrink: 0,
                      borderRadius: 2,
                      display: "grid",
                      placeItems: "center",
                      color: ia ? "secondary.main" : "primary.main",
                      bgcolor: ia ? "color-mix(in srgb, var(--argos-ia) 12%, transparent)" : "color-mix(in srgb, var(--argos-marca) 12%, transparent)",
                    }}
                  >
                    <Icone sx={{ fontSize: 18 }} />
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {titulo}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {texto}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            <Box sx={{ display: { xs: "none", sm: "flex" }, justifyContent: "center" }}>
              <MatrizVitrine />
            </Box>
          </Box>
        </Box>

        <Typography variant="caption" color="text.secondary">
          Trabalho de Conclusão de Curso · Engenharia de Software · versão {VERSAO_SISTEMA}
        </Typography>
      </Box>

      {/* Coluna direita: formulário */}
      <Box
        sx={{
          flexBasis: { md: "42%" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          p: { xs: 3, md: 6 },
          bgcolor: "background.paper",
        }}
      >
        <Tooltip title={escuro ? "Usar modo claro" : "Usar modo escuro"}>
          <IconButton
            onClick={alternarModo}
            aria-label={escuro ? "Usar modo claro" : "Usar modo escuro"}
            sx={{ position: "absolute", top: 16, right: 16, border: 1, borderColor: "divider" }}
          >
            {escuro ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Box sx={{ width: "100%", maxWidth: 380 }}>
          <Typography variant="h5" component="h1" fontWeight={600} sx={{ mb: 0.5 }}>
            {criando ? "Criar conta" : "Entrar no Argos"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5 }}>
            {criando
              ? "Cadastre-se como gerente de projetos para registrar e acompanhar os riscos dos seus projetos."
              : "Use o e-mail e a senha da sua conta."}
          </Typography>

          <Box
            component="form"
            onSubmit={aoEnviar}
            sx={{ display: "flex", flexDirection: "column", gap: 2.2 }}
          >
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
                    <IconButton
                      size="small"
                      onClick={() => setMostrarSenha((v) => !v)}
                      aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                      edge="end"
                    >
                      {mostrarSenha ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={enviando}
              sx={{ py: 1.4, fontWeight: 600, mt: 0.5 }}
            >
              {enviando ? (criando ? "Criando conta…" : "Entrando…") : criando ? "Criar conta" : "Entrar"}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2.5 }}>
            {criando ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
            <Button variant="text" size="small" onClick={trocarModo} disabled={enviando} sx={{ verticalAlign: "baseline" }}>
              {criando ? "Entrar" : "Criar conta"}
            </Button>
          </Typography>

        </Box>
      </Box>
    </Box>
  );
}
