import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { projetos as servicoProjetos, riscos as servicoRiscos } from "../../services/api";
import {
  CATEGORIAS,
  CORES_STATUS,
  IMPACTOS,
  PROBABILIDADES,
  STATUS_RISCO,
  rotulo,
} from "../../constants";
import { exportarCsv } from "../../utils/exportarCsv";

const COLUNAS_CSV = (nomeProjeto) => [
  { rotulo: "Projeto", valor: (r) => nomeProjeto(r.id_projeto) },
  { rotulo: "Título", valor: (r) => r.titulo },
  { rotulo: "Categoria", valor: (r) => rotulo(CATEGORIAS, r.categoria) },
  { rotulo: "Probabilidade", valor: (r) => rotulo(PROBABILIDADES, r.probabilidade) },
  { rotulo: "Impacto", valor: (r) => rotulo(IMPACTOS, r.impacto) },
  { rotulo: "Status", valor: (r) => rotulo(STATUS_RISCO, r.status) },
];

export default function Riscos() {
  const [riscos, setRiscos] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [filtroProjeto, setFiltroProjeto] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([servicoRiscos.listarTodosAdmin(), servicoProjetos.listar()]).then(
      ([listaRiscos, listaProjetos]) => {
        setRiscos(listaRiscos);
        setProjetos(listaProjetos);
        setCarregando(false);
      }
    );
  }, []);

  const nomeProjeto = (id) => projetos.find((p) => p.id === id)?.nome ?? `#${id}`;

  const riscosFiltrados = useMemo(
    () => (filtroProjeto ? riscos.filter((r) => r.id_projeto === filtroProjeto) : riscos),
    [riscos, filtroProjeto]
  );

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Riscos (todos os projetos)
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
          <TextField
            select
            label="Projeto"
            size="small"
            value={filtroProjeto}
            onChange={(e) => setFiltroProjeto(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {projetos.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.nome}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={riscosFiltrados.length === 0}
            onClick={() => exportarCsv("riscos-todos-projetos.csv", COLUNAS_CSV(nomeProjeto), riscosFiltrados)}
          >
            Exportar CSV
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Projeto</TableCell>
              <TableCell>Título</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Probabilidade</TableCell>
              <TableCell>Impacto</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!carregando && riscosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">Nenhum risco encontrado.</Typography>
                </TableCell>
              </TableRow>
            )}
            {riscosFiltrados.map((risco) => (
              <TableRow key={risco.id}>
                <TableCell>{nomeProjeto(risco.id_projeto)}</TableCell>
                <TableCell>{risco.titulo}</TableCell>
                <TableCell>{rotulo(CATEGORIAS, risco.categoria)}</TableCell>
                <TableCell>
                  <Chip size="small" label={rotulo(PROBABILIDADES, risco.probabilidade)} />
                </TableCell>
                <TableCell>
                  <Chip size="small" label={rotulo(IMPACTOS, risco.impacto)} />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={rotulo(STATUS_RISCO, risco.status)}
                    sx={{ color: CORES_STATUS[risco.status], borderColor: CORES_STATUS[risco.status] }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
