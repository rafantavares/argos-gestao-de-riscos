import { useNavigate } from "react-router-dom";
import { Box, Button, GlobalStyles, IconButton, Tooltip, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { FAIXAS_EXPOSICAO, IMPACTOS, PROBABILIDADES, faixaExposicao } from "../constants";
import LogoMark from "./Logo";

// Peças comuns dos documentos em PDF (relatório de riscos e ficha do risco):
// folha A4 clara, barra "Baixar PDF" (salvar em PDF do navegador), cabeçalho,
// seções numeradas, tabelas só com linhas horizontais e a gravidade sempre como
// marcador + texto, igual ao sistema. As cores vêm da paleta clara do tema (a
// classe documento-claro no <body>), inclusive a escala do modo daltônico.

const TITULO = '"Space Grotesk", "IBM Plex Sans", sans-serif';
export const COR = {
  texto: "var(--argos-texto)",
  suave: "var(--argos-texto2)",
  fraco: "var(--argos-texto3)",
  linha: "var(--argos-borda)",
  linhaForte: "var(--argos-borda-forte)",
  fundo: "var(--argos-fundo)",
  marca: "var(--argos-marca)",
};

// Estilos de célula das tabelas (linhas horizontais, sem grade).
export const celula = {
  borderBottom: `1px solid ${COR.linha}`,
  padding: "7px 8px",
  fontSize: 11.5,
  lineHeight: 1.45,
  color: COR.texto,
  verticalAlign: "top",
  textAlign: "left",
};
export const cabecalho = {
  ...celula,
  borderBottom: `1.5px solid ${COR.linhaForte}`,
  fontSize: 10.5,
  fontWeight: 600,
  color: COR.suave,
  whiteSpace: "nowrap",
  verticalAlign: "bottom",
};
const estiloTabela = { borderCollapse: "collapse", width: "100%", fontVariantNumeric: "tabular-nums" };

export function Tabela({ colunas, children }) {
  return (
    <table style={estiloTabela}>
      <thead>
        <tr>
          {colunas.map((c) => (
            <th key={typeof c === "string" ? c : c.rotulo} style={{ ...cabecalho, ...(typeof c === "string" ? {} : c.estilo) }}>
              {typeof c === "string" ? c : c.rotulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function Secao({ numero, titulo, norma, children }) {
  return (
    <Box component="section" sx={{ mt: 4.5, "&:first-of-type": { mt: 3.5 } }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.25, mb: 1.75, breakAfter: "avoid" }}>
        {numero != null && (
          <Typography component="span" sx={{ fontFamily: TITULO, fontSize: 13, fontWeight: 600, color: COR.marca }}>
            {String(numero).padStart(2, "0")}
          </Typography>
        )}
        <Typography component="h2" sx={{ fontFamily: TITULO, fontSize: 16, fontWeight: 600, color: COR.texto }}>
          {titulo}
        </Typography>
        {norma && <Typography sx={{ fontSize: 10.5, color: COR.suave, ml: "auto", whiteSpace: "nowrap" }}>{norma}</Typography>}
      </Box>
      {children}
    </Box>
  );
}

// Indicador numérico do resumo: número grande na cor do texto, rótulo abaixo.
export function Indicador({ valor, rotulo: nome, detalhe }) {
  return (
    <Box sx={{ py: 1.25, px: 1.5, bgcolor: COR.fundo, borderRadius: 1.5, breakInside: "avoid" }}>
      <Typography sx={{ fontFamily: TITULO, fontSize: 24, fontWeight: 600, lineHeight: 1.1, color: COR.texto, fontVariantNumeric: "tabular-nums" }}>
        {valor}
      </Typography>
      <Typography sx={{ fontSize: 11, color: COR.suave, mt: 0.25 }}>{nome}</Typography>
      {detalhe && <Box sx={{ mt: 0.5 }}>{detalhe}</Box>}
    </Box>
  );
}

export function Indicadores({ children }) {
  return <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1.25 }}>{children}</Box>;
}

// Gravidade: quadradinho na cor da faixa + texto na cor do texto.
export function MarcadorFaixa({ pontuacao, rotulo: texto }) {
  const faixa = faixaExposicao(pontuacao);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: faixa.cor, flex: "none" }} />
      {texto ?? `${pontuacao} · ${faixa.label}`}
    </span>
  );
}

// Compatibilidade: etiqueta de gravidade antiga vira marcador + texto.
export function Etiqueta({ cor, children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: cor, flex: "none" }} />
      {children}
    </span>
  );
}

// Barra empilhada com a quantidade de riscos em cada faixa, com legenda.
export function DistribuicaoFaixas({ riscos }) {
  const contagem = FAIXAS_EXPOSICAO.map((f) => ({ ...f, n: riscos.filter((r) => faixaExposicao(r.exposicao).indice === f.indice).length }));
  const total = contagem.reduce((s, f) => s + f.n, 0);
  return (
    <Box sx={{ breakInside: "avoid" }}>
      <Box sx={{ display: "flex", gap: "2px", height: 12, borderRadius: "3px", overflow: "hidden", bgcolor: COR.fundo }}>
        {contagem
          .filter((f) => f.n)
          .map((f) => (
            <Box key={f.label} sx={{ flex: f.n, bgcolor: f.cor }} />
          ))}
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "4px 18px", mt: 1 }}>
        {contagem.map((f) => (
          <Typography key={f.label} sx={{ fontSize: 11, color: COR.suave, display: "inline-flex", alignItems: "center", gap: 0.75 }}>
            <Box component="span" sx={{ width: 9, height: 9, borderRadius: "2px", bgcolor: f.cor }} />
            {f.label}
            <Box component="strong" sx={{ color: COR.texto, fontWeight: 600 }}>
              {f.n}
            </Box>
            {total > 0 && <span>({Math.round((f.n / total) * 100)}%)</span>}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

// Matriz 5×5 (probabilidade × impacto) com a contagem de riscos: células na cor
// da faixa (cheia quando há riscos, bem suave quando vazia), como no sistema.
export function MatrizPdf({ riscos }) {
  const rotuloEixo = { fontSize: 10, color: COR.suave, padding: "0 8px", whiteSpace: "nowrap" };
  return (
    <Box sx={{ display: "flex", justifyContent: "center", breakInside: "avoid" }}>
      <table style={{ borderCollapse: "separate", borderSpacing: 4 }}>
        <tbody>
          {[...PROBABILIDADES].reverse().map((p, linha) => (
            <tr key={p.value}>
              {linha === 0 && (
                <td rowSpan={5} style={{ ...rotuloEixo, writingMode: "vertical-rl", transform: "rotate(180deg)", textAlign: "center", fontWeight: 600 }}>
                  Probabilidade
                </td>
              )}
              <td style={{ ...rotuloEixo, textAlign: "right" }}>
                {p.value} · {p.label}
              </td>
              {IMPACTOS.map((i) => {
                const n = riscos.filter((r) => r.probabilidade === p.value && r.impacto === i.value).length;
                const faixa = faixaExposicao(p.value * i.value);
                return (
                  <td
                    key={i.value}
                    style={{
                      width: 62,
                      height: 34,
                      borderRadius: 5,
                      textAlign: "center",
                      fontFamily: TITULO,
                      fontWeight: 700,
                      fontSize: 14,
                      color: faixa.corTexto,
                      background: n ? faixa.cor : `color-mix(in srgb, ${faixa.cor} 18%, transparent)`,
                    }}
                  >
                    {n || ""}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td />
            <td />
            {IMPACTOS.map((i) => (
              <td key={i.value} style={{ ...rotuloEixo, textAlign: "center", padding: "4px 0 0", whiteSpace: "normal", lineHeight: 1.25 }}>
                {i.value} · {i.label}
              </td>
            ))}
          </tr>
          <tr>
            <td />
            <td />
            <td colSpan={5} style={{ ...rotuloEixo, textAlign: "center", fontWeight: 600, paddingTop: 2 }}>
              Impacto
            </td>
          </tr>
        </tbody>
      </table>
    </Box>
  );
}

// Par rótulo: valor em duas colunas (rótulo estreito à esquerda).
export function Campos({ itens }) {
  const visiveis = itens.filter(([, valor]) => valor !== undefined);
  return (
    <Box component="dl" sx={{ display: "grid", gridTemplateColumns: "150px minmax(0, 1fr)", columnGap: 2, rowGap: 0.9, m: 0 }}>
      {visiveis.map(([nome, valor]) => (
        <Box key={nome} sx={{ display: "contents" }}>
          <Typography component="dt" sx={{ fontSize: 11, color: COR.suave, pt: "1px" }}>
            {nome}
          </Typography>
          <Typography component="dd" sx={{ fontSize: 12, color: valor ? COR.texto : COR.fraco, m: 0, lineHeight: 1.5 }}>
            {valor || "Não informado"}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

const CSS_PAGINA = `@page {
  size: A4;
  margin: 16mm 15mm 18mm;
  @bottom-left { content: "Argos · Gestão de riscos"; font: 8pt "IBM Plex Sans", Arial, sans-serif; color: #7A8497; }
  @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 8pt "IBM Plex Sans", Arial, sans-serif; color: #7A8497; }
}`;

export function DocumentoPdf({ titulo, subtitulo, rotulo: rotuloBarra, resumo, metadados = [], children }) {
  const navigate = useNavigate();

  return (
    <Box
      className="pdf-mesa"
      sx={{
        minHeight: "100vh",
        // "Mesa" em volta da folha, no tema do sistema (escuro ou claro).
        bgcolor: "color-mix(in srgb, var(--argos-texto) 7%, var(--argos-fundo))",
        "@media print": { bgcolor: "#fff", minHeight: 0 },
      }}
    >
      {/* Margens e rodapé da página impressa (número de página); CSS puro porque
          as regras aninhadas do @page não passam bem pelo GlobalStyles. */}
      <style>{CSS_PAGINA}</style>
      <GlobalStyles
        styles={{
          "@media print": { "html, body": { backgroundColor: "#fff !important" } },
          "*": { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" },
          "tr, img": { breakInside: "avoid" },
          thead: { display: "table-header-group" },
        }}
      />

      {/* Barra da pré-visualização (não sai na impressão) */}
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: { xs: 1, sm: 1.5 },
          px: { xs: 1.5, sm: 3 },
          minHeight: 64,
          bgcolor: "var(--argos-menu)",
          borderBottom: "1px solid var(--argos-borda-suave)",
          "@media print": { display: "none" },
        }}
      >
        <Tooltip title="Voltar">
          <IconButton onClick={() => navigate(-1)} aria-label="Voltar" sx={{ color: "text.secondary" }}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", pr: 1.5, mr: 0.5, borderRight: "1px solid var(--argos-borda)" }}>
          <LogoMark size={26} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" component="p" noWrap sx={{ lineHeight: 1.3 }}>
            {rotuloBarra ?? titulo}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="p">
            Pré-visualização · folha A4{resumo ? ` · ${resumo}` : ""}
          </Typography>
        </Box>
        <Tooltip
          title={
            <>
              Na janela que abrir, em &quot;Destino&quot;, escolha <strong>Salvar como PDF</strong>. Em &quot;Mais
              configurações&quot;, deixe marcado <strong>Gráficos de segundo plano</strong> para as cores saírem.
            </>
          }
        >
          <IconButton aria-label="Como salvar o PDF" sx={{ color: "text.secondary", display: { xs: "none", sm: "inline-flex" } }}>
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Button variant="contained" startIcon={<PictureAsPdfIcon />} onClick={() => window.print()}>
          Baixar PDF
        </Button>
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        component="p"
        sx={{ textAlign: "center", px: 2, pt: 2, "@media print": { display: "none" } }}
      >
        Ao salvar, escolha &quot;Salvar como PDF&quot; e mantenha &quot;Gráficos de segundo plano&quot; marcado.
      </Typography>

      {/* A folha: sempre na paleta clara (classe documento-claro), como no papel. */}
      <Box
        component="article"
        className="documento-claro"
        sx={{
          maxWidth: 840,
          minHeight: { md: 1188 },
          mx: "auto",
          my: { xs: 2, md: 3 },
          bgcolor: "#FFFFFF",
          color: COR.texto,
          px: { xs: 2.5, md: 6 },
          py: { xs: 3, md: 5.5 },
          borderRadius: "2px",
          boxShadow: "0 1px 2px rgba(15,23,42,0.08), 0 12px 40px rgba(15,23,42,0.18)",
          "@media print": { boxShadow: "none", p: 0, m: 0, maxWidth: "none", minHeight: 0, borderRadius: 0 },
          "& *": { fontFamily: '"IBM Plex Sans", Arial, sans-serif' },
          "& h1, & h2": { fontFamily: `${TITULO} !important` },
        }}
      >
        {/* Cabeçalho do documento */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LogoMark size={30} />
            <Typography sx={{ fontFamily: `${TITULO} !important`, fontWeight: 600, fontSize: 15, letterSpacing: "0.12em" }}>ARGOS</Typography>
          </Box>
          <Typography sx={{ fontSize: 11, color: COR.suave, textAlign: "right" }}>Gestão de riscos com análise preditiva</Typography>
        </Box>

        <Typography component="h1" sx={{ fontSize: 28, fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.01em" }}>
          {titulo}
        </Typography>
        {subtitulo && <Typography sx={{ fontSize: 14, color: COR.suave, mt: 0.75 }}>{subtitulo}</Typography>}

        {metadados.length > 0 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(metadados.length, 4)}, minmax(0, 1fr))`,
              gap: 2,
              mt: 2.5,
              pt: 1.75,
              borderTop: `1px solid ${COR.linha}`,
            }}
          >
            {metadados.map(([nome, valor]) => (
              <Box key={nome}>
                <Typography sx={{ fontSize: 10.5, color: COR.suave }}>{nome}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, mt: 0.25 }}>{valor}</Typography>
              </Box>
            ))}
          </Box>
        )}

        {children}

        <Typography
          sx={{ fontSize: 10, color: COR.suave, mt: 5, pt: 1.5, borderTop: `1px solid ${COR.linha}`, lineHeight: 1.5 }}
        >
          Gerado pelo Argos. Base normativa: PMBOK e MR-MPS-SW:2023 (GPR 10, GPR 10+, GPR 17, GPC 7). As recomendações do
          modelo apoiam a decisão; a decisão é do gerente do projeto.
        </Typography>
      </Box>
    </Box>
  );
}

export function quando() {
  const agora = new Date();
  return `${agora.toLocaleDateString("pt-BR")} às ${agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}
