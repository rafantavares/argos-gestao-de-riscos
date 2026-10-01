import { createTheme } from "@mui/material/styles";

// Identidade visual do Argos. Ver docs/identidade-visual.md para a
// paleta completa, tipografia e onde cada token é usado no código.
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#2DD4BF", contrastText: "#0B0E14" },
    secondary: { main: "#A78BFA", contrastText: "#0B0E14" },
    success: { main: "#4ADE80", contrastText: "#0B0E14" },
    warning: { main: "#FBBF24", contrastText: "#0B0E14" },
    error: { main: "#F87171", contrastText: "#0B0E14" },
    background: { default: "#0B0E14", paper: "#12161F" },
    text: { primary: "#E6E9F0", secondary: "#8A93A6" },
    divider: "#262D3B",
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", Arial, sans-serif',
    h1: { fontFamily: '"Space Grotesk", sans-serif' },
    h2: { fontFamily: '"Space Grotesk", sans-serif' },
    h3: { fontFamily: '"Space Grotesk", sans-serif' },
    h4: { fontFamily: '"Space Grotesk", sans-serif' },
    h5: { fontFamily: '"Space Grotesk", sans-serif' },
    h6: { fontFamily: '"Space Grotesk", sans-serif' },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none", border: "1px solid #262D3B" },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: "#1A1F2B", color: "#E6E9F0" },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: "#1A1F2B", borderRight: "1px solid #262D3B" },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: { color: "#8A93A6", minWidth: 40 },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          "&.Mui-selected": {
            backgroundColor: "#2DD4BF",
            color: "#0B0E14",
            "& .MuiListItemIcon-root": { color: "#0B0E14" },
            "&:hover": { backgroundColor: "#2DD4BF" },
          },
        },
      },
    },
  },
});

export default theme;
