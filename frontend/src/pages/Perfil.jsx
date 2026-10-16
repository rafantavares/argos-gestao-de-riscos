import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Box, Button, Chip, Divider, Grid, Paper, Stack, TextField, Typography } from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import HistoryIcon from "@mui/icons-material/History";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import TuneIcon from "@mui/icons-material/Tune";
import { useAuth } from "../contexts/AuthContext";
import { auth as servicoAuth, projetos as servicoProjetos } from "../services/api";
import { useAviso } from "../contexts/FeedbackContext";
import { iniciais } from "../constants";

function Cartao({ icone, titulo, descricao, emBreve = false, children }) {
  return (
    <Paper sx={{ p: 2.5, height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Box sx={{ color: "primary.main", display: "flex" }}>{icone}</Box>
        <Typography variant="subtitle1" fontWeight={600} sx={{ flexGrow: 1 }}>
          {titulo}
        </Typography>
        {emBreve && <Chip size="small" label="Em breve" variant="outlined" />}
      </Box>
      {descricao && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: children ? 1.5 : 0 }}>
          {descricao}
        </Typography>
      )}
      {children}
    </Paper>
  );
}

// Troca da própria senha (confirma a atual; a nova precisa ter 8+ caracteres).
function FormularioSenha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const avisar = useAviso();
  const diferente = confirmacao && nova !== confirmacao;
  const valido = atual && nova.length >= 8 && nova === confirmacao;

  async function salvar(evento) {
    evento.preventDefault();
    setSalvando(true);
    try {
      await servicoAuth.trocarSenha(atual, nova);
      setAtual("");
      setNova("");
      setConfirmacao("");
      avisar("Senha alterada.");
    } catch (e) {
      const detalhe = e.response?.data?.detail;
      avisar(typeof detalhe === "string" ? detalhe : "Não foi possível alterar a senha.", "error");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Stack component="form" spacing={1.5} onSubmit={salvar}>
      <TextField size="small" type="password" label="Senha atual" value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" />
      <TextField
        size="small"
        type="password"
        label="Nova senha"
        value={nova}
        onChange={(e) => setNova(e.target.value)}
        helperText="Mínimo de 8 caracteres"
        autoComplete="new-password"
      />
      <TextField
        size="small"
        type="password"
        label="Confirmar nova senha"
        value={confirmacao}
        onChange={(e) => setConfirmacao(e.target.value)}
        error={Boolean(diferente)}
        helperText={diferente ? "As senhas não conferem" : " "}
        autoComplete="new-password"
      />
      <Box>
        <Button type="submit" variant="contained" disabled={!valido || salvando}>
          {salvando ? "Salvando..." : "Alterar senha"}
        </Button>
      </Box>
    </Stack>
  );
}

function Linha({ rotulo, valor }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">
        {rotulo}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ textAlign: "right" }}>
        {valor}
      </Typography>
    </Box>
  );
}

// Página de perfil do usuário. Já mostra a conta e os projetos; as seções
// marcadas "Em breve" estão preparadas para as próximas versões:
//   - Segurança: alterar senha e "esqueci minha senha" (endpoint PATCH /auth/me/senha);
//   - Preferências: tema, página inicial e notificações (reavaliações, recomendações);
//   - Atividade: últimas ações do usuário (riscos cadastrados, planos aceitos, reavaliações).
export default function Perfil() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState([]);
  const ehAdmin = usuario.perfil === "admin";

  useEffect(() => {
    (ehAdmin ? servicoProjetos.listar() : servicoProjetos.meus()).then(setProjetos).catch(() => setProjetos([]));
  }, [ehAdmin]);

  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Paper sx={{ p: 3, mb: 2, display: "flex", alignItems: "center", gap: 2.5, flexWrap: "wrap" }}>
        <Avatar
          sx={{
            width: 72,
            height: 72,
            fontSize: 26,
            fontWeight: 700,
            fontFamily: '"Space Grotesk", sans-serif',
            bgcolor: ehAdmin ? "secondary.main" : "primary.main",
            color: "#0B0E14",
          }}
        >
          {iniciais(usuario.nome)}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={600}>
            {usuario.nome}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {usuario.email}
          </Typography>
          <Chip
            size="small"
            label={ehAdmin ? "Administrador" : "Gerente de projetos"}
            color={ehAdmin ? "secondary" : "primary"}
            variant="outlined"
            sx={{ mt: 1, fontWeight: 600 }}
          />
        </Box>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Cartao icone={<PersonOutlineIcon />} titulo="Dados da conta">
            <Stack divider={<Divider />}>
              <Linha rotulo="Nome" valor={usuario.nome} />
              <Linha rotulo="E-mail" valor={usuario.email} />
              <Linha rotulo="Perfil" valor={ehAdmin ? "Administrador" : "Gerente de projetos"} />
              {usuario.criado_em && (
                <Linha rotulo="Conta criada em" valor={new Date(usuario.criado_em).toLocaleDateString("pt-BR")} />
              )}
            </Stack>
          </Cartao>
        </Grid>

        <Grid item xs={12} md={6}>
          <Cartao
            icone={<AccountTreeIcon />}
            titulo={ehAdmin ? "Projetos que administro" : "Projetos vinculados"}
          >
            {projetos.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nenhum projeto ainda.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {projetos.map((p) => (
                  <Chip key={p.id} label={p.nome} variant="outlined" />
                ))}
              </Box>
            )}
            <Button size="small" sx={{ mt: 1.5 }} onClick={() => navigate(ehAdmin ? "/admin/projetos" : "/gerente/projetos")}>
              Ver projetos
            </Button>
          </Cartao>
        </Grid>

        <Grid item xs={12} md={4}>
          <Cartao icone={<LockOutlinedIcon />} titulo="Segurança" descricao="Altere a senha de acesso.">
            <FormularioSenha />
          </Cartao>
        </Grid>
        <Grid item xs={12} md={4}>
          <Cartao
            icone={<TuneIcon />}
            titulo="Preferências"
            descricao="Página inicial, visualização padrão dos riscos e avisos de reavaliação e recomendações."
            emBreve
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Cartao
            icone={<HistoryIcon />}
            titulo="Minha atividade"
            descricao="Riscos cadastrados, planos aceitos e reavaliações feitas recentemente."
            emBreve
          />
        </Grid>
      </Grid>
    </Box>
  );
}
