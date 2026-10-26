import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Box, Button, Chip, Divider, Grid, Paper, Stack, Typography } from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import HistoryIcon from "@mui/icons-material/History";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { useAuth } from "../contexts/AuthContext";
import { projetos as servicoProjetos } from "../services/api";
import { misturar, v } from "../theme";
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

// Página de perfil do usuário: a conta, os projetos e o botão de sair. A troca
// de senha e as preferências visuais ficam em Configurações; "Minha atividade"
// (últimas ações do usuário) está marcada como "Em breve".
export default function Perfil() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState([]);

  useEffect(() => {
    servicoProjetos.meus().then(setProjetos).catch(() => setProjetos([]));
  }, []);

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
            bgcolor: misturar(v("marca"), 16),
            color: v("marca"),
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
            label="Gerente de projetos"
            color="primary"
            variant="outlined"
            sx={{ mt: 1, fontWeight: 600 }}
          />
        </Box>
        <Button variant="outlined" startIcon={<LogoutIcon />} onClick={sair}>
          Sair da conta
        </Button>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Cartao icone={<PersonOutlineIcon />} titulo="Dados da conta">
            <Stack divider={<Divider />}>
              <Linha rotulo="Nome" valor={usuario.nome} />
              <Linha rotulo="E-mail" valor={usuario.email} />
              <Linha rotulo="Perfil" valor="Gerente de projetos" />
              {usuario.criado_em && (
                <Linha rotulo="Conta criada em" valor={new Date(usuario.criado_em).toLocaleDateString("pt-BR")} />
              )}
            </Stack>
          </Cartao>
        </Grid>

        <Grid item xs={12} md={6}>
          <Cartao
            icone={<AccountTreeIcon />}
            titulo="Projetos vinculados"
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
            <Button size="small" sx={{ mt: 1.5 }} onClick={() => navigate("/gerente/projetos")}>
              Ver projetos
            </Button>
          </Cartao>
        </Grid>

        <Grid item xs={12}>
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
