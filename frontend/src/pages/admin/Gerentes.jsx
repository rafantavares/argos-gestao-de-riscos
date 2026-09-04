import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import AddIcon from "@mui/icons-material/Add";
import { auth } from "../../services/api";

export default function Gerentes() {
  const [gerentes, setGerentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [erro, setErro] = useState("");

  async function carregar() {
    setCarregando(true);
    const dados = await auth.listarGerentes();
    setGerentes(dados);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Gerentes
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogoAberto(true)}>
          Novo gerente
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Cadastrado em</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!carregando && gerentes.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography color="text.secondary">Nenhum gerente cadastrado ainda.</Typography>
                </TableCell>
              </TableRow>
            )}
            {gerentes.map((gerente) => (
              <TableRow key={gerente.id}>
                <TableCell>{gerente.nome}</TableCell>
                <TableCell>{gerente.email}</TableCell>
                <TableCell>{new Date(gerente.criado_em).toLocaleDateString("pt-BR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <DialogoNovoGerente
        aberto={dialogoAberto}
        aoFechar={() => setDialogoAberto(false)}
        aoCriar={async (dados) => {
          setErro("");
          try {
            await auth.cadastrarGerente({ ...dados, perfil: "gerente" });
            setDialogoAberto(false);
            carregar();
          } catch (e) {
            setErro(e.response?.data?.detail ?? "Não foi possível cadastrar o gerente.");
          }
        }}
        erro={erro}
      />
    </Box>
  );
}

function DialogoNovoGerente({ aberto, aoFechar, aoCriar, erro }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  function aoEnviar(evento) {
    evento.preventDefault();
    aoCriar({ nome, email, senha });
  }

  return (
    <Dialog open={aberto} onClose={aoFechar} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={aoEnviar}>
        <DialogTitle>Novo gerente</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {erro && <Alert severity="error">{erro}</Alert>}
          <TextField
            label="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            autoFocus
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            label="Senha provisória"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            helperText="Mínimo de 8 caracteres"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={aoFechar}>Cancelar</Button>
          <Button type="submit" variant="contained">
            Cadastrar
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
