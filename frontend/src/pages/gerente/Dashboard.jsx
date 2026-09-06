import { useEffect, useState } from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { projetos as servicoProjetos, riscos as servicoRiscos } from "../../services/api";
import MatrizRisco from "../../components/MatrizRisco";
import { CATEGORIAS, STATUS_RISCO } from "../../constants";

const ACENTO = "#2DD4BF";

export default function Dashboard() {
  const [riscos, setRiscos] = useState([]);
  const [meusProjetos, setMeusProjetos] = useState([]);

  useEffect(() => {
    servicoRiscos.listarMeus().then(setRiscos);
    servicoProjetos.meus().then(setMeusProjetos);
  }, []);

  const contagemPorStatus = STATUS_RISCO.map(
    (s) => riscos.filter((r) => r.status === s.value).length
  );
  const contagemPorCategoria = CATEGORIAS.map(
    (c) => riscos.filter((r) => r.categoria === c.value).length
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica titulo="Projetos vinculados" valor={meusProjetos.length} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica titulo="Riscos cadastrados" valor={riscos.length} />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Por categoria
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {CATEGORIAS.map((c, i) => (
                <Box
                  key={c.value}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 999,
                    bgcolor: "background.default",
                    border: "1px solid",
                    borderColor: "divider",
                    fontSize: 13,
                  }}
                >
                  {c.label}: <strong>{contagemPorCategoria[i]}</strong>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Matriz de risco
          </Typography>
          <Paper sx={{ p: 2 }}>
            {riscos.length === 0 ? (
              <Typography color="text.secondary">
                Cadastre um risco para ver a matriz preenchida.
              </Typography>
            ) : (
              <MatrizRisco riscos={riscos} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Riscos por status
          </Typography>
          <Paper sx={{ p: 2 }}>
            <BarChart
              height={260}
              xAxis={[{ data: STATUS_RISCO.map((s) => s.label), scaleType: "band" }]}
              series={[{ data: contagemPorStatus, label: "Riscos", color: ACENTO }]}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function CartaoEstatistica({ titulo, valor }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {titulo}
      </Typography>
      <Typography variant="h4" fontWeight={600}>
        {valor}
      </Typography>
    </Paper>
  );
}
