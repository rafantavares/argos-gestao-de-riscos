import { Box, Paper, Tooltip, Typography } from "@mui/material";
import { IMPACTOS, PROBABILIDADES, faixaExposicao } from "../constants";

const MAXIMO_TITULOS_NA_DICA = 5;

// Matriz de probabilidade x impacto (escalas de 1 a 5), com a contagem de riscos
// em cada combinação. Probabilidade decresce de cima para baixo; impacto cresce
// da esquerda para a direita — convenção usual de matrizes de risco. A cor de
// cada célula é a faixa da exposição (probabilidade x impacto). No hover, cada
// célula mostra os riscos naquela posição.
export default function MatrizRisco({ riscos, aoClicarCelula }) {
  const probabilidadesDesc = [...PROBABILIDADES].reverse();

  function riscosDaCelula(probabilidade, impacto) {
    return riscos.filter((r) => r.probabilidade === probabilidade && r.impacto === impacto);
  }

  function conteudoDica(lista, probabilidade, impacto) {
    const pontuacao = probabilidade.value * impacto.value;
    const cabecalho = `Probabilidade ${probabilidade.value} (${probabilidade.label.toLowerCase()}) · impacto ${impacto.value} (${impacto.label.toLowerCase()}) · exposição ${pontuacao} (${faixaExposicao(pontuacao).label})`;
    if (lista.length === 0) {
      return `Nenhum risco — ${cabecalho}`;
    }
    const visiveis = lista.slice(0, MAXIMO_TITULOS_NA_DICA);
    const restantes = lista.length - visiveis.length;
    return (
      <Box sx={{ py: 0.5 }}>
        <Typography variant="caption" sx={{ display: "block", fontWeight: 700, mb: 0.5 }}>
          {cabecalho}
        </Typography>
        {visiveis.map((r) => (
          <Typography key={r.id} variant="caption" sx={{ display: "block" }}>
            • {r.indice} — {r.titulo}
          </Typography>
        ))}
        {restantes > 0 && (
          <Typography variant="caption" sx={{ display: "block", opacity: 0.7 }}>
            e mais {restantes} {restantes === 1 ? "risco" : "riscos"}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "88px repeat(5, 1fr)", gap: 0.8 }}>
        <Box />
        {IMPACTOS.map((impacto) => (
          <Typography key={impacto.value} variant="caption" align="center" fontWeight={600} sx={{ lineHeight: 1.2 }}>
            {impacto.value} · {impacto.label}
          </Typography>
        ))}

        {probabilidadesDesc.map((probabilidade) => (
          <Box key={probabilidade.value} sx={{ display: "contents" }}>
            <Typography variant="caption" fontWeight={600} sx={{ alignSelf: "center", lineHeight: 1.2 }}>
              {probabilidade.value} · {probabilidade.label}
            </Typography>
            {IMPACTOS.map((impacto) => {
              const faixa = faixaExposicao(probabilidade.value * impacto.value);
              const lista = riscosDaCelula(probabilidade.value, impacto.value);
              const quantidade = lista.length;
              return (
                <Tooltip
                  key={impacto.value}
                  title={conteudoDica(lista, probabilidade, impacto)}
                  arrow
                  placement="top"
                >
                  <Paper
                    elevation={0}
                    onClick={aoClicarCelula ? () => aoClicarCelula(probabilidade.value, impacto.value) : undefined}
                    sx={{
                      backgroundColor: quantidade === 0 ? "transparent" : faixa.cor,
                      border: quantidade === 0 ? `1px dashed ${faixa.cor}66` : "none",
                      color: quantidade === 0 ? "text.secondary" : "#0B0E14",
                      height: 52,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: quantidade > 0 ? "pointer" : "default",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                      "&:hover": quantidade > 0 ? { transform: "scale(1.04)", boxShadow: 3 } : {},
                    }}
                  >
                    <Typography variant="h6">{quantidade}</Typography>
                  </Paper>
                </Tooltip>
              );
            })}
          </Box>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
        Linhas: probabilidade · Colunas: impacto · Cor: faixa da exposição (probabilidade × impacto)
      </Typography>
    </Box>
  );
}
