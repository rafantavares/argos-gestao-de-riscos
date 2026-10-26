import { useEffect, useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  ButtonBase,
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
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePreferencias } from "../contexts/PreferenciasContext";
import { riscos as servicoRiscos } from "../services/api";
import { iniciais, precisaReavaliar } from "../constants";
import { misturar, v } from "../theme";
import { Logo } from "./Logo";
import LogoMark from "./Logo";

const LARGURA_MENU = { xs: 68, md: 248 };
const ALTURA_TOPO = 64;

// Menu em grupos: acompanhar (ver a situação), decidir (IA) e gerenciar
// (cadastros). `ia: true` pinta o item de violeta, a cor da IA no Argos.
// Todo usuário é gerente de projetos (o perfil admin foi removido).
const MENU = [
  {
    titulo: "Acompanhar",
    itens: [
      { rotulo: "Visão geral", dica: "Matriz de risco, riscos críticos e ações pendentes", caminho: "/gerente", icone: <SpaceDashboardOutlinedIcon /> },
      { rotulo: "Riscos", dica: "Cadastro e acompanhamento dos riscos dos seus projetos", caminho: "/gerente/riscos", icone: <ReportProblemOutlinedIcon /> },
    ],
  },
  {
    titulo: "Decidir",
    itens: [
      {
        rotulo: "Assistente IA",
        dica: "Descreva um problema e receba sugestões de registro e tratamento do risco",
        caminho: "/gerente/assistente",
        icone: <AutoAwesomeOutlinedIcon />,
        ia: true,
      },
      {
        rotulo: "Modelo de IA",
        dica: "Desempenho dos algoritmos, o que pesa na decisão e as últimas recomendações",
        caminho: "/gerente/modelo",
        icone: <PsychologyOutlinedIcon />,
        ia: true,
      },
    ],
  },
  {
    titulo: "Gerenciar",
    itens: [
      { rotulo: "Projetos", dica: "Seus projetos: crie novos ou edite os existentes", caminho: "/gerente/projetos", icone: <AccountTreeOutlinedIcon /> },
      {
        rotulo: "Planos de contingência",
        dica: "Catálogo de planos que o modelo pode recomendar",
        caminho: "/gerente/planos",
        icone: <ShieldOutlinedIcon />,
      },
    ],
  },
];

const PAGINAS_EXTRAS = [
  { caminho: "/configuracoes", titulo: "Configurações", grupo: "Conta" },
  { caminho: "/perfil", titulo: "Meu perfil", grupo: "Conta" },
];

// Item ativo: a raiz (/gerente) só na própria página; os demais
// também nas subpáginas (ex.: /gerente/riscos/12/recomendacao).
function estaAtivo(caminho, pathname) {
  if (caminho === "/gerente") return pathname === caminho;
  return pathname === caminho || pathname.startsWith(`${caminho}/`);
}

function ItemRodape({ icone, rotulo, ativo, onClick, extra }) {
  return (
    <Tooltip title={rotulo} placement="right" enterDelay={500}>
      <ListItemButton
        selected={ativo}
        onClick={onClick}
        aria-label={rotulo}
        sx={{ py: 0.75, justifyContent: { xs: "center", md: "flex-start" } }}
      >
        <ListItemIcon sx={{ minWidth: { xs: 0, md: 36 } }}>{icone}</ListItemIcon>
        <ListItemText primary={rotulo} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} sx={{ display: { xs: "none", md: "block" } }} />
        {extra}
      </ListItemButton>
    </Tooltip>
  );
}

export default function AppLayout({ children }) {
  const { usuario } = useAuth();
  const { escuro, alternarModo } = usePreferencias();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [pendentesReavaliacao, setPendentesReavaliacao] = useState(0);

  // Badge de riscos que precisam de reavaliação: carrega ao entrar e a cada
  // 5 minutos (não a cada troca de página, para não pesar na API).
  useEffect(() => {
    const atualizar = () =>
      servicoRiscos
        .listarMeus()
        .then((lista) => setPendentesReavaliacao(lista.filter(precisaReavaliar).length))
        .catch(() => {});
    atualizar();
    const intervalo = setInterval(atualizar, 5 * 60 * 1000);
    return () => clearInterval(intervalo);
  }, []);

  const menu = MENU;
  const cargo = "Gerente de projetos";

  // Título da barra superior: o item do menu (ou página extra) que está aberto.
  const atual =
    menu.flatMap((g) => g.itens.map((i) => ({ titulo: i.rotulo, grupo: g.titulo, caminho: i.caminho }))).find((i) => estaAtivo(i.caminho, pathname)) ??
    PAGINAS_EXTRAS.find((p) => pathname.startsWith(p.caminho));

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
            px: 1.5,
          },
        }}
      >
        <Box sx={{ height: ALTURA_TOPO, display: "flex", alignItems: "center", px: { xs: 0, md: 1.5 }, justifyContent: { xs: "center", md: "flex-start" } }}>
          <Box sx={{ display: { xs: "none", md: "block" } }}>
            <Logo size={28} fontSize={18} />
          </Box>
          <Box sx={{ display: { xs: "flex", md: "none" } }}>
            <LogoMark size={30} />
          </Box>
        </Box>

        <Box component="nav" aria-label="Menu principal" sx={{ flexGrow: 1, overflowY: "auto", pt: 1 }}>
          {menu.map((grupo) => (
            <Box key={grupo.titulo} sx={{ mb: 2 }}>
              <Typography
                component="div"
                sx={{ display: { xs: "none", md: "block" }, px: 1.5, pb: 0.75, fontSize: 12, fontWeight: 600, color: "text.disabled" }}
              >
                {grupo.titulo}
              </Typography>
              <List disablePadding>
                {grupo.itens.map((item) => {
                  const ativo = estaAtivo(item.caminho, pathname);
                  const badge = item.caminho === "/gerente/riscos" && pendentesReavaliacao > 0 ? pendentesReavaliacao : null;
                  return (
                    <Tooltip key={item.caminho} title={item.dica} placement="right" arrow enterDelay={500}>
                      <ListItemButton
                        selected={ativo}
                        onClick={() => navigate(item.caminho)}
                        aria-label={item.rotulo}
                        aria-current={ativo ? "page" : undefined}
                        sx={{
                          mb: 0.25,
                          py: 0.85,
                          justifyContent: { xs: "center", md: "flex-start" },
                          ...(item.ia && {
                            "& .MuiListItemIcon-root": { color: v("ia") },
                            "&.Mui-selected": { backgroundColor: misturar(v("ia"), 12) },
                            "&.Mui-selected::before": { backgroundColor: v("ia") },
                            "&.Mui-selected .MuiListItemIcon-root": { color: v("ia") },
                          }),
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: { xs: 0, md: 36 } }}>{item.icone}</ListItemIcon>
                        <ListItemText
                          primary={item.rotulo}
                          primaryTypographyProps={{ fontSize: 14, fontWeight: ativo ? 600 : 500 }}
                          sx={{ display: { xs: "none", md: "block" } }}
                        />
                        {badge && (
                          <Tooltip title={`${badge} risco(s) sem reavaliação há 30 dias ou mais`} placement="right">
                            <Box
                              component="span"
                              sx={{
                                minWidth: 20,
                                height: 20,
                                px: 0.75,
                                borderRadius: 10,
                                bgcolor: misturar(v("atencao"), 16),
                                color: v("atencao"),
                                fontSize: 12,
                                fontWeight: 600,
                                display: "grid",
                                placeItems: "center",
                                position: { xs: "absolute", md: "static" },
                                top: { xs: 2 },
                                right: { xs: 4 },
                              }}
                            >
                              {badge}
                            </Box>
                          </Tooltip>
                        )}
                      </ListItemButton>
                    </Tooltip>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>

        {/* Rodapé do menu: configurações (inclui Sobre e Segurança) e o perfil */}
        <Box sx={{ borderTop: 1, borderColor: "divider", pt: 1, pb: 1.5 }}>
          <List disablePadding>
            <ItemRodape
              icone={<SettingsOutlinedIcon />}
              rotulo="Configurações"
              ativo={pathname === "/configuracoes" || pathname === "/sobre"}
              onClick={() => navigate("/configuracoes")}
            />
          </List>
          <Box sx={{ mt: 1, display: "flex" }}>
            <ButtonBase
              onClick={() => navigate("/perfil")}
              aria-label={`Meu perfil: ${usuario.nome}, ${cargo}`}
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: { xs: "center", md: "flex-start" },
                gap: 1.25,
                p: { xs: 0.5, md: 1 },
                borderRadius: 2.5,
                border: { md: 1 },
                borderColor: { md: pathname === "/perfil" ? misturar(v("marca"), 45) : "divider" },
                bgcolor: { md: "background.paper" },
                textAlign: "left",
                "&:hover": { borderColor: { md: "text.disabled" } },
              }}
            >
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  fontSize: 13,
                  bgcolor: misturar(v("marca"), 16),
                  color: v("marca"),
                }}
              >
                {iniciais(usuario.nome)}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1, display: { xs: "none", md: "block" } }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {usuario.nome}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                  {cargo}
                </Typography>
              </Box>
              <ChevronRightIcon fontSize="small" sx={{ color: "text.secondary", display: { xs: "none", md: "block" } }} />
            </ButtonBase>
          </Box>
        </Box>
      </Drawer>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <AppBar position="sticky">
          <Toolbar sx={{ gap: 2, minHeight: { xs: ALTURA_TOPO }, px: { xs: 2, sm: 3, lg: 4 } }}>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              {atual?.grupo && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
                  {atual.grupo}
                </Typography>
              )}
              <Typography component="p" variant="h6" noWrap sx={{ lineHeight: 1.3 }}>
                {atual?.titulo ?? "Argos"}
              </Typography>
            </Box>
            <Tooltip title={escuro ? "Usar modo claro" : "Usar modo escuro"}>
              <IconButton
                onClick={alternarModo}
                aria-label={escuro ? "Usar modo claro" : "Usar modo escuro"}
                sx={{ border: 1, borderColor: "divider", bgcolor: "background.paper", width: 40, height: 40 }}
              >
                {escuro ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box component="main" id="conteudo" tabIndex={-1} sx={{ px: { xs: 2, sm: 3, lg: 4 }, pb: 4 }}>
          <Box sx={{ maxWidth: 1440, mx: "auto", pt: { xs: 2, md: 3 } }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}
