import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, GlobalStyles, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import LogoMark from "./Logo";

// Peças comuns dos documentos em PDF (relatório de riscos e ficha do risco):
// página clara A4, barra "Baixar PDF" (salvar em PDF do navegador) e cabeçalho.

export const COR = { texto: "#111827", suave: "#4B5563", linha: "#D1D5DB", fundo: "#F3F4F6", marca: "#0F766E" };

export function Secao({ numero, titulo, norma, children }) {
  return (
    <Box component="section" sx={{ mt: 3.5, breakInside: "avoid-page" }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, borderBottom: `2px solid ${COR.marca}`, pb: 0.5, mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, color: COR.texto }}>
          {numero}. {titulo}
        </Typography>
        {norma && <Typography sx={{ fontSize: 11, color: COR.suave, ml: "auto" }}>{norma}</Typography>}
      </Box>
      {children}
    </Box>
  );
}

export function Indicador({ valor, rotulo: nome, cor }) {
  return (
    <Box sx={{ flex: 1, border: `1px solid ${COR.linha}`, borderRadius: 1, p: 1.25, textAlign: "center" }}>
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: cor ?? COR.texto, lineHeight: 1.1 }}>{valor}</Typography>
      <Typography sx={{ fontSize: 11, color: COR.suave }}>{nome}</Typography>
    </Box>
  );
}

export const celula = { border: `1px solid ${COR.linha}`, padding: "5px 7px", fontSize: 11, color: COR.texto, verticalAlign: "top" };
export const cabecalho = { ...celula, background: COR.fundo, fontWeight: 700, textAlign: "left" };

export function Etiqueta({ cor, children }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 6px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        color: "#111827",
        background: `${cor}55`,
        border: `1px solid ${cor}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function DocumentoPdf({ titulo, subtitulo, responsavel, children }) {
  const navigate = useNavigate();
  const emitido = new Date();

  // Documento claro para impressão (o tema do sistema é escuro).
  useEffect(() => {
    const anterior = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#E5E7EB";
    return () => {
      document.body.style.backgroundColor = anterior;
    };
  }, []);

  return (
    <Box sx={{ py: { xs: 0, md: 3 }, "@media print": { py: 0 } }}>
      <GlobalStyles
        styles={{
          "@page": { size: "A4", margin: "14mm" },
          "@media print": { body: { backgroundColor: "#fff !important" } },
          "*": { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" },
        }}
      />
      <Box
        sx={{ maxWidth: 820, mx: "auto", mb: 2, px: 2, display: "flex", gap: 1.5, alignItems: "center", "@media print": { display: "none" } }}
      >
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ color: "#111827" }}>
          Voltar
        </Button>
        <Typography sx={{ flexGrow: 1, fontSize: 13, color: "#374151" }}>
          Em "Destino", escolha <strong>Salvar como PDF</strong>.
        </Typography>
        <Button variant="contained" startIcon={<PictureAsPdfIcon />} onClick={() => window.print()}>
          Baixar PDF
        </Button>
      </Box>
      <Box
        sx={{
          maxWidth: 820,
          mx: "auto",
          bgcolor: "#FFFFFF",
          color: COR.texto,
          p: { xs: 2.5, md: 5 },
          boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
          "@media print": { boxShadow: "none", p: 0, maxWidth: "none" },
          "& *": { fontFamily: '"IBM Plex Sans", Arial, sans-serif' },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, borderBottom: `3px solid ${COR.marca}`, pb: 1.5 }}>
          <Box sx={{ bgcolor: "#0B0E14", borderRadius: 1, p: 0.5, display: "flex" }}>
            <LogoMark size={34} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{titulo}</Typography>
            <Typography sx={{ fontSize: 12, color: COR.suave }}>{subtitulo}</Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: COR.marca }}>ARGOS</Typography>
            <Typography sx={{ fontSize: 11, color: COR.suave }}>
              Emitido em {emitido.toLocaleDateString("pt-BR")} às{" "}
              {emitido.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </Typography>
            <Typography sx={{ fontSize: 11, color: COR.suave }}>Responsável: {responsavel}</Typography>
          </Box>
        </Box>
        {children}
        <Typography sx={{ fontSize: 10, color: COR.suave, mt: 4, pt: 1, borderTop: `1px solid ${COR.linha}`, textAlign: "center" }}>
          Gerado pelo Argos — Sistema de Gestão de Riscos com Análise Preditiva · Base normativa: PMBOK e MR-MPS-SW:2023
          (GPR 10, GPR 10+, GPR 17, GPC 7). As recomendações do modelo apoiam a decisão; a decisão é do gerente.
        </Typography>
      </Box>
    </Box>
  );
}
