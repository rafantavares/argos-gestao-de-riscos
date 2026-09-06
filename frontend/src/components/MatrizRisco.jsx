import { Box, Paper, Typography } from "@mui/material";
import { CORES_SEVERIDADE, IMPACTOS, PROBABILIDADES, nivelSeveridade } from "../constants";

// Matriz de probabilidade x impacto (PMBOK), com a contagem de riscos em cada
// combinação. Probabilidade decresce de cima para baixo; impacto cresce da
// esquerda para a direita — convenção usual de matrizes de risco.
export default function MatrizRisco({ riscos }) {
  const probabilidadesDesc = [...PROBABILIDADES].reverse();

  function contar(probabilidade, impacto) {
    return riscos.filter((r) => r.probabilidade === probabilidade && r.impacto === impacto)
      .length;
  }

  return (
    <Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "90px repeat(3, 1fr)", gap: 1 }}>
        <Box />
        {IMPACTOS.map((impacto) => (
          <Typography key={impacto.value} variant="caption" align="center" fontWeight={600}>
            {impacto.label}
          </Typography>
        ))}

        {probabilidadesDesc.map((probabilidade) => (
          <Box key={probabilidade.value} sx={{ display: "contents" }}>
            <Typography variant="caption" fontWeight={600} sx={{ alignSelf: "center" }}>
              {probabilidade.label}
            </Typography>
            {IMPACTOS.map((impacto) => {
              const severidade = nivelSeveridade(probabilidade.value, impacto.value);
              const quantidade = contar(probabilidade.value, impacto.value);
              return (
                <Paper
                  key={impacto.value}
                  elevation={0}
                  sx={{
                    backgroundColor: quantidade === 0 ? "transparent" : CORES_SEVERIDADE[severidade],
                    border: quantidade === 0 ? "1px dashed #262D3B" : "none",
                    color: quantidade === 0 ? "text.secondary" : "#0B0E14",
                    height: 64,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="h6">{quantidade}</Typography>
                </Paper>
              );
            })}
          </Box>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
        Linhas: probabilidade · Colunas: impacto
      </Typography>
    </Box>
  );
}
