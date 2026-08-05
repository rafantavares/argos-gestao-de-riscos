import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { criarProjeto, listarProjetos } from "../services/projetos";
import { criarUsuario, listarUsuarios } from "../services/usuarios";
import { useAuth } from "../contexts/AuthContext";

const PROJETO_VAZIO = { nome: "", descricao: "", data_inicio: "", id_usuario: "" };
const GERENTE_VAZIO = { nome: "", email: "", senha: "" };

export default function Projetos() {
  const { usuario } = useAuth();
  const ehAdmin = usuario.perfil === "admin";

  const [projetos, setProjetos] = useState([]);
  const [gerentes, setGerentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [dialogProjeto, setDialogProjeto] = useState(false);
  const [formProjeto, setFormProjeto] = useState(PROJETO_VAZIO);
  const [erroProjeto, setErroProjeto] = useState("");

  const [dialogGerente, setDialogGerente] = useState(false);
  const [formGerente, setFormGerente] = useState(GERENTE_VAZIO);
  const [erroGerente, setErroGerente] = useState("");

  function carregarTudo() {
    setCarregando(true);
    const chamadas = ehAdmin
      ? Promise.all([listarProjetos(), listarUsuarios()])
      : listarProjetos().then((dados) => [dados, []]);

    chamadas
      .then(([dadosProjetos, dadosUsuarios]) => {
        setProjetos(dadosProjetos);
        setGerentes(dadosUsuarios.filter((u) => u.perfil === "gerente"));
      })
      .catch(() => setErro("Não foi possível carregar os projetos."))
      .finally(() => setCarregando(false));
  }

  useEffect(carregarTudo, [ehAdmin]);

  function nomeResponsavel(idUsuario) {
    return gerentes.find((g) => g.id === idUsuario)?.nome ?? `#${idUsuario}`;
  }

  async function handleCriarProjeto(evento) {
    evento.preventDefault();
    setErroProjeto("");
    try {
      await criarProjeto({ ...formProjeto, id_usuario: Number(formProjeto.id_usuario) });
      setDialogProjeto(false);
      setFormProjeto(PROJETO_VAZIO);
      carregarTudo();
    } catch {
      setErroProjeto("Não foi possível criar o projeto. Verifique os dados.");
    }
  }

  async function handleCriarGerente(evento) {
    evento.preventDefault();
    setErroGerente("");
    try {
      await criarUsuario({ ...formGerente, perfil: "gerente" });
      setDialogGerente(false);
      setFormGerente(GERENTE_VAZIO);
      carregarTudo();
    } catch {
      setErroGerente("Não foi possível criar o gerente (email já cadastrado?).");
    }
  }

  if (carregando) {
    return <Skeleton variant="rounded" height={300} />;
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          Projetos
        </Typography>
        {ehAdmin && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => setDialogGerente(true)}>
              Novo gerente
            </Button>
            <Button variant="contained" onClick={() => setDialogProjeto(true)}>
              Novo projeto
            </Button>
          </Stack>
        )}
      </Stack>

      {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Início</TableCell>
              {ehAdmin && <TableCell>Responsável</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {projetos.map((projeto) => (
              <TableRow key={projeto.id}>
                <TableCell>{projeto.nome}</TableCell>
                <TableCell>{projeto.status}</TableCell>
                <TableCell>{projeto.data_inicio}</TableCell>
                {ehAdmin && <TableCell>{nomeResponsavel(projeto.id_usuario)}</TableCell>}
              </TableRow>
            ))}
            {projetos.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary">Nenhum projeto cadastrado.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogProjeto} onClose={() => setDialogProjeto(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCriarProjeto}>
          <DialogTitle>Novo projeto</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Nome"
                required
                fullWidth
                value={formProjeto.nome}
                onChange={(e) => setFormProjeto({ ...formProjeto, nome: e.target.value })}
              />
              <TextField
                label="Descrição"
                fullWidth
                multiline
                minRows={2}
                value={formProjeto.descricao}
                onChange={(e) => setFormProjeto({ ...formProjeto, descricao: e.target.value })}
              />
              <TextField
                label="Data de início"
                type="date"
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={formProjeto.data_inicio}
                onChange={(e) => setFormProjeto({ ...formProjeto, data_inicio: e.target.value })}
              />
              <TextField
                label="Responsável (gerente)"
                select
                required
                fullWidth
                value={formProjeto.id_usuario}
                onChange={(e) => setFormProjeto({ ...formProjeto, id_usuario: e.target.value })}
              >
                {gerentes.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.nome} ({g.email})
                  </MenuItem>
                ))}
              </TextField>
              {erroProjeto && <Alert severity="error">{erroProjeto}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogProjeto(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Criar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={dialogGerente} onClose={() => setDialogGerente(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCriarGerente}>
          <DialogTitle>Novo gerente</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Nome"
                required
                fullWidth
                value={formGerente.nome}
                onChange={(e) => setFormGerente({ ...formGerente, nome: e.target.value })}
              />
              <TextField
                label="Email"
                type="email"
                required
                fullWidth
                value={formGerente.email}
                onChange={(e) => setFormGerente({ ...formGerente, email: e.target.value })}
              />
              <TextField
                label="Senha provisória"
                type="password"
                required
                fullWidth
                helperText="Mínimo de 8 caracteres"
                value={formGerente.senha}
                onChange={(e) => setFormGerente({ ...formGerente, senha: e.target.value })}
              />
              {erroGerente && <Alert severity="error">{erroGerente}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogGerente(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Criar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
