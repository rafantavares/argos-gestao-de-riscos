# Identidade visual — Escopilot

Referência da identidade visual da plataforma, pra não precisar redescobrir
decisões nem redesenhar do zero quando for mexer em algo relacionado a marca.

## Nome

**Escopilot** — combinação de "escopo" (de projeto/risco) com "pilot"
(copiloto de decisão), com o eco proposital de "copilot" remetendo a um
assistente de IA guiando a decisão.

## Paleta de cores

| Token              | Hex       | Uso                                              |
|--------------------|-----------|---------------------------------------------------|
| Base               | `#0B0E14` | Fundo da página (`palette.background.default`)   |
| Superfície         | `#12161F` | Cards, Paper (`palette.background.paper`)        |
| Elevada            | `#1A1F2B` | AppBar, Drawer/sidebar                           |
| Borda              | `#262D3B` | Divisores e bordas de card (`palette.divider`)   |
| Texto primário     | `#E6E9F0` | `palette.text.primary`                           |
| Texto secundário   | `#8A93A6` | `palette.text.secondary`                         |
| Acento (marca)     | `#2DD4BF` | `palette.primary.main` — ações, nav ativo, marca |
| Acento IA          | `#A78BFA` | `palette.secondary.main` — recomendações de ML   |
| Severidade baixo   | `#4ADE80` | `palette.success.main` / `CORES_SEVERIDADE.baixo`|
| Severidade médio   | `#FBBF24` | `palette.warning.main` / `CORES_SEVERIDADE.medio`|
| Severidade alto    | `#F87171` | `palette.error.main` / `CORES_SEVERIDADE.alto`   |

Texto sobre as cores de acento e de severidade (todas claras/vibrantes) usa
`#0B0E14` (a cor base) para contraste, não branco.

A cor de marca (acento) é separada das cores de severidade de propósito —
evita confundir "isso é uma ação do sistema" com "esse risco é grave".

## Tipografia

- **Space Grotesk** (500/600/700) — títulos, marca, destaques (`h1`-`h6` no tema).
- **IBM Plex Sans** (400/500/600) — corpo de texto e UI (fonte padrão do tema).
- Carregadas via Google Fonts em `frontend/index.html`.

## Logo

Marca provisória: bússola (círculo + agulha) em `#2DD4BF`, com um ponto em
`#A78BFA` na ponta representando a predição da IA. **O Rafael vai mandar uma
logo definitiva depois** — quando isso acontecer, trocar:

- `frontend/src/components/Logo.jsx` (mark SVG usado no app)
- `frontend/public/favicon.svg` (ícone da aba do navegador)

O resto do sistema (cores, tipografia) não depende do desenho da marca e não
precisa mudar.

## Onde cada coisa vive no código

- `frontend/src/theme.js` — paleta completa do MUI (dark mode) + tipografia +
  overrides de componente (AppBar/Drawer usam a cor "elevada", item de menu
  ativo usa preenchimento sólido do acento em vez de borda lateral).
- `frontend/src/constants.js` — `CORES_SEVERIDADE` (usado fora do tema do MUI,
  ex. na matriz de risco).
- `frontend/src/components/Logo.jsx` — marca + wordmark reutilizável.
- `frontend/public/favicon.svg` — ícone da aba.
- `frontend/index.html` — título da página e import das fontes.
