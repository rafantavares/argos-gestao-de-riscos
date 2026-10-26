import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { auth, riscos as servicoRiscos } from "../../services/api";
import TabelaDados from "../../components/TabelaDados";
import { iniciais } from "../../constants";

export default function Gerentes() {
  const [gerentes, setGerentes] = useState([]);
  const [riscos, setRiscos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [erro, setErro] = useState("");

  async function carregar() {
    setCarregando(true);
    const [listaGerentes, listaRiscos] = await Promise.all([auth.listarGerentes(), servicoRiscos.listarTodosAdmin()]);
    setGerentes(listaGerentes);
    setRiscos(listaRiscos);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const colunas = [
    {
      chave: "nome",
      rotulo: "Gerente",
      render: (g) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main", color: "var(--argos-sobre-tom)", fontSize: 13, fontWeight: 700 }}>
            {iniciais(g.nome)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {g.nome}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {g.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      chave: "riscos",
      rotulo: "Riscos gerenciados",
      largura: 170,
      render: (g) => {
        const total = riscos.filter((r) => r.id_gerente === g.id).length;
        return <Chip size="small" label={total} variant={total === 0 ? "outlined" : "filled"} />;
      },
    },
    {
      chave: "criado_em",
      rotulo: "Cadastrado em",
      largura: 150,
      render: (g) => new Date(g.criado_em).toLocaleDateString("pt-BR"),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Gerentes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Usuários com perfil de gerente de projetos. Vincule-os a projetos na tela de Projetos.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogoAberto(true)}>
          Novo gerente
        </Button>
      </Box>

      <TabelaDados
        colunas={colunas}
        linhas={gerentes}
        carregando={carregando}
        textoBusca={(g) => `${g.nome} ${g.email}`}
        placeholderBusca="Buscar gerente por nome ou email"
        vazio={{
          titulo: "Nenhum gerente cadastrado",
          descricao: "Cadastre um gerente para que ele possa registrar riscos e receber recomendações.",
          acao: (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogoAberto(true)}>
              Cadastrar gerente
            </Button>
          ),
        }}
      />

      <DialogoNovoGerente
        aberto={dialogoAberto}
        aoFechar={() => {
          setDialogoAberto(false);
          setErro("");
        }}
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

  useEffect(() => {
    if (aberto) {
      setNome("");
      setEmail("");
      setSenha("");
    }
  }, [aberto]);

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
          <TextField label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
