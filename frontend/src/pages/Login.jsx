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
  const { usuario, carregando, entrar } = useAuth();
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

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      for (let tentativa = 1; tentativa <= TENTATIVAS_LOGIN; tentativa += 1) {
        try {
          await entrar(email, senha);
          return;
        } catch (e) {
          const codigo = e.response?.status;
          if (codigo === 401) {
            setErro("Email ou senha incorretos.");
            return;
          }
          if (codigo && codigo < 500) {
            setErro("Não foi possível entrar. Confira o email e a senha.");
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
            "radial-gradient(1200px 600px at 20% 10%, rgba(45, 212, 191, 0.10), transparent 60%), radial-gradient(900px 500px at 90% 90%, rgba(167, 139, 250, 0.10), transparent 60%), #0B0E14",
          borderRight: { md: "1px solid #262D3B" },
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
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
            Bem-vindo de volta
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5 }}>
            Entre com o email e a senha cadastrados pelo administrador.
          </Typography>

          <Box
            component="form"
            onSubmit={aoEnviar}
            sx={{ display: "flex", flexDirection: "column", gap: 2.2 }}
          >
            {aguardando && <Alert severity="info">{aguardando}</Alert>}
            {erro && <Alert severity="error">{erro}</Alert>}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
            <TextField
              label="Senha"
              type={mostrarSenha ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
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
              {enviando ? "Entrando..." : "Entrar"}
            </Button>
          </Box>

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
