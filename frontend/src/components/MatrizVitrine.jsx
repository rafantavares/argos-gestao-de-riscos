import { Box, Typography } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { faixaExposicao } from "../constants";

// Vitrine da tela de login: a matriz de risco do próprio Argos (probabilidade ×
// impacto, nas cores do tema), com as células acendendo uma vez ao abrir, e o
// cartão de um plano recomendado pela IA. Conteúdo ilustrativo, sem dados reais.

// Quantidade de riscos em cada célula ("probabilidade-impacto").
const CONTAGEM = { "5-3": 1, "4-2": 2, "4-4": 1, "4-5": 1, "3-3": 3, "3-4": 1, "2-2": 2, "2-4": 1, "1-1": 1 };
const DESTAQUE = "4-5";

export default function MatrizVitrine() {
  return (
    <Box aria-hidden="true" sx={{ position: "relative", width: "100%", maxWidth: 360, pb: 9 }}>
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          boxShadow: "0 24px 60px var(--argos-sombra)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 1.75 }}>
          <Typography sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: 15 }}>Matriz do projeto</Typography>
          <Typography variant="caption" color="text.secondary">
            probabilidade × impacto
          </Typography>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "16px repeat(5, minmax(0, 1fr))", gap: "5px", alignItems: "center" }}>
          {[5, 4, 3, 2, 1].map((p, linha) => (
            <Box key={p} sx={{ display: "contents" }}>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", fontSize: 11 }}>
                {p}
              </Typography>
              {[1, 2, 3, 4, 5].map((i, coluna) => {
                const chave = `${p}-${i}`;
                const n = CONTAGEM[chave] ?? 0;
                const faixa = faixaExposicao(p * i);
                const destaque = chave === DESTAQUE;
                return (
                  <Box
                    key={chave}
                    sx={{
                      aspectRatio: "1.5",
                      borderRadius: 1.5,
                      display: "grid",
                      placeItems: "center",
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 700,
                      fontSize: 15,
                      color: faixa.corTexto,
                      bgcolor: n ? faixa.cor : `color-mix(in srgb, ${faixa.cor} 20%, transparent)`,
                      boxShadow: destaque ? "0 0 0 2px var(--argos-cartao), 0 0 0 4px var(--argos-texto)" : "none",
                      // As células acendem em diagonal, uma vez, ao abrir a página.
                      animation: "acender 420ms ease-out both",
                      animationDelay: `${120 + (linha + coluna) * 55}ms`,
                      "@keyframes acender": {
                        from: { opacity: 0, transform: "scale(0.86)" },
                        to: { opacity: 1, transform: "scale(1)" },
                      },
                    }}
                  >
                    {n || ""}
                  </Box>
                );
              })}
            </Box>
          ))}
          <Box />
          {[1, 2, 3, 4, 5].map((i) => (
            <Typography key={i} variant="caption" color="text.secondary" sx={{ textAlign: "center", fontSize: 11 }}>
              {i}
            </Typography>
          ))}
        </Box>

      </Box>

      {/* Cartão do plano recomendado, sobreposto ao canto da matriz */}
      <Box
        sx={{
          position: "absolute",
          right: { xs: 8, sm: -24 },
          bottom: 0,
          width: { xs: "calc(100% - 16px)", sm: 320 },
          p: 1.75,
          borderRadius: 2.5,
          bgcolor: "var(--argos-elevada)",
          border: "1px solid color-mix(in srgb, var(--argos-ia) 40%, transparent)",
          boxShadow: "0 16px 40px var(--argos-sombra)",
          animation: "chegar 500ms ease-out 900ms both",
          "@keyframes chegar": {
            from: { opacity: 0, transform: "translateY(10px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
          <AutoAwesomeIcon sx={{ fontSize: 16, color: "secondary.main" }} />
          <Typography variant="caption" sx={{ color: "secondary.main", fontWeight: 600, whiteSpace: "nowrap" }}>
            Plano recomendado pela IA
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
          Ativar fornecedor alternativo já mapeado e acionar as cláusulas de contingência.
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
          <Box sx={{ flex: 1, height: 5, borderRadius: 3, bgcolor: "var(--argos-trilha)", overflow: "hidden" }}>
            <Box sx={{ width: "82%", height: "100%", bgcolor: "secondary.main", borderRadius: 3 }} />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            82% de confiança
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
