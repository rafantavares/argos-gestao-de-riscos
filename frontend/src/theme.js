import { alpha, createTheme } from "@mui/material/styles";

// Identidade visual do Argos (design system). As cores da marca vêm da logo:
// ciano #2DD4BF (marca/ações), violeta #A78BFA (inteligência artificial) e o
// fundo #0B0E14. Ver docs/identidade-visual.md para o uso de cada token.
export const tokens = {
  marca: { main: "#2DD4BF", light: "#5EEAD4", dark: "#14B8A6" },
  ia: { main: "#A78BFA", light: "#C4B5FD", dark: "#8B5CF6" },
  // Superfícies em camadas: fundo < menu < cartão < elevado (menus, diálogos).
  superficie: {
    fundo: "#0B0E14",
    menu: "#0E121A",
    cartao: "#11161F",
    elevada: "#171D28",
    hover: "#1B2230",
  },
  borda: { suave: "#1F2633", padrao: "#262E3D", forte: "#343E50" },
  texto: { primario: "#E8ECF3", secundario: "#97A2B6", desabilitado: "#5E6879" },
  semantica: { sucesso: "#4ADE80", atencao: "#FBBF24", erro: "#F87171", info: "#60A5FA" },
  raio: { pequeno: 6, medio: 8, grande: 12 },
};

const { marca, ia, superficie, borda, texto, semantica, raio } = tokens;
const fonteTitulo = '"Space Grotesk", "IBM Plex Sans", sans-serif';
const transicao = "background-color 150ms ease, border-color 150ms ease, color 150ms ease, box-shadow 150ms ease";
const anelFoco = `0 0 0 3px ${alpha(marca.main, 0.22)}`;

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { ...marca, contrastText: superficie.fundo },
    secondary: { ...ia, contrastText: superficie.fundo },
    success: { main: semantica.sucesso, contrastText: superficie.fundo },
    warning: { main: semantica.atencao, contrastText: superficie.fundo },
    error: { main: semantica.erro, contrastText: superficie.fundo },
    info: { main: semantica.info, contrastText: superficie.fundo },
    background: { default: superficie.fundo, paper: superficie.cartao },
    text: { primary: texto.primario, secondary: texto.secundario, disabled: texto.desabilitado },
    divider: borda.padrao,
    action: {
      hover: alpha("#FFFFFF", 0.04),
      selected: alpha(marca.main, 0.1),
      focus: alpha(marca.main, 0.14),
      disabled: texto.desabilitado,
      disabledBackground: alpha("#FFFFFF", 0.06),
    },
  },
  shape: { borderRadius: raio.medio },
  spacing: 8,
  typography: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", Arial, sans-serif',
    fontSize: 14,
    h1: { fontFamily: fonteTitulo, fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontFamily: fonteTitulo, fontWeight: 700, letterSpacing: "-0.02em" },
    h3: { fontFamily: fonteTitulo, fontWeight: 700, letterSpacing: "-0.02em" },
    h4: { fontFamily: fonteTitulo, fontWeight: 600, letterSpacing: "-0.015em" },
    h5: { fontFamily: fonteTitulo, fontWeight: 600, fontSize: "1.5rem", letterSpacing: "-0.015em", lineHeight: 1.25 },
    h6: { fontFamily: fonteTitulo, fontWeight: 600, fontSize: "1.125rem", letterSpacing: "-0.01em" },
    subtitle1: { fontFamily: fonteTitulo, fontWeight: 600, fontSize: "1rem", letterSpacing: "-0.005em" },
    subtitle2: { fontWeight: 600, fontSize: "0.875rem" },
    body1: { fontSize: "0.9375rem", lineHeight: 1.6 },
    body2: { fontSize: "0.875rem", lineHeight: 1.55 },
    caption: { fontSize: "0.75rem", lineHeight: 1.5 },
    overline: { fontWeight: 600, letterSpacing: "0.08em", fontSize: "0.6875rem" },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: superficie.fundo,
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          // Números alinhados em tabelas, indicadores e notas.
          fontVariantNumeric: "tabular-nums",
        },
        "::selection": { backgroundColor: alpha(marca.main, 0.3) },
        "*::-webkit-scrollbar": { width: 10, height: 10 },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: borda.forte,
          borderRadius: 8,
          border: `2px solid ${superficie.fundo}`,
        },
        "*::-webkit-scrollbar-track": { backgroundColor: "transparent" },
        ":focus-visible": { outline: `2px solid ${marca.main}`, outlineOffset: 2 },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": { transitionDuration: "0.01ms !important", animationDuration: "0.01ms !important" },
        },
      },
    },

    // ---------- superfícies ----------
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none", border: `1px solid ${borda.padrao}` },
        rounded: { borderRadius: raio.grande },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: alpha(superficie.fundo, 0.82),
          backdropFilter: "saturate(140%) blur(10px)",
          color: texto.primario,
          border: 0,
          borderBottom: `1px solid ${borda.suave}`,
          borderRadius: 0,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: superficie.menu, border: 0, borderRight: `1px solid ${borda.suave}`, borderRadius: 0 },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: borda.suave } } },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: superficie.elevada,
          border: `1px solid ${borda.forte}`,
          borderRadius: 14,
          boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
        },
      },
    },
    MuiDialogTitle: { styleOverrides: { root: { fontFamily: fonteTitulo, fontWeight: 600, fontSize: "1.125rem" } } },
    MuiPopover: {
      styleOverrides: {
        paper: { backgroundColor: superficie.elevada, border: `1px solid ${borda.forte}`, boxShadow: "0 12px 32px rgba(0,0,0,0.45)" },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { backgroundColor: superficie.elevada, border: `1px solid ${borda.forte}`, boxShadow: "0 12px 32px rgba(0,0,0,0.45)" },
        list: { padding: 4 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: raio.pequeno,
          margin: "1px 0",
          fontSize: "0.875rem",
          "&.Mui-selected": { backgroundColor: alpha(marca.main, 0.12) },
          "&.Mui-selected:hover": { backgroundColor: alpha(marca.main, 0.18) },
        },
      },
    },

    // ---------- navegação ----------
    MuiListItemIcon: { styleOverrides: { root: { color: texto.secundario, minWidth: 36, transition: transicao } } },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          position: "relative",
          borderRadius: raio.medio,
          color: texto.secundario,
          transition: transicao,
          "&:hover": { backgroundColor: alpha("#FFFFFF", 0.04), color: texto.primario },
          "&.Mui-selected": {
            backgroundColor: alpha(marca.main, 0.1),
            color: texto.primario,
            "& .MuiListItemIcon-root": { color: marca.main },
            "&::before": {
              content: '""',
              position: "absolute",
              left: -12,
              top: 8,
              bottom: 8,
              width: 3,
              borderRadius: 3,
              backgroundColor: marca.main,
            },
            "&:hover": { backgroundColor: alpha(marca.main, 0.14) },
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44 },
        indicator: { height: 2, borderRadius: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          minHeight: 44,
          color: texto.secundario,
          transition: transicao,
          "&:hover": { color: texto.primario },
        },
      },
    },

    // ---------- ações ----------
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: raio.medio, transition: transicao, paddingInline: 14 },
        sizeSmall: { paddingInline: 10 },
        containedPrimary: { "&:hover": { backgroundColor: marca.light } },
        containedSecondary: { "&:hover": { backgroundColor: ia.light } },
        outlined: {
          borderColor: borda.forte,
          "&:hover": { borderColor: texto.secundario, backgroundColor: alpha("#FFFFFF", 0.03) },
        },
        outlinedPrimary: {
          borderColor: alpha(marca.main, 0.45),
          "&:hover": { borderColor: marca.main, backgroundColor: alpha(marca.main, 0.08) },
        },
        outlinedSecondary: {
          borderColor: alpha(ia.main, 0.45),
          "&:hover": { borderColor: ia.main, backgroundColor: alpha(ia.main, 0.08) },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: raio.medio, transition: transicao } },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderColor: borda.forte,
          color: texto.secundario,
          "&.Mui-selected": {
            backgroundColor: alpha(marca.main, 0.12),
            color: marca.main,
            "&:hover": { backgroundColor: alpha(marca.main, 0.18) },
          },
        },
      },
    },

    // ---------- formulários ----------
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: raio.medio,
          backgroundColor: alpha("#FFFFFF", 0.02),
          transition: transicao,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: borda.forte, transition: transicao },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#46526A" },
          "&.Mui-focused": { boxShadow: anelFoco, backgroundColor: alpha("#FFFFFF", 0.03) },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: marca.main, borderWidth: 1 },
          "&.Mui-error.Mui-focused": { boxShadow: `0 0 0 3px ${alpha(semantica.erro, 0.2)}` },
        },
        input: { "&::placeholder": { color: texto.desabilitado, opacity: 1 } },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { color: texto.secundario, "&.Mui-focused": { color: marca.main } } },
    },
    MuiFormHelperText: { styleOverrides: { root: { marginLeft: 2, fontSize: "0.75rem" } } },

    // ---------- dados ----------
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: raio.pequeno, fontWeight: 600 },
        sizeSmall: { height: 24, fontSize: "0.75rem" },
        outlined: { borderColor: borda.forte },
      },
    },
    MuiTableContainer: { styleOverrides: { root: { borderRadius: raio.grande } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${borda.suave}`, paddingTop: 10, paddingBottom: 10 },
        head: {
          color: texto.secundario,
          fontSize: "0.75rem",
          fontWeight: 600,
          letterSpacing: 0,
          backgroundColor: alpha("#FFFFFF", 0.02),
          borderBottom: `1px solid ${borda.padrao}`,
          whiteSpace: "nowrap",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: transicao,
          "&.MuiTableRow-hover:hover": { backgroundColor: alpha("#FFFFFF", 0.03) },
          "&:last-of-type td": { borderBottom: 0 },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: superficie.hover,
          border: `1px solid ${borda.forte}`,
          color: texto.primario,
          fontSize: "0.75rem",
          fontWeight: 500,
          padding: "6px 10px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        },
        arrow: { color: superficie.hover },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: raio.medio, alignItems: "center" },
        standardSuccess: { border: `1px solid ${alpha(semantica.sucesso, 0.3)}` },
        standardWarning: { border: `1px solid ${alpha(semantica.atencao, 0.3)}` },
        standardError: { border: `1px solid ${alpha(semantica.erro, 0.3)}` },
        standardInfo: { border: `1px solid ${alpha(semantica.info, 0.3)}` },
        filled: { boxShadow: "0 12px 32px rgba(0,0,0,0.45)" },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 4, backgroundColor: alpha("#FFFFFF", 0.06) } },
    },
    MuiSkeleton: { styleOverrides: { root: { backgroundColor: alpha("#FFFFFF", 0.06) } } },
    MuiAvatar: { styleOverrides: { root: { fontFamily: fonteTitulo, fontWeight: 700 } } },
  },
});

export default theme;
