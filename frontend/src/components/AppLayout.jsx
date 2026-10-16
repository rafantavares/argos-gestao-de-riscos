import { useEffect, useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
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
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { riscos as servicoRiscos } from "../services/api";
import { VERSAO_SISTEMA, iniciais, precisaReavaliar } from "../constants";
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
  {
    rotulo: "Assistente IA",
    dica: "Descreva um problema e receba sugestões de registro e tratamento do risco",
    caminho: "/gerente/assistente",
    icone: <ForumOutlinedIcon />,
  },
];

export default function AppLayout({ children }) {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
  const localizacao = useLocation();

  const [pendentesReavaliacao, setPendentesReavaliacao] = useState(0);


  // Badge de riscos que precisam de reavaliação: carrega ao entrar e a cada
  // 5 minutos (não a cada troca de página, para não pesar na API).
  useEffect(() => {
    if (usuario.perfil !== "gerente") return undefined;
    const atualizar = () =>
      servicoRiscos
        .listarMeus()
        .then((lista) => setPendentesReavaliacao(lista.filter(precisaReavaliar).length))
        .catch(() => {});
    atualizar();
    const intervalo = setInterval(atualizar, 5 * 60 * 1000);
    return () => clearInterval(intervalo);
  }, [usuario.perfil]);

  const ehAdmin = usuario.perfil === "admin";
  const itens = ehAdmin ? ITENS_ADMIN : ITENS_GERENTE;
  const cargo = ehAdmin ? "Administrador" : "Gerente de projetos";

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: (tema) => tema.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Logo size={26} fontSize={18} />
          </Box>
          <Tooltip title="Meu perfil">
            <Button
              color="inherit"
              onClick={() => navigate("/perfil")}
              sx={{ textTransform: "none", gap: 1, px: 1, color: "text.secondary" }}
            >
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  fontSize: 12,
                  fontWeight: 700,
                  bgcolor: ehAdmin ? "secondary.main" : "primary.main",
                  color: "#0B0E14",
                }}
              >
                {iniciais(usuario.nome)}
              </Avatar>
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" }, fontSize: 14 }}>
                {usuario.nome}
              </Box>
            </Button>
          </Tooltip>
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
                {item.caminho === "/gerente/riscos" && pendentesReavaliacao > 0 && (
                  <Tooltip title={`${pendentesReavaliacao} risco(s) sem reavaliação há 30 dias ou mais`} placement="right">
                    <Box
                      component="span"
                      sx={{
                        minWidth: 22,
                        height: 22,
                        px: 0.75,
                        borderRadius: 11,
                        bgcolor: "#FB923C",
                        color: "#0B0E14",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {pendentesReavaliacao}
                    </Box>
                  </Tooltip>
                )}
              </ListItemButton>
            </Tooltip>
          ))}
        </List>

        {/* Sobre o sistema (glossário, base normativa e informações do modelo) */}
        <Divider />
        <Box
          component="button"
          type="button"
          onClick={() => navigate("/sobre")}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            width: "100%",
            px: 2,
            py: 1.5,
            border: 0,
            bgcolor: "transparent",
            cursor: "pointer",
            font: "inherit",
            fontSize: 12,
            color: localizacao.pathname === "/sobre" ? "text.primary" : "text.secondary",
            "&:hover": { color: "text.primary" },
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 15 }} />
          <span>Sobre o Argos</span>
          <Box component="span" sx={{ ml: "auto", opacity: 0.7 }}>
            v{VERSAO_SISTEMA}
          </Box>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, minWidth: 0 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
