import { Box, Tooltip, Typography } from "@mui/material";
import { IMPACTOS, PROBABILIDADES, FAIXAS_EXPOSICAO, faixaExposicao } from "../constants";

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
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "28px repeat(5, minmax(0, 1fr))", sm: "92px repeat(5, minmax(0, 1fr))" }, gap: 0.75 }}>
        <Box />
        {IMPACTOS.map((impacto) => (
          <Typography
            key={impacto.value}
            variant="caption"
            align="center"
            sx={{ lineHeight: 1.2, color: "text.secondary", fontWeight: 500, fontSize: { xs: 10, sm: 12 }, pb: 0.5 }}
          >
            {impacto.value}
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              {" · "}
              {impacto.label}
            </Box>
          </Typography>
        ))}

        {probabilidadesDesc.map((probabilidade) => (
          <Box key={probabilidade.value} sx={{ display: "contents" }}>
            <Typography
              variant="caption"
              sx={{ alignSelf: "center", lineHeight: 1.2, color: "text.secondary", fontWeight: 500, fontSize: { xs: 10, sm: 12 }, textAlign: "right", pr: 1 }}
            >
              {probabilidade.value}
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                {" · "}
                {probabilidade.label}
              </Box>
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
                  <Box
                    component={aoClicarCelula && quantidade > 0 ? "button" : "div"}
                    type={aoClicarCelula && quantidade > 0 ? "button" : undefined}
                    aria-label={`Probabilidade ${probabilidade.value}, impacto ${impacto.value}: ${quantidade} ${quantidade === 1 ? "risco" : "riscos"}, ${faixa.label.toLowerCase()}`}
                    onClick={aoClicarCelula && quantidade > 0 ? () => aoClicarCelula(probabilidade.value, impacto.value) : undefined}
                    sx={{
                      // Célula vazia: a cor da faixa bem suave; ocupada: a cor cheia.
                      backgroundColor: quantidade === 0 ? `color-mix(in srgb, ${faixa.cor} 20%, transparent)` : faixa.cor,
                      color: faixa.corTexto,
                      border: 0,
                      borderRadius: 1.5,
                      height: { xs: 40, sm: 50 },
                      width: "100%",
                      p: 0,
                      font: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: aoClicarCelula && quantidade > 0 ? "pointer" : "default",
                      transition: "box-shadow 150ms ease",
                      "&:hover": quantidade > 0 ? { boxShadow: "0 0 0 2px var(--argos-cartao), 0 0 0 4px var(--argos-texto)" } : {},
                    }}
                  >
                    {quantidade > 0 && (
                      <Typography sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: { xs: 15, sm: 18 }, fontVariantNumeric: "tabular-nums" }}>
                        {quantidade}
                      </Typography>
                    )}
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        ))}
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 2 }}>
        {FAIXAS_EXPOSICAO.map((f) => (
          <Box key={f.label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: f.cor }} />
            <Typography variant="caption" color="text.secondary">
              {f.label}
            </Typography>
          </Box>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block", opacity: 0.8 }}>
        Linhas: probabilidade · Colunas: impacto · Cor: faixa da exposição (probabilidade × impacto)
      </Typography>
    </Box>
  );
}
