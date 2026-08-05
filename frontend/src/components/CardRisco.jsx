import { Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";
import {
  CATEGORIAS,
  CORES_SEVERIDADE,
  IMPACTOS,
  PROBABILIDADES,
  nivelSeveridade,
  rotulo,
} from "../constants";

export default function CardRisco({ risco, onClick }) {
  const severidade = nivelSeveridade(risco.probabilidade, risco.impacto);

  return (
    <Card variant="outlined">
      <CardActionArea onClick={onClick} sx={{ p: 1 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="subtitle1" fontWeight={600}>
              {risco.titulo}
            </Typography>
            <Chip
              label={severidade.toUpperCase()}
              size="small"
              sx={{ backgroundColor: CORES_SEVERIDADE[severidade], color: "#fff" }}
            />
          </Stack>

          {risco.descricao && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {risco.descricao}
            </Typography>
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
            <Chip label={rotulo(CATEGORIAS, risco.categoria)} size="small" variant="outlined" />
            <Chip
              label={`Prob.: ${rotulo(PROBABILIDADES, risco.probabilidade)}`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`Impacto: ${rotulo(IMPACTOS, risco.impacto)}`}
              size="small"
              variant="outlined"
            />
            <Chip label={risco.status} size="small" variant="outlined" />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
