import { useEffect, useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import InsightsIcon from "@mui/icons-material/Insights";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import MemoryIcon from "@mui/icons-material/Memory";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ml as servicoMl } from "../services/api";
import { ALGORITMOS, NOMES_ALGORITMOS, VERSAO_SISTEMA, iniciais } from "../constants";
import { Logo } from "./Logo";

const LARGURA_MENU = 248;

const ITENS_ADMIN = [
  {
    rotulo: "Visão geral",
    dica: "Indicadores, performance dos algoritmos e últimas recomendações",
    caminho: "/admin",
    icone: <InsightsIcon />,
  },
  {
    rotulo: "Projetos",
    dica: "Cadastro de projetos e vínculo de gerentes",
    caminho: "/admin/projetos",
    icone: <AccountTreeIcon />,
  },
  {
    rotulo: "Gerentes",
    dica: "Usuários com perfil de gerente de projetos",
    caminho: "/admin/gerentes",
    icone: <ManageAccountsIcon />,
  },
  {
    rotulo: "Riscos",
    dica: "Visão consolidada dos riscos de todos os projetos",
    caminho: "/admin/riscos",
    icone: <ReportProblemOutlinedIcon />,
  },
  {
    rotulo: "Planos de contingência",
    dica: "Catálogo de planos que o modelo pode recomendar",
    caminho: "/admin/planos",
    icone: <ShieldOutlinedIcon />,
  },
];

const ITENS_GERENTE = [
  {
    rotulo: "Visão geral",
    dica: "Matriz de risco, riscos críticos e ações pendentes",
    caminho: "/gerente",
    icone: <SpaceDashboardOutlinedIcon />,
  },
  {
    rotulo: "Projetos",
    dica: "Seus projetos — crie novos ou edite os existentes",
    caminho: "/gerente/projetos",
    icone: <AccountTreeIcon />,
  },
  {
    rotulo: "Riscos",
    dica: "Cadastro e acompanhamento dos riscos dos seus projetos",
    caminho: "/gerente/riscos",
    icone: <ReportProblemOutlinedIcon />,
  },
];

function algoritmoAtivo(metricas) {
  if (!metricas) return null;
  const candidatos = ALGORITMOS.filter((a) => metricas[a]);
  if (candidatos.length === 0) return null;
  const melhor = candidatos.reduce((a, b) => (metricas[b].acuracia > metricas[a].acuracia ? b : a));
  return { nome: melhor, acuracia: metricas[melhor].acuracia, f1: metricas[melhor].f1 };
}

export default function AppLayout({ children }) {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
  const localizacao = useLocation();
  const [metricas, setMetricas] = useState(null);

  useEffect(() => {
    servicoMl.metricas().then(setMetricas).catch(() => setMetricas(null));
  }, []);

  const ehAdmin = usuario.perfil === "admin";
  const itens = ehAdmin ? ITENS_ADMIN : ITENS_GERENTE;
  const cargo = ehAdmin ? "Administrador" : "Gerente de projetos";
  const ativo = algoritmoAtivo(metricas);

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: (tema) => tema.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Logo size={26} fontSize={18} />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
            {usuario.nome}
          </Typography>
          <Tooltip title="Sair da conta">
            <IconButton color="inherit" onClick={sair} aria-label="Sair">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: LARGURA_MENU,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: LARGURA_MENU,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Toolbar />

        {/* Perfil do usuário logado */}
        <Box sx={{ px: 2, pt: 2.5, pb: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            sx={{
              width: 42,
              height: 42,
              bgcolor: ehAdmin ? "secondary.main" : "primary.main",
              color: "#0B0E14",
              fontWeight: 700,
              fontFamily: '"Space Grotesk", sans-serif',
            }}
          >
            {iniciais(usuario.nome)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {usuario.nome}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
              {cargo}
            </Typography>
          </Box>
        </Box>
        <Divider />

        <List sx={{ px: 1.5, py: 1.5, flexGrow: 1 }}>
          {itens.map((item) => (
            <Tooltip key={item.caminho} title={item.dica} placement="right" arrow enterDelay={500}>
              <ListItemButton
                selected={localizacao.pathname === item.caminho}
                onClick={() => navigate(item.caminho)}
                sx={{ mb: 0.5 }}
              >
                <ListItemIcon>{item.icone}</ListItemIcon>
                <ListItemText primary={item.rotulo} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
              </ListItemButton>
            </Tooltip>
          ))}
        </List>

        {/* Informações do sistema */}
        <Divider />
        <Box sx={{ px: 2, py: 2 }}>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}
          >
            Informações do sistema
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
            <MemoryIcon sx={{ fontSize: 18, color: "secondary.main" }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ display: "block" }} noWrap>
                {ativo ? NOMES_ALGORITMOS[ativo.nome] : "Modelo não treinado"}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {ativo ? `Acurácia ${(ativo.acuracia * 100).toFixed(1)}%` : "—"}
                {ativo?.f1 != null ? ` · F1 ${(ativo.f1 * 100).toFixed(1)}%` : ""}
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Versão {VERSAO_SISTEMA}
            {metricas?._dataset ? ` · ${metricas._dataset.n_exemplos} exemplos de treino` : ""}
          </Typography>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, minWidth: 0 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
