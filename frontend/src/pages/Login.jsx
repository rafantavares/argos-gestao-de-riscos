import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useAuth } from "../contexts/AuthContext";
import { Logo } from "../components/Logo";
import IlustracaoRede from "../components/IlustracaoRede";
import { VERSAO_SISTEMA } from "../constants";
import { api } from "../services/api";

const TENTATIVAS_LOGIN = 10; // ~1 min no total, o tempo de o servidor acordar

const DIFERENCIAIS = [
  "Recomendação de planos de contingência por aprendizado de máquina",
  "Matriz de risco PMBOK com ciclo de vida completo",
  "Modelo que aprende com o feedback dos gerentes",
];

export default function Login() {
  const { usuario, carregando, entrar, cadastrar } = useAuth();
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
      {/* Coluna esquerda: hero visual */}
      <Box
        sx={{
          flexBasis: { md: "60%" },
          flexGrow: 1,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          p: { xs: 3, md: 6 },
          minHeight: { xs: 320, md: "100vh" },
          background:
            "radial-gradient(1200px 600px at 20% 10%, color-mix(in srgb, var(--argos-marca) 10%, transparent), transparent 60%), radial-gradient(900px 500px at 90% 90%, color-mix(in srgb, var(--argos-ia) 10%, transparent), transparent 60%), var(--argos-fundo)",
          borderRight: { md: "1px solid var(--argos-borda)" },
        }}
      >
        <Box className="surgir">
          <Logo size={44} fontSize={26} />
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            alignItems: "center",
            gap: { xs: 3, lg: 5 },
            my: { xs: 3, md: 0 },
          }}
        >
          <Box className="surgir surgir-atraso-1" sx={{ flex: 1, maxWidth: 460 }}>
            <Typography
              variant="h3"
              fontWeight={700}
              sx={{ lineHeight: 1.15, mb: 2, fontSize: { xs: 30, md: 40 } }}
            >
              Inteligência preditiva para gestão de riscos em projetos de TI
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Cadastre riscos, visualize a exposição do projeto e receba o plano de
              contingência mais adequado, recomendado por um modelo treinado nas práticas do
              PMBOK.
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 0, listStyle: "none", display: "grid", gap: 1.2 }}>
              {DIFERENCIAIS.map((texto) => (
                <Box component="li" key={texto} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "primary.main", flexShrink: 0 }} />
                  <Typography variant="body2" color="text.secondary">
                    {texto}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box
            className="surgir surgir-atraso-2"
            sx={{ flex: 1, display: { xs: "none", sm: "block" }, width: "100%", maxWidth: 520 }}
          >
            <IlustracaoRede />
          </Box>
        </Box>

        <Typography variant="caption" color="text.secondary" className="surgir surgir-atraso-3">
          Trabalho de Conclusão de Curso · versão {VERSAO_SISTEMA}
        </Typography>
      </Box>

      {/* Coluna direita: formulário */}
      <Box
        sx={{
          flexBasis: { md: "40%" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 3, md: 6 },
          bgcolor: "background.paper",
        }}
      >
        <Box className="surgir surgir-atraso-1" sx={{ width: "100%", maxWidth: 380 }}>
          <Typography variant="h5" component="h1" fontWeight={700} sx={{ mb: 0.5 }}>
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
              sx={{ py: 1.4, fontWeight: 700, mt: 0.5 }}
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

          <Box sx={{ display: "flex", justifyContent: "center", mt: 3.5 }}>
            <Chip
              icon={<LockOutlinedIcon sx={{ fontSize: 14 }} />}
              label="Acesso seguro via JWT"
              size="small"
              variant="outlined"
              sx={{ color: "text.secondary", borderColor: "divider", "& .MuiChip-icon": { color: "primary.main" } }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
