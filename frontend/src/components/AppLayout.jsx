import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ABAS = [
  { rota: "/", rotulo: "Dashboard" },
  { rota: "/projetos", rotulo: "Projetos" },
  { rota: "/riscos", rotulo: "Riscos" },
];

export default function AppLayout({ children }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const abaAtual = ABAS.some((aba) => aba.rota === location.pathname)
    ? location.pathname
    : false;

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f5f6f8" }}>
      <AppBar position="static" color="primary">
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 0 }}>
            Gestão de Riscos
          </Typography>

          <Tabs
            value={abaAtual}
            textColor="inherit"
            indicatorColor="secondary"
            sx={{ flexGrow: 1, ml: 2 }}
          >
            {ABAS.map((aba) => (
              <Tab
                key={aba.rota}
                value={aba.rota}
                label={aba.rotulo}
                onClick={() => navigate(aba.rota)}
              />
            ))}
          </Tabs>

          <Chip
            label={`${usuario.nome} · ${usuario.perfil}`}
            variant="outlined"
            sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.5)" }}
          />
          <Button color="inherit" onClick={logout}>
            Sair
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 4 }}>{children}</Container>
    </Box>
  );
}
