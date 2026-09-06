import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import { Logo } from "../components/Logo";

export default function Login() {
  const { usuario, carregando, entrar } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!carregando && usuario) {
    return <Navigate to="/" replace />;
  }

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch {
      setErro("Email ou senha incorretos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <Paper sx={{ p: 4, width: 360 }} elevation={3}>
        <Box sx={{ mb: 2.5 }}>
          <Logo size={30} fontSize={21} />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Entre com seu email e senha.
        </Typography>

        <Box component="form" onSubmit={aoEnviar} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {erro && <Alert severity="error">{erro}</Alert>}
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <TextField
            label="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" size="large" disabled={enviando}>
            {enviando ? "Entrando..." : "Entrar"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
