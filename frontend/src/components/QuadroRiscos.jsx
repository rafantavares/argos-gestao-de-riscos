import { useState } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { CORES_STATUS, STATUS_RISCO, precisaReavaliar } from "../constants";
import { ChipReavaliar, ChipSeveridade, Marcador } from "./Badges";
import MiniMatriz from "./MiniMatriz";

// Quadro Kanban do ciclo de vida do risco (MR-MPS-SW:2023, GPR 17): arrastar um
// cartão para outra coluna muda o status. Encerrado é estado final.
export default function QuadroRiscos({ riscos, projetoPorId, aoAbrir, aoMudarStatus }) {
  const [arrastando, setArrastando] = useState(null); // risco sendo arrastado
  const [colunaAlvo, setColunaAlvo] = useState(null);

  function soltar(status) {
    const risco = arrastando;
    setArrastando(null);
    setColunaAlvo(null);
    if (risco && risco.status !== status) aoMudarStatus(risco, status);
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(5, 260px)", lg: "repeat(5, minmax(0, 1fr))" },
        gap: 1.5,
        overflowX: "auto",
        pb: 1,
      }}
    >
      {STATUS_RISCO.map((coluna) => {
        const cor = CORES_STATUS[coluna.value];
        const lista = riscos.filter((r) => r.status === coluna.value);
        const podeSoltar = arrastando && arrastando.status !== "encerrado" && arrastando.status !== coluna.value;
        return (
          <Box
            key={coluna.value}
            onDragOver={(e) => {
              if (!podeSoltar) return;
              e.preventDefault();
              setColunaAlvo(coluna.value);
            }}
            onDragLeave={() => setColunaAlvo((atual) => (atual === coluna.value ? null : atual))}
            onDrop={(e) => {
              e.preventDefault();
              if (podeSoltar) soltar(coluna.value);
            }}
            sx={{
              borderRadius: 2,
              p: 1,
              minHeight: 320,
              bgcolor: colunaAlvo === coluna.value ? `color-mix(in srgb, ${cor} 10%, transparent)` : "var(--argos-sobreposicao)",
              border: "1px dashed",
              borderColor: colunaAlvo === coluna.value ? cor : "transparent",
              transition: "background-color 0.15s, border-color 0.15s",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 0.5, pb: 1, mb: 1, borderBottom: 1, borderColor: "divider" }}>
              <Marcador cor={cor} forma="circulo" tamanho={8} />
              <Typography component="h3" variant="body2" fontWeight={600} sx={{ flexGrow: 1 }}>
                {coluna.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {lista.length}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {lista.map((risco) => {
                const travado = risco.status === "encerrado";
                return (
                  <Paper
                    key={risco.id}
                    draggable={!travado}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      setArrastando(risco);
                    }}
                    onDragEnd={() => {
                      setArrastando(null);
                      setColunaAlvo(null);
                    }}
                    onClick={() => aoAbrir(risco)}
                    onKeyDown={(e) => e.key === "Enter" && aoAbrir(risco)}
                    tabIndex={0}
                    role="link"
                    aria-label={`Abrir ${risco.indice} ${risco.titulo}`}
                    sx={{
                      p: 1.25,
                      cursor: travado ? "pointer" : "grab",
                      opacity: arrastando?.id === risco.id ? 0.4 : 1,
                      transition: "border-color 150ms ease",
                      "&:hover": { borderColor: "var(--argos-borda-forte)" },
                    }}
                  >
                    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600 }}>
                          {risco.indice}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3, wordBreak: "break-word" }}>
                          {risco.titulo}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                          {projetoPorId.get(risco.id_projeto)?.nome ?? "—"}
                        </Typography>
                      </Box>
                      <MiniMatriz probabilidade={risco.probabilidade} impacto={risco.impacto} tamanho={6} folga={1.5} />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1, flexWrap: "wrap" }}>
                      <ChipSeveridade probabilidade={risco.probabilidade} impacto={risco.impacto} />
                      {precisaReavaliar(risco) && <ChipReavaliar />}
                    </Box>
                  </Paper>
                );
              })}
              {lista.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
                  {arrastando ? "Solte aqui" : "Nenhum risco"}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
