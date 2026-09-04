import { useEffect, useState } from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";
import { projetos as servicoProjetos, riscos as servicoRiscos } from "../../services/api";
import MatrizRisco from "../../components/MatrizRisco";

export default function Dashboard() {
  const [riscos, setRiscos] = useState([]);
  const [meusProjetos, setMeusProjetos] = useState([]);

  useEffect(() => {
    servicoRiscos.listarMeus().then(setRiscos);
    servicoProjetos.meus().then(setMeusProjetos);
  }, []);

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
      </Grid>

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
