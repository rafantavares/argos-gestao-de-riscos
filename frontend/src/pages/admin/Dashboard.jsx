import { useEffect, useState } from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";
import { auth, projetos as servicoProjetos } from "../../services/api";

export default function Dashboard() {
  const [projetos, setProjetos] = useState([]);
  const [gerentes, setGerentes] = useState([]);

  useEffect(() => {
    servicoProjetos.listar().then(setProjetos);
    auth.listarGerentes().then(setGerentes);
  }, []);

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica titulo="Projetos" valor={projetos.length} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CartaoEstatistica titulo="Gerentes" valor={gerentes.length} />
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Projetos recentes
      </Typography>
      <Paper sx={{ p: 2 }}>
        {projetos.length === 0 ? (
          <Typography color="text.secondary">Nenhum projeto cadastrado ainda.</Typography>
        ) : (
          projetos
            .slice(0, 5)
            .map((projeto) => (
              <Typography key={projeto.id} sx={{ py: 0.5 }}>
                {projeto.nome}
              </Typography>
            ))
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
