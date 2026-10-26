import { Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { usePreferencias } from "../contexts/PreferenciasContext";
import { FAIXAS_EXPOSICAO } from "../constants";
import FormularioSenha from "../components/FormularioSenha";

const Sobre = lazy(() => import("./Sobre"));

// A aba aberta fica na URL (?aba=...), para dar F5 ou mandar o link direto.
const ABAS = [
  { valor: "preferencias", rotulo: "Preferências" },
  { valor: "seguranca", rotulo: "Segurança" },
  { valor: "sobre", rotulo: "Sobre o Argos" },
];

function Secao({ titulo, descricao, children }) {
  return (
    <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
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
    <Stack spacing={2.5} sx={{ maxWidth: 880 }}>
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
        <Box sx={{ mt: 2, display: "flex", gap: "2px", borderRadius: 2, overflow: "hidden", maxWidth: 560 }} aria-hidden="true">
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
    </Stack>
  );
}

function Seguranca() {
  return (
    <Box sx={{ maxWidth: 880 }}>
      <Secao titulo="Senha de acesso" descricao="Confirme a senha atual e escolha uma nova, com pelo menos 8 caracteres.">
        <Box sx={{ maxWidth: 420 }}>
          <FormularioSenha />
        </Box>
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
      {aba === "sobre" && (
        <Suspense fallback={<LinearProgress />}>
          <Sobre />
        </Suspense>
      )}
    </Box>
  );
}
