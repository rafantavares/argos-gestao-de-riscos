# Identidade visual — Argos

Referência da identidade visual da plataforma, pra não precisar redescobrir
decisões nem redesenhar do zero quando for mexer em algo relacionado a marca.

## Nome

**Argos** (definido em 2026-10-01; antes, provisoriamente, "Escopilot") —
referência a Argos Panoptes, o gigante da mitologia grega com cem olhos que
nunca dormia por inteiro: sempre havia olhos abertos vigiando. É a metáfora do
monitoramento contínuo dos riscos (MR-MPS-SW:2023, GPR 17) e da antecipação de
problemas pela análise preditiva. Usado como nome próprio, não como sigla.
Na interface o nome aparece em maiúsculas ("ARGOS"), em Space Grotesk.

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

## Acessibilidade (Configurações › Preferências)

Preferências salvas no navegador (`PreferenciasContext`), aplicadas como
atributos no `<html>` antes do primeiro desenho (script em `index.html`):

- **Modo daltônico** (`data-escala="daltonico"`): a cor nunca é o único jeito
  de ler a gravidade (WCAG 1.4.1).
  - Escala de exposição de uma cor só, em degraus de claridade (`ESCALAS.daltonico`).
  - Cada faixa ganha uma forma no `Marcador`: ● Muito Leve, ■ Leve, ◆ Moderado,
    ▲ Grave, ★ Muito Grave.
  - A matriz mostra a exposição no canto de cada célula, e as células e barras
    ocupadas ganham textura (`texturaFaixa`), mais densa quanto mais grave.
  - Sucesso/erro passam de verde/vermelho para azul/magenta (`ESTADOS_DALTONICO`,
    Okabe-Ito), inclusive nas variáveis do MUI.
  - Os links ficam sublinhados.
- **Tamanho do texto** (`data-texto="grande"|"maior"`): 115% ou 130% no `<html>`.
  Todas as fontes são em `rem`; não use `fontSize` numérico (px), que não
  acompanha a preferência. A impressão (PDF) volta sempre a 100%.
- **Reduzir animações** (`data-movimento="reduzido"`): zera transições e
  animações em CSS, desliga o parallax do login e passa `skipAnimation` aos
  gráficos.

As cores de séries (`serie0`–`serie3`, usadas também pelos algoritmos em
`CORES_ALGORITMOS`) e os pares sucesso/atenção/erro foram conferidos com
simulação de protanopia e deuteranopia (diferença mínima ΔE ≥ 8).

## Tipografia

- **Space Grotesk** (500/600/700) — títulos, marca, destaques (`h1`-`h6` no tema).
- **IBM Plex Sans** (400/500/600) — corpo de texto e UI (fonte padrão do tema).
- Carregadas via Google Fonts em `frontend/index.html`.

## Logo

Letra **A** protegendo um **olho vigilante** (Argos), com uma **estrela de
quatro pontas** violeta no canto superior direito. A estrela é o mesmo símbolo
que a interface usa para as funções de IA, e o violeta é a cor da IA no tema.

- Arte original gerada por IA de imagem (ChatGPT) a partir de um prompt com o
  conceito do TCC, e **vetorizada à mão** em SVG a partir das medidas da
  imagem. Cores ajustadas para os tokens do tema: A e contorno do olho em
  `#2DD4BF`, íris e estrela em `#A78BFA`, pupila no fundo `#0B0E14`.
- `docs/argos-logo.svg` — logo completa (marca + nome), para documentos e slides.
- `frontend/src/components/Logo.jsx` — `FormasMarca` (as formas), `LogoMark`
  (ícone) e `Logo` (ícone + "ARGOS"), usados na barra superior e no login.
- `frontend/public/favicon.svg` — só o A com o olho (sem a estrela, para ficar
  legível a 16–32 px), sobre um quadrado arredondado escuro.

As formas estão no mesmo sistema de coordenadas nos três arquivos; se mudar o
desenho em um, replicar nos outros.

## Onde cada coisa vive no código

- `frontend/src/theme.js` — paleta completa do MUI (dark mode) + tipografia +
  overrides de componente (AppBar/Drawer usam a cor "elevada", item de menu
  ativo usa preenchimento sólido do acento em vez de borda lateral).
- `frontend/src/constants.js` — `CORES_SEVERIDADE` (usado fora do tema do MUI,
  ex. na matriz de risco).
- `frontend/src/components/Logo.jsx` — marca + wordmark reutilizável.
- `frontend/public/favicon.svg` — ícone da aba.
- `frontend/index.html` — título da página e import das fontes.
