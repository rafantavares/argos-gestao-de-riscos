import { createTheme } from "@mui/material/styles";

// Identidade visual do Argos (design system). As cores da marca vêm da logo:
// ciano (marca/ações), violeta (inteligência artificial). Há dois modos, escuro
// (padrão) e claro; cada token vira uma variável CSS `--argos-*` trocada pelo
// atributo `data-tema` no <html>, então mudar de modo não re-renderiza nada.
// Ver docs/identidade-visual.md para o uso de cada token.
export const PALETAS = {
  dark: {
    marca: "#2DD4BF",
    marcaClara: "#5EEAD4",
    marcaEscura: "#14B8A6",
    ia: "#A78BFA",
    iaClara: "#C4B5FD",
    iaEscura: "#8B5CF6",
    // Superfícies em camadas: fundo < menu < cartão < elevada (menus, diálogos).
    fundo: "#0B0E14",
    menu: "#0E121A",
    cartao: "#11161F",
    elevada: "#171D28",
    hover: "#1B2230",
    bordaSuave: "#1F2633",
    borda: "#262E3D",
    bordaForte: "#343E50",
    texto: "#E8ECF3",
    texto2: "#97A2B6",
    texto3: "#5E6879",
    sobreTom: "#0B0E14",
    sobreposicao: "rgba(255, 255, 255, 0.04)",
    trilha: "rgba(255, 255, 255, 0.06)",
    sucesso: "#6CCB8B",
    atencao: "#F0CE65",
    erro: "#E5717A",
    info: "#6EA8FE",
    sombra: "rgba(0, 0, 0, 0.5)",
    // Séries de gráficos por categoria (ordem validada para daltonismo em barras empilhadas).
    serie0: "#3987E5",
    serie1: "#D95926",
    serie2: "#199E70",
    serie3: "#C98500",
  },
  light: {
    marca: "#0F766E",
    marcaClara: "#14B8A6",
    marcaEscura: "#115E59",
    ia: "#7C3AED",
    iaClara: "#8B5CF6",
    iaEscura: "#6D28D9",
    fundo: "#F6F8FB",
    menu: "#FFFFFF",
    cartao: "#FFFFFF",
    elevada: "#FFFFFF",
    hover: "#EEF2F7",
    bordaSuave: "#EDF1F6",
    borda: "#E2E7EF",
    bordaForte: "#CBD3DF",
    texto: "#0F172A",
    texto2: "#556074",
    texto3: "#94A3B8",
    sobreTom: "#FFFFFF",
    sobreposicao: "rgba(15, 23, 42, 0.04)",
    trilha: "rgba(15, 23, 42, 0.06)",
    sucesso: "#15803D",
    atencao: "#B45309",
    erro: "#B91C1C",
    info: "#1D4ED8",
    sombra: "rgba(15, 23, 42, 0.12)",
    serie0: "#2A78D6",
    serie1: "#EB6834",
    serie2: "#1BAF7A",
    serie3: "#EDA100",
  },
};

// Escala de exposição (Muito leve → Muito grave). Padrão: tradicional (verde →
// vermelho) em tons sóbrios, validada para daltonismo entre faixas vizinhas.
// "daltonico": uma família só (âmbar → carmim) em degraus de claridade, para o
// modo daltônico das configurações. `texto` = cor legível sobre cada faixa.
export const ESCALAS = {
  padrao: {
    dark: {
      cores: ["#3A8357", "#83B567", "#F0CE65", "#E48233", "#B93C4A"],
      texto: ["#FFFFFF", "#14180F", "#1A1606", "#1A0E06", "#FFFFFF"],
    },
    light: {
      cores: ["#1B683E", "#689D48", "#E6B22D", "#CF630D", "#A52932"],
      texto: ["#FFFFFF", "#14180F", "#1A1606", "#1A0E06", "#FFFFFF"],
    },
  },
  daltonico: {
    dark: {
      cores: ["#7B4F29", "#AE602C", "#DB6F3D", "#FE8160", "#FFA295"],
      texto: ["#FFFFFF", "#FFFFFF", "#1A0E08", "#1A0E08", "#1A0E08"],
    },
    light: {
      cores: ["#DFA779", "#D67F46", "#C75619", "#AF2F02", "#8D0C0D"],
      texto: ["#1A1206", "#1A1206", "#FFFFFF", "#FFFFFF", "#FFFFFF"],
    },
  },
};

const kebab = (nome) => nome.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`);

/** Referência a um token do tema: v("cartao") → "var(--argos-cartao)". */
export const v = (nome) => `var(--argos-${kebab(nome)})`;

/** Cor da faixa de exposição (0 = Muito leve … 4 = Muito grave). */
export const corExposicao = (indice) => `var(--argos-exp-${indice})`;
export const textoExposicao = (indice) => `var(--argos-exp-texto-${indice})`;

/** Cor translúcida a partir de qualquer cor, inclusive variáveis CSS. */
export const misturar = (cor, porcento) => `color-mix(in srgb, ${cor} ${porcento}%, transparent)`;

function variaveisEscala({ cores, texto }) {
  const vars = {};
  cores.forEach((cor, i) => {
    vars[`--argos-exp-${i}`] = cor;
    vars[`--argos-exp-texto-${i}`] = texto[i];
  });
  return vars;
}

function variaveis(modo) {
  const vars = {};
  Object.entries(PALETAS[modo]).forEach(([nome, valor]) => {
    vars[`--argos-${kebab(nome)}`] = valor;
  });
  return { ...vars, ...variaveisEscala(ESCALAS.padrao[modo]) };
}

function paletaMui(p, modo) {
  return {
    mode: modo,
    primary: { main: p.marca, light: p.marcaClara, dark: p.marcaEscura, contrastText: p.sobreTom },
    secondary: { main: p.ia, light: p.iaClara, dark: p.iaEscura, contrastText: p.sobreTom },
    success: { main: p.sucesso, contrastText: p.sobreTom },
    warning: { main: p.atencao, contrastText: p.sobreTom },
    error: { main: p.erro, contrastText: p.sobreTom },
    info: { main: p.info, contrastText: p.sobreTom },
    background: { default: p.fundo, paper: p.cartao },
    text: { primary: p.texto, secondary: p.texto2, disabled: p.texto3 },
    divider: p.borda,
  };
}

const raio = { pequeno: 6, medio: 8, grande: 12 };
const fonteTitulo = '"Space Grotesk", "IBM Plex Sans", sans-serif';
const transicao = "background-color 150ms ease, border-color 150ms ease, color 150ms ease, box-shadow 150ms ease";
const marca = v("marca");
const ia = v("ia");

const theme = createTheme({
  cssVariables: { colorSchemeSelector: "data-tema" },
  colorSchemes: {
    dark: { palette: paletaMui(PALETAS.dark, "dark") },
    light: { palette: paletaMui(PALETAS.light, "light") },
  },
  defaultColorScheme: "dark",
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
        ":root, [data-tema='dark']": { ...variaveis("dark"), colorScheme: "dark" },
        "[data-tema='light']": { ...variaveis("light"), colorScheme: "light" },
        "[data-tema='dark'][data-escala='daltonico']": variaveisEscala(ESCALAS.daltonico.dark),
        "[data-tema='light'][data-escala='daltonico']": variaveisEscala(ESCALAS.daltonico.light),
        // Documentos para impressão (PDF) usam sempre a escala do modo claro.
        ".documento-claro": variaveisEscala(ESCALAS.padrao.light),
        "[data-escala='daltonico'] .documento-claro": variaveisEscala(ESCALAS.daltonico.light),
        body: {
          backgroundColor: v("fundo"),
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          // Números alinhados em tabelas, indicadores e notas.
          fontVariantNumeric: "tabular-nums",
        },
        "::selection": { backgroundColor: misturar(marca, 30) },
        "*::-webkit-scrollbar": { width: 10, height: 10 },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: v("bordaForte"),
          borderRadius: 8,
          border: `2px solid ${v("fundo")}`,
        },
        "*::-webkit-scrollbar-track": { backgroundColor: "transparent" },
        ":focus-visible": { outline: `2px solid ${marca}`, outlineOffset: 2 },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": { transitionDuration: "0.01ms !important", animationDuration: "0.01ms !important" },
        },
      },
    },

    // ---------- superfícies ----------
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none", border: `1px solid ${v("borda")}` },
        rounded: { borderRadius: raio.grande },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: misturar(v("fundo"), 85),
          backdropFilter: "saturate(140%) blur(10px)",
          color: v("texto"),
          border: 0,
          borderBottom: `1px solid ${v("bordaSuave")}`,
          borderRadius: 0,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: v("menu"), border: 0, borderRight: `1px solid ${v("bordaSuave")}`, borderRadius: 0 },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: v("bordaSuave") } } },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: v("elevada"),
          border: `1px solid ${v("bordaForte")}`,
          borderRadius: 14,
          boxShadow: `0 24px 64px ${v("sombra")}`,
        },
      },
    },
    MuiDialogTitle: { styleOverrides: { root: { fontFamily: fonteTitulo, fontWeight: 600, fontSize: "1.125rem" } } },
    MuiPopover: {
      styleOverrides: {
        paper: { backgroundColor: v("elevada"), border: `1px solid ${v("bordaForte")}`, boxShadow: `0 12px 32px ${v("sombra")}` },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { backgroundColor: v("elevada"), border: `1px solid ${v("bordaForte")}`, boxShadow: `0 12px 32px ${v("sombra")}` },
        list: { padding: 4 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: raio.pequeno,
          margin: "1px 0",
          fontSize: "0.875rem",
          "&.Mui-selected": { backgroundColor: misturar(marca, 12) },
          "&.Mui-selected:hover": { backgroundColor: misturar(marca, 18) },
        },
      },
    },

    // ---------- navegação ----------
    MuiListItemIcon: { styleOverrides: { root: { color: v("texto2"), minWidth: 36, transition: transicao } } },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          position: "relative",
          borderRadius: raio.medio,
          color: v("texto2"),
          transition: transicao,
          "&:hover": { backgroundColor: v("sobreposicao"), color: v("texto") },
          "&.Mui-selected": {
            backgroundColor: misturar(marca, 10),
            color: v("texto"),
            "& .MuiListItemIcon-root": { color: marca },
            "&::before": {
              content: '""',
              position: "absolute",
              left: -12,
              top: 8,
              bottom: 8,
              width: 3,
              borderRadius: 3,
              backgroundColor: marca,
            },
            "&:hover": { backgroundColor: misturar(marca, 14) },
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
          color: v("texto2"),
          transition: transicao,
          "&:hover": { color: v("texto") },
        },
      },
    },

    // ---------- ações ----------
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: raio.medio, transition: transicao, paddingInline: 14 },
        sizeSmall: { paddingInline: 10 },
        containedPrimary: { "&:hover": { backgroundColor: v("marcaClara") } },
        containedSecondary: { "&:hover": { backgroundColor: v("iaClara") } },
        outlined: {
          borderColor: v("bordaForte"),
          "&:hover": { borderColor: v("texto2"), backgroundColor: v("sobreposicao") },
        },
        outlinedPrimary: {
          borderColor: misturar(marca, 45),
          "&:hover": { borderColor: marca, backgroundColor: misturar(marca, 8) },
        },
        outlinedSecondary: {
          borderColor: misturar(ia, 45),
          "&:hover": { borderColor: ia, backgroundColor: misturar(ia, 8) },
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
          borderColor: v("bordaForte"),
          color: v("texto2"),
          "&.Mui-selected": {
            backgroundColor: misturar(marca, 12),
            color: marca,
            "&:hover": { backgroundColor: misturar(marca, 18) },
          },
        },
      },
    },

    // ---------- formulários ----------
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: raio.medio,
          backgroundColor: v("sobreposicao"),
          transition: transicao,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: v("bordaForte"), transition: transicao },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: v("texto3") },
          "&.Mui-focused": { boxShadow: `0 0 0 3px ${misturar(marca, 22)}`, backgroundColor: "transparent" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: marca, borderWidth: 1 },
          "&.Mui-error.Mui-focused": { boxShadow: `0 0 0 3px ${misturar(v("erro"), 20)}` },
        },
        input: { "&::placeholder": { color: v("texto3"), opacity: 1 } },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { color: v("texto2"), "&.Mui-focused": { color: marca } } },
    },
    MuiFormHelperText: { styleOverrides: { root: { marginLeft: 2, fontSize: "0.75rem" } } },

    // ---------- dados ----------
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: raio.pequeno, fontWeight: 600 },
        sizeSmall: { height: 24, fontSize: "0.75rem" },
        outlined: { borderColor: v("bordaForte") },
      },
    },
    MuiTableContainer: { styleOverrides: { root: { borderRadius: raio.grande } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${v("bordaSuave")}`, paddingTop: 10, paddingBottom: 10 },
        head: {
          color: v("texto2"),
          fontSize: "0.75rem",
          fontWeight: 600,
          letterSpacing: 0,
          backgroundColor: v("sobreposicao"),
          borderBottom: `1px solid ${v("borda")}`,
          whiteSpace: "nowrap",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: transicao,
          "&.MuiTableRow-hover:hover": { backgroundColor: v("sobreposicao") },
          "&:last-of-type td": { borderBottom: 0 },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: v("hover"),
          border: `1px solid ${v("bordaForte")}`,
          color: v("texto"),
          fontSize: "0.75rem",
          fontWeight: 500,
          padding: "6px 10px",
          boxShadow: `0 8px 24px ${v("sombra")}`,
        },
        arrow: { color: v("hover") },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: raio.medio, alignItems: "center" },
        standardSuccess: { border: `1px solid ${misturar(v("sucesso"), 30)}` },
        standardWarning: { border: `1px solid ${misturar(v("atencao"), 30)}` },
        standardError: { border: `1px solid ${misturar(v("erro"), 30)}` },
        standardInfo: { border: `1px solid ${misturar(v("info"), 30)}` },
        filled: { boxShadow: `0 12px 32px ${v("sombra")}` },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 4, backgroundColor: v("trilha") } },
    },
    MuiSkeleton: { styleOverrides: { root: { backgroundColor: v("trilha") } } },
    MuiAvatar: { styleOverrides: { root: { fontFamily: fonteTitulo, fontWeight: 700 } } },
  },
});

export default theme;
