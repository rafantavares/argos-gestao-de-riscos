import { useEffect, useMemo, useState } from "react";
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
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchIcon from "@mui/icons-material/Search";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import { Link as LinkRouter, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePreferencias } from "../contexts/PreferenciasContext";
import { recomendacoes as servicoRecomendacoes, riscos as servicoRiscos } from "../services/api";
import { iniciais, precisaReavaliar } from "../constants";
import { misturar, v } from "../theme";
import { Logo } from "./Logo";
import LogoMark from "./Logo";
import BuscaGlobal, { ATALHO } from "./BuscaGlobal";
import Notificacoes, { itensPendentes } from "./Notificacoes";

const LARGURA_MENU = { xs: 68, md: 248 };
const ALTURA_TOPO = 64;

// Menu em grupos: acompanhar (ver a situação), decidir (IA) e gerenciar
// (cadastros). Todos os itens usam a mesma cor da marca.
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
      },
    ],
  },
  {
    titulo: "Gerenciar",
    itens: [{ rotulo: "Projetos", dica: "Seus projetos: crie novos ou edite os existentes", caminho: "/gerente/projetos", icone: <AccountTreeOutlinedIcon /> }],
  },
];

const PAGINAS_EXTRAS = [
  { caminho: "/configuracoes", titulo: "Configurações", grupo: "Conta", icone: <SettingsOutlinedIcon /> },
  { caminho: "/perfil", titulo: "Meu perfil", grupo: "Conta", icone: <PersonOutlineIcon /> },
];

// Páginas oferecidas na busca global (Ctrl+K).
const PAGINAS_BUSCA = [
  ...MENU.flatMap((g) => g.itens.map((i) => ({ caminho: i.caminho, titulo: i.rotulo, grupo: g.titulo, icone: i.icone }))),
  ...PAGINAS_EXTRAS,
  { caminho: "/configuracoes?aba=modelo", titulo: "Desempenho da IA", grupo: "Conta", icone: <PsychologyOutlinedIcon /> },
  { caminho: "/configuracoes?aba=sobre", titulo: "Sobre o Argos", grupo: "Conta", icone: <InfoOutlinedIcon /> },
].map((p) => ({ ...p, icone: <Box sx={{ display: "grid", "& svg": { fontSize: 18 } }}>{p.icone}</Box> }));

// Subpáginas que ganham um terceiro nível no caminho da barra superior.
const SUBPAGINAS = [{ padrao: /^\/gerente\/riscos\/\d+/, titulo: "Ficha do risco" }];

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

  const [riscos, setRiscos] = useState([]);
  const [recomendacoes, setRecomendacoes] = useState([]);
  const [buscaAberta, setBuscaAberta] = useState(false);

  // Riscos e recomendações para o badge do menu, as notificações e a busca:
  // carrega ao entrar e a cada 5 minutos (não a cada troca de página).
  useEffect(() => {
    const atualizar = () => {
      servicoRiscos.listarMeus().then(setRiscos).catch(() => {});
      servicoRecomendacoes.listarMinhas().then(setRecomendacoes).catch(() => {});
    };
    atualizar();
    const intervalo = setInterval(atualizar, 5 * 60 * 1000);
    return () => clearInterval(intervalo);
  }, []);

  // Ctrl+K (ou Cmd+K) abre a busca de qualquer página.
  useEffect(() => {
    const aoTeclar = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscaAberta((aberta) => !aberta);
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  const pendentesReavaliacao = useMemo(() => riscos.filter((r) => !r.arquivado && precisaReavaliar(r)).length, [riscos]);
  const pendencias = useMemo(() => itensPendentes(riscos, recomendacoes), [riscos, recomendacoes]);

  const menu = MENU;
  const cargo = "Gerente de projetos";

  // Título da barra superior: o item do menu (ou página extra) que está aberto.
  const atual =
    menu
      .flatMap((g) => g.itens.map((i) => ({ titulo: i.rotulo, grupo: g.titulo, caminho: i.caminho, icone: i.icone })))
      .find((i) => estaAtivo(i.caminho, pathname)) ?? PAGINAS_EXTRAS.find((p) => pathname.startsWith(p.caminho));
  const subpagina = SUBPAGINAS.find((s) => s.padrao.test(pathname));

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
          <Toolbar sx={{ gap: { xs: 1, sm: 1.5 }, minHeight: { xs: ALTURA_TOPO }, px: { xs: 2, sm: 3, lg: 4 } }}>
            {/* Página atual: ícone da seção + caminho (grupo › página › subpágina) */}
            <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 1.5 }}>
              {atual?.icone && (
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 38,
                    height: 38,
                    flex: "none",
                    borderRadius: 2,
                    display: { xs: "none", sm: "grid" },
                    placeItems: "center",
                    color: v("marca"),
                    bgcolor: misturar(v("marca"), 12),
                    border: `1px solid ${misturar(v("marca"), 25)}`,
                    "& svg": { fontSize: 20 },
                  }}
                >
                  {atual.icone}
                </Box>
              )}
              <Box sx={{ minWidth: 0 }}>
                <Box
                  component="nav"
                  aria-label="Caminho"
                  sx={{ display: "flex", alignItems: "center", gap: 0.25, color: "text.secondary", fontSize: 12, lineHeight: 1.3 }}
                >
                  <span>{atual?.grupo ?? "Argos"}</span>
                  {subpagina && atual && (
                    <>
                      <NavigateNextIcon sx={{ fontSize: 14 }} />
                      <Box
                        component={LinkRouter}
                        to={atual.caminho}
                        sx={{ color: "inherit", textDecoration: "none", "&:hover": { color: "text.primary", textDecoration: "underline" } }}
                      >
                        {atual.titulo}
                      </Box>
                    </>
                  )}
                </Box>
                <Typography component="p" variant="h6" noWrap sx={{ lineHeight: 1.25 }}>
                  {subpagina ? subpagina.titulo : atual?.titulo ?? "Argos"}
                </Typography>
              </Box>
            </Box>

            {/* Busca global */}
            <ButtonBase
              onClick={() => setBuscaAberta(true)}
              aria-label={`Buscar riscos, projetos e páginas (${ATALHO})`}
              sx={{
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                gap: 1.25,
                width: { md: 260, lg: 320 },
                height: 40,
                px: 1.5,
                borderRadius: 2,
                border: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
                color: "text.secondary",
                fontSize: 14,
                transition: "border-color 150ms ease",
                "&:hover": { borderColor: v("texto3") },
              }}
            >
              <SearchIcon fontSize="small" />
              <Box component="span" sx={{ flex: 1, textAlign: "left" }}>
                Buscar…
              </Box>
              <Box component="kbd" sx={{ fontFamily: "inherit", fontSize: 11, border: 1, borderColor: "divider", borderRadius: 1, px: 0.75, py: 0.1 }}>
                {ATALHO}
              </Box>
            </ButtonBase>
            <Tooltip title={`Buscar (${ATALHO})`}>
              <IconButton
                onClick={() => setBuscaAberta(true)}
                aria-label="Buscar riscos, projetos e páginas"
                sx={{ display: { xs: "inline-flex", md: "none" }, border: 1, borderColor: "divider", bgcolor: "background.paper", width: 40, height: 40 }}
              >
                <SearchIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Notificacoes itens={pendencias} />

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

        <BuscaGlobal aberta={buscaAberta} aoFechar={() => setBuscaAberta(false)} riscos={riscos} paginas={PAGINAS_BUSCA} />

        <Box component="main" id="conteudo" tabIndex={-1} sx={{ px: { xs: 2, sm: 3, lg: 4 }, pb: 4 }}>
          <Box sx={{ maxWidth: 1440, mx: "auto", pt: { xs: 2, md: 3 } }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}
