import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Grid,
  Paper,
  Skeleton,
  Typography,
} from "@mui/material";
import { listarProjetos } from "../services/projetos";
import { listarRiscos } from "../services/riscos";
import MatrizRisco from "../components/MatrizRisco";
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const { usuario } = useAuth();
  const [projetos, setProjetos] = useState([]);
  const [riscos, setRiscos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    Promise.all([listarProjetos(), listarRiscos()])
      .then(([dadosProjetos, dadosRiscos]) => {
        setProjetos(dadosProjetos);
        setRiscos(dadosRiscos);
      })
      .catch(() => setErro("Não foi possível carregar os dados do dashboard."))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) {
    return <Skeleton variant="rounded" height={300} />;
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Olá, {usuario.nome}
      </Typography>

      {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="overline" color="text.secondary">
              Projetos
            </Typography>
            <Typography variant="h3">{projetos.length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="overline" color="text.secondary">
              Riscos cadastrados
            </Typography>
            <Typography variant="h3">{riscos.length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="overline" color="text.secondary">
              Riscos em aberto
            </Typography>
            <Typography variant="h3">
              {riscos.filter((r) => r.status !== "encerrado").length}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Matriz de risco (probabilidade × impacto)
            </Typography>
            <MatrizRisco riscos={riscos} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
