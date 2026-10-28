import { Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  FormControlLabel,
  LinearProgress,
  Paper,
  Switch,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "../contexts/AuthContext";
import { usePreferencias } from "../contexts/PreferenciasContext";
import { FAIXAS_EXPOSICAO } from "../constants";
import FormularioSenha from "../components/FormularioSenha";

const Sobre = lazy(() => import("./Sobre"));
const ModeloIA = lazy(() => import("./gerente/ModeloIA"));

// A aba aberta fica na URL (?aba=...), para dar F5 ou mandar o link direto.
const ABAS = [
  { valor: "preferencias", rotulo: "Preferências" },
  { valor: "seguranca", rotulo: "Segurança" },
  { valor: "modelo", rotulo: "Desempenho da IA" },
  { valor: "sobre", rotulo: "Sobre o Argos" },
];

const GRADE = { display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, alignItems: "start" };

function Secao({ titulo, descricao, children }) {
  return (
    <Paper sx={{ p: { xs: 2.5, md: 3 }, height: "100%" }}>
      <Typography variant="subtitle1" component="h2">
        {titulo}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5, maxWidth: 640 }}>
        {descricao}
      </Typography>
      {children}
    </Paper>
  );
}

function Preferencias() {
  const { modo, definirModo, daltonico, definirDaltonico } = usePreferencias();

  return (
    <Box sx={{ ...GRADE, alignItems: "stretch" }}>
      <Secao titulo="Aparência" descricao="Escolha entre o modo escuro (padrão) e o modo claro. A preferência fica salva neste navegador.">
        <ToggleButtonGroup exclusive value={modo} onChange={(_, novo) => novo && definirModo(novo)} aria-label="Modo de cores">
          <ToggleButton value="dark" sx={{ gap: 1, px: 2.5 }}>
            <DarkModeOutlinedIcon fontSize="small" /> Escuro
          </ToggleButton>
          <ToggleButton value="light" sx={{ gap: 1, px: 2.5 }}>
            <LightModeOutlinedIcon fontSize="small" /> Claro
          </ToggleButton>
        </ToggleButtonGroup>
      </Secao>

      <Secao
        titulo="Acessibilidade"
        descricao="O modo daltônico troca a escala de gravidade (verde → vermelho) por uma escala de uma cor só, em degraus de claridade, que pessoas com daltonismo distinguem com segurança. A matriz, os gráficos e as etiquetas mudam juntos."
      >
        <FormControlLabel
          control={<Switch checked={daltonico} onChange={(e) => definirDaltonico(e.target.checked)} />}
          label="Modo daltônico"
        />
        <Box sx={{ mt: 2, display: "flex", gap: "2px", borderRadius: 2, overflow: "hidden" }} aria-hidden="true">
          {FAIXAS_EXPOSICAO.map((faixa) => (
            <Box
              key={faixa.label}
              sx={{ flex: 1, height: 40, bgcolor: faixa.cor, color: faixa.corTexto, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600 }}
            >
              {faixa.label}
            </Box>
          ))}
        </Box>
      </Secao>
    </Box>
  );
}

function Seguranca() {
  const { usuario, sair } = useAuth();

  return (
    <Box sx={GRADE}>
      <Secao titulo="Senha de acesso" descricao="Confirme a senha atual e escolha uma nova, com pelo menos 8 caracteres.">
        <FormularioSenha />
      </Secao>
      <Secao
        titulo="Sessão"
        descricao="Por segurança, o acesso expira 8 horas depois do login e é preciso entrar de novo. Em computador compartilhado, saia ao terminar."
      >
        <Typography variant="body2" color="text.secondary">
          Conectado como
        </Typography>
        <Typography variant="body1" fontWeight={500} sx={{ mb: 2.5, overflowWrap: "anywhere" }}>
          {usuario?.email}
        </Typography>
        <Button variant="outlined" startIcon={<LogoutIcon />} onClick={sair}>
          Sair desta conta
        </Button>
      </Secao>
    </Box>
  );
}

export default function Configuracoes() {
  const [parametros, setParametros] = useSearchParams();
  const aba = ABAS.some((a) => a.valor === parametros.get("aba")) ? parametros.get("aba") : "preferencias";

  return (
    <Box>
      <Tabs
        value={aba}
        onChange={(_, nova) => setParametros(nova === "preferencias" ? {} : { aba: nova }, { replace: true })}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        {ABAS.map((a) => (
          <Tab key={a.valor} value={a.valor} label={a.rotulo} />
        ))}
      </Tabs>

      {aba === "preferencias" && <Preferencias />}
      {aba === "seguranca" && <Seguranca />}
      {aba === "modelo" && (
        <Suspense fallback={<LinearProgress />}>
          <ModeloIA />
        </Suspense>
      )}
      {aba === "sobre" && (
        <Suspense fallback={<LinearProgress />}>
          <Sobre />
        </Suspense>
      )}
    </Box>
  );
}
