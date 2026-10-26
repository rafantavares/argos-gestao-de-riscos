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

const LARGURA_MENU = { xs: 68, md: 252 };

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
      <Box
        component="a"
        href="#conteudo"
        sx={{
          position: "fixed",
          left: 12,
          top: -48,
          zIndex: (t) => t.zIndex.tooltip,
          px: 2,
          py: 1,
          borderRadius: 2,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          fontWeight: 600,
          textDecoration: "none",
          "&:focus": { top: 12 },
        }}
      >
        Pular para o conteúdo
      </Box>
      <AppBar position="fixed" sx={{ zIndex: (tema) => tema.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 1, minHeight: { xs: 60 }, px: { xs: 2, md: 3 } }}>
          <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
            <Logo size={26} fontSize={17} />
          </Box>
          <Tooltip title="Meu perfil">
            <Button
              color="inherit"
              onClick={() => navigate("/perfil")}
              sx={{
                gap: 1,
                pl: 0.75,
                pr: { xs: 0.75, sm: 1.5 },
                py: 0.5,
                color: "text.primary",
                border: 1,
                borderColor: "divider",
                borderRadius: 999,
                "&:hover": { borderColor: "text.secondary", bgcolor: "action.hover" },
              }}
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
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" }, fontSize: 13, fontWeight: 500 }}>
                {usuario.nome}
              </Box>
            </Button>
          </Tooltip>
          <Tooltip title="Sair da conta">
            <IconButton onClick={sair} aria-label="Sair" sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}>
              <LogoutIcon fontSize="small" />
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
        <Toolbar sx={{ minHeight: { xs: 60 } }} />

        {/* Perfil do usuário logado */}
        <Box
          sx={{
            mx: 1.5,
            mt: 2,
            mb: 1,
            p: 1.25,
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            gap: 1.25,
            borderRadius: 2,
            bgcolor: "background.paper",
            border: 1,
            borderColor: "divider",
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              fontSize: 14,
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

        <Typography
          variant="overline"
          sx={{ display: { xs: "none", md: "block" }, px: 3, pt: 1.5, color: "text.disabled" }}
        >
          Navegação
        </Typography>
        <List sx={{ px: 1.5, py: { xs: 1.5, md: 0.5 }, flexGrow: 1 }}>
          {itens.map((item) => (
            <Tooltip key={item.caminho} title={item.dica} placement="right" arrow enterDelay={500}>
              <ListItemButton
                selected={localizacao.pathname === item.caminho}
                onClick={() => navigate(item.caminho)}
                aria-label={item.rotulo}
                sx={{ mb: 0.5, py: 0.9, justifyContent: { xs: "center", md: "flex-start" } }}
              >
                <ListItemIcon sx={{ minWidth: { xs: 0, md: 36 } }}>{item.icone}</ListItemIcon>
                <ListItemText
                  primary={item.rotulo}
                  primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
                  sx={{ display: { xs: "none", md: "block" } }}
                />
                {item.caminho === "/gerente/riscos" && pendentesReavaliacao > 0 && (
                  <Tooltip title={`${pendentesReavaliacao} risco(s) sem reavaliação há 30 dias ou mais`} placement="right">
                    <Box
                      component="span"
                      sx={{
                        minWidth: 22,
                        height: 20,
                        px: 0.75,
                        borderRadius: 10,
                        bgcolor: "rgba(251, 146, 60, 0.16)",
                        border: "1px solid rgba(251, 146, 60, 0.45)",
                        color: "#FDBA74",
                        fontSize: 11,
                        fontWeight: 700,
                        display: "grid",
                        placeItems: "center",
                        position: { xs: "absolute", md: "static" },
                        top: { xs: 2 },
                        right: { xs: 4 },
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
            px: { xs: 0, md: 2.5 },
            py: 1.75,
            justifyContent: { xs: "center", md: "flex-start" },
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
          <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
            Sobre o Argos
          </Box>
          <Box component="span" sx={{ ml: "auto", opacity: 0.7, display: { xs: "none", md: "inline" } }}>
            v{VERSAO_SISTEMA}
          </Box>
        </Box>
      </Drawer>

      <Box component="main" id="conteudo" tabIndex={-1} sx={{ flexGrow: 1, minWidth: 0, px: { xs: 2, sm: 3, lg: 4 }, pb: 4 }}>
        <Toolbar sx={{ minHeight: { xs: 60 } }} />
        <Box sx={{ maxWidth: 1440, mx: "auto", pt: { xs: 2, md: 3 } }}>{children}</Box>
      </Box>
    </Box>
  );
}
