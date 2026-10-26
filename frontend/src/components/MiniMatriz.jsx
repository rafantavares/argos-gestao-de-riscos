import { Box, Tooltip } from "@mui/material";
import { faixaExposicao } from "../constants";

// Matriz 5×5 em miniatura com a posição do risco acesa: mostra de onde vem a
// gravidade (probabilidade nas linhas, de 5 no topo a 1; impacto nas colunas).
export default function MiniMatriz({ probabilidade, impacto, tamanho = 7, folga = 2 }) {
  const celulas = [];
  for (let p = 5; p >= 1; p -= 1) {
    for (let i = 1; i <= 5; i += 1) {
      const atual = p === probabilidade && i === impacto;
      const cor = faixaExposicao(p * i).cor;
      celulas.push(
        <Box
          key={`${p}-${i}`}
          sx={{
            width: tamanho,
            height: tamanho,
            borderRadius: tamanho > 10 ? 0.75 : 0.25,
            bgcolor: cor,
            opacity: atual ? 1 : 0.28,
            // Anel em volta da posição do risco (vão na cor do cartão + contorno).
            boxShadow: atual ? "0 0 0 1.5px var(--argos-cartao), 0 0 0 3px var(--argos-texto)" : "none",
            position: atual ? "relative" : "static",
            zIndex: atual ? 1 : "auto",
          }}
        />
      );
    }
  }
  return (
    <Tooltip title={`Probabilidade ${probabilidade} × impacto ${impacto} = exposição ${probabilidade * impacto}`}>
      <Box
        role="img"
        aria-label={`Posição na matriz: probabilidade ${probabilidade}, impacto ${impacto}`}
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(5, ${tamanho}px)`,
          gap: `${folga}px`,
          flexShrink: 0,
        }}
      >
        {celulas}
      </Box>
    </Tooltip>
  );
}
