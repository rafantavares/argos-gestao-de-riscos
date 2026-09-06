import LogoutIcon from "@mui/icons-material/Logout";
import {
  AppBar,
  Box,
  Chip,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FolderIcon from "@mui/icons-material/Folder";
import GroupIcon from "@mui/icons-material/Group";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Logo } from "./Logo";

const LARGURA_MENU = 220;

const ITENS_ADMIN = [
  { rotulo: "Dashboard", caminho: "/admin", icone: <DashboardIcon /> },
  { rotulo: "Projetos", caminho: "/admin/projetos", icone: <FolderIcon /> },
  { rotulo: "Gerentes", caminho: "/admin/gerentes", icone: <GroupIcon /> },
  { rotulo: "Riscos", caminho: "/admin/riscos", icone: <WarningAmberIcon /> },
  { rotulo: "Planos de contingência", caminho: "/admin/planos", icone: <AssignmentIcon /> },
];

const ITENS_GERENTE = [
  { rotulo: "Dashboard", caminho: "/gerente", icone: <DashboardIcon /> },
  { rotulo: "Riscos", caminho: "/gerente/riscos", icone: <WarningAmberIcon /> },
];

export default function AppLayout({ children }) {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
  const localizacao = useLocation();

  const itens = usuario.perfil === "admin" ? ITENS_ADMIN : ITENS_GERENTE;

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: (tema) => tema.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Logo size={26} fontSize={18} />
          </Box>
          <Chip
            label={usuario.perfil === "admin" ? "Admin" : "Gerente"}
            color="secondary"
            size="small"
          />
          <Typography variant="body2">{usuario.nome}</Typography>
          <IconButton color="inherit" onClick={sair} title="Sair">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: LARGURA_MENU,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: LARGURA_MENU, boxSizing: "border-box" },
        }}
      >
        <Toolbar />
        <List>
          {itens.map((item) => (
            <ListItemButton
              key={item.caminho}
              selected={localizacao.pathname === item.caminho}
              onClick={() => navigate(item.caminho)}
            >
              <ListItemIcon>{item.icone}</ListItemIcon>
              <ListItemText primary={item.rotulo} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
