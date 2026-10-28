import { Suspense, lazy, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import DeleteForeverOutlinedIcon from "@mui/icons-material/DeleteForeverOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import PhonelinkEraseOutlinedIcon from "@mui/icons-material/PhonelinkEraseOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useAuth } from "../contexts/AuthContext";
import { useAviso } from "../contexts/FeedbackContext";
import { auth as servicoAuth } from "../services/api";
import { usePreferencias } from "../contexts/PreferenciasContext";
import { FAIXAS_EXPOSICAO } from "../constants";
import FormularioSenha from "../components/FormularioSenha";
import { texturaFaixa } from "../theme";

const Sobre = lazy(() => import("./Sobre"));
const ModeloIA = lazy(() => import("./gerente/ModeloIA"));

// A aba aberta fica na URL (?aba=...), para dar F5 ou mandar o link direto.
const ABAS = [
  { valor: "preferencias", rotulo: "Preferências" },
  { valor: "notificacoes", rotulo: "Notificações" },
  { valor: "seguranca", rotulo: "Segurança" },
  { valor: "privacidade", rotulo: "Privacidade" },
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
  const { modo, definirModo, daltonico, definirDaltonico, tamanhoTexto, definirTamanhoTexto, reduzirAnimacoes, definirReduzirAnimacoes } =
    usePreferencias();

  return (
    <Box sx={{ ...GRADE, alignItems: "stretch" }}>
      <Secao titulo="Aparência" descricao="Escolha entre o modo escuro (padrão) e o modo claro. Estas preferências ficam salvas na sua conta e valem em qualquer computador.">
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
        titulo="Modo daltônico"
        descricao="A gravidade deixa de depender só da cor: a escala vira uma cor só em degraus de claridade, cada faixa ganha uma forma (● ■ ◆ ▲ ★), a matriz mostra a exposição de cada célula, as barras ganham textura, sucesso/erro passam de verde/vermelho para azul/magenta e os links ficam sublinhados."
      >
        <FormControlLabel
          control={<Switch checked={daltonico} onChange={(e) => definirDaltonico(e.target.checked)} />}
          label="Modo daltônico"
        />
        <Box sx={{ mt: 2, display: "flex", gap: "2px", borderRadius: 2, overflow: "hidden" }} aria-hidden="true">
          {FAIXAS_EXPOSICAO.map((faixa) => (
            <Box
              key={faixa.label}
              sx={{ ...texturaFaixa(faixa.indice), flex: 1, height: 40, bgcolor: faixa.cor, color: faixa.corTexto, display: "grid", placeItems: "center", fontSize: "0.75rem", fontWeight: 600 }}
            >
              <Box component="span" sx={{ bgcolor: faixa.cor, px: 0.75, borderRadius: 0.5 }}>
                {faixa.label}
              </Box>
            </Box>
          ))}
        </Box>
      </Secao>

      <Secao titulo="Tamanho do texto" descricao="Aumenta todos os textos do sistema, inclusive tabelas e gráficos. Os documentos em PDF continuam no tamanho padrão.">
        <ToggleButtonGroup exclusive value={tamanhoTexto} onChange={(_, novo) => novo && definirTamanhoTexto(novo)} aria-label="Tamanho do texto">
          {TAMANHOS.map((t) => (
            <ToggleButton key={t.valor} value={t.valor} sx={{ px: 2.5, gap: 1, alignItems: "baseline" }}>
              <Box component="span" aria-hidden="true" sx={{ fontWeight: 700, fontSize: t.amostra }}>
                A
              </Box>
              {t.rotulo}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Secao>

      <Secao
        titulo="Animações"
        descricao="Desliga o movimento da tela de entrada, as transições e a animação dos gráficos. Ajuda quem sente desconforto com movimento na tela."
      >
        <FormControlLabel
          control={<Switch checked={reduzirAnimacoes} onChange={(e) => definirReduzirAnimacoes(e.target.checked)} />}
          label="Reduzir animações"
        />
      </Secao>
    </Box>
  );
}

const TAMANHOS = [
  { valor: "padrao", rotulo: "Padrão", amostra: "0.875rem" },
  { valor: "grande", rotulo: "Grande", amostra: "1rem" },
  { valor: "maior", rotulo: "Maior", amostra: "1.125rem" },
];

// "Chrome no Windows", a partir do user-agent guardado no login.
function descreverNavegador(ua) {
  if (!ua) return "Navegador desconhecido";
  const navegador = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  const sistema = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return sistema ? `${navegador} no ${sistema}` : navegador;
}

function Seguranca() {
  const { usuario, sair, trocarToken } = useAuth();
  const avisar = useAviso();
  const [acessos, setAcessos] = useState(null);
  const [encerrando, setEncerrando] = useState(false);

  useEffect(() => {
    servicoAuth.acessos().then(setAcessos).catch(() => setAcessos([]));
  }, []);

  async function encerrarOutras() {
    setEncerrando(true);
    try {
      const { access_token: token } = await servicoAuth.encerrarOutrasSessoes();
      trocarToken(token);
      avisar("Pronto: as outras sessões foram encerradas. Esta continua aberta.");
    } catch {
      avisar("Não foi possível encerrar as outras sessões.", "error");
    } finally {
      setEncerrando(false);
    }
  }

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
        <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
          <Button variant="outlined" startIcon={<LogoutIcon />} onClick={sair}>
            Sair desta conta
          </Button>
          <Button startIcon={<PhonelinkEraseOutlinedIcon />} disabled={encerrando} onClick={encerrarOutras}>
            Sair de todas as outras sessões
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          Use se esqueceu a conta aberta em outro computador. Trocar a senha também encerra as outras sessões.
        </Typography>
      </Secao>
      <Box sx={{ gridColumn: { md: "1 / -1" } }}>
        <Secao titulo="Últimos acessos" descricao="Os 10 logins mais recentes nesta conta. Se algum não foi você, troque a senha.">
          {acessos === null ? (
            <LinearProgress />
          ) : acessos.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhum acesso registrado ainda (o registro começou nesta versão do Argos).
            </Typography>
          ) : (
            <Stack divider={<Divider />}>
              {acessos.map((a, i) => (
                <Box key={`${a.criado_em}-${i}`} sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 1, py: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {descreverNavegador(a.navegador)}
                    {i === 0 && (
                      <Typography component="span" variant="caption" color="text.secondary">
                        {" "}
                        · mais recente
                      </Typography>
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(a.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    {a.ip && ` · IP ${a.ip}`}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Secao>
      </Box>
    </Box>
  );
}

// ---------- Notificações ----------

const TIPOS_AVISO = [
  { chave: "apetite", rotulo: "Riscos fora do apetite", detalhe: "Exposição acima do apetite do projeto e ainda sem tratamento." },
  { chave: "decidir", rotulo: "Recomendações aguardando decisão", detalhe: "Plano sugerido pela IA que você ainda não aceitou nem rejeitou." },
  { chave: "reavaliar", rotulo: "Reavaliações vencidas", detalhe: "Riscos que passaram do prazo de reavaliação do projeto." },
];

function Notificacoes() {
  const { usuario, atualizarUsuario } = useAuth();
  const avisar = useAviso();
  const salvas = usuario?.preferencias ?? {};
  const avisos = { apetite: true, decidir: true, reavaliar: true, ...(salvas.notificacoes ?? {}) };
  const [previa, setPrevia] = useState(null);
  const [abrindoPrevia, setAbrindoPrevia] = useState(false);

  async function salvar(parcial) {
    try {
      atualizarUsuario(await servicoAuth.salvarPreferencias(parcial));
    } catch {
      avisar("Não foi possível salvar a preferência.", "error");
    }
  }

  async function verPrevia() {
    setAbrindoPrevia(true);
    try {
      setPrevia(await servicoAuth.resumo());
    } catch {
      avisar("Não foi possível montar a prévia.", "error");
    } finally {
      setAbrindoPrevia(false);
    }
  }

  return (
    <Box sx={GRADE}>
      <Secao titulo="Avisos no sino" descricao="Escolha o que aparece no sino da barra superior. Os avisos desligados continuam visíveis nas páginas (ex.: o chip Reavaliar).">
        <Stack spacing={1}>
          {TIPOS_AVISO.map((t) => (
            <FormControlLabel
              key={t.chave}
              control={<Switch checked={avisos[t.chave]} onChange={(e) => salvar({ notificacoes: { ...avisos, [t.chave]: e.target.checked } })} />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {t.rotulo}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t.detalhe}
                  </Typography>
                </Box>
              }
              sx={{ alignItems: "flex-start", "& .MuiSwitch-root": { mt: -0.5 } }}
            />
          ))}
        </Stack>
      </Secao>

      <Secao
        titulo="Resumo semanal por e-mail"
        descricao="Toda segunda-feira, um e-mail com o que pede ação: riscos fora do apetite, reavaliações vencidas e decisões pendentes. Quem não tem nada pendente não recebe. O urgente continua no sino, na hora."
      >
        <FormControlLabel
          control={<Switch checked={Boolean(salvas.resumo_semanal)} onChange={(e) => salvar({ resumo_semanal: e.target.checked })} />}
          label={`Receber em ${usuario?.email ?? "meu e-mail"}`}
        />
        <Box sx={{ mt: 1.5 }}>
          <Button startIcon={<VisibilityOutlinedIcon />} disabled={abrindoPrevia} onClick={verPrevia}>
            Ver prévia do resumo de hoje
          </Button>
        </Box>
      </Secao>

      <Dialog open={Boolean(previa)} onClose={() => setPrevia(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Prévia do resumo</DialogTitle>
        <DialogContent>
          {previa && !previa.envio_configurado && (
            <Alert severity="info" sx={{ mb: 2 }}>
              O envio de e-mails ainda não está configurado no servidor. A preferência fica salva e vale assim que for.
            </Alert>
          )}
          {previa?.total === 0 ? (
            <Typography variant="body2">Tudo em dia: nada fora do apetite, nenhuma reavaliação vencida e nenhuma decisão pendente.</Typography>
          ) : (
            [
              ["fora_do_apetite", "Fora do apetite, sem tratamento"],
              ["reavaliar", "Reavaliação vencida"],
              ["decisoes_pendentes", "Recomendações aguardando decisão"],
            ]
              .filter(([chave]) => previa?.[chave]?.length)
              .map(([chave, titulo]) => (
                <Box key={chave} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    {titulo} ({previa[chave].length})
                  </Typography>
                  {previa[chave].map((i) => (
                    <Typography key={`${chave}-${i.id}`} variant="body2" color="text.secondary">
                      <strong>
                        {i.indice} {i.titulo}
                      </strong>{" "}
                      ({i.projeto}): {i.detalhe}
                    </Typography>
                  ))}
                </Box>
              ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrevia(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ---------- Privacidade (LGPD) ----------

function Privacidade() {
  const { sair } = useAuth();
  const avisar = useAviso();
  const navigate = useNavigate();
  const [exportando, setExportando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  async function exportar() {
    setExportando(true);
    try {
      const dados = await servicoAuth.exportarDados();
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `argos-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      avisar("Não foi possível exportar os dados.", "error");
    } finally {
      setExportando(false);
    }
  }

  async function excluir() {
    setErro("");
    try {
      await servicoAuth.excluirConta(senha);
      sair();
      navigate("/login", { replace: true });
    } catch (e) {
      const detalhe = e.response?.data?.detail;
      setErro(typeof detalhe === "string" ? detalhe : "Não foi possível excluir a conta.");
    }
  }

  return (
    <Box sx={GRADE}>
      <Secao
        titulo="Exportar meus dados"
        descricao="Baixe tudo o que o Argos guarda sobre você em um arquivo JSON: conta, projetos, riscos, reavaliações, decisões sobre recomendações e os últimos acessos (portabilidade, LGPD)."
      >
        <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} disabled={exportando} onClick={exportar}>
          {exportando ? "Preparando…" : "Baixar meus dados"}
        </Button>
      </Secao>

      <Secao
        titulo="Excluir minha conta"
        descricao="Apaga seus dados pessoais (nome, e-mail, cargo, organização, preferências e acessos) e encerra o acesso. Os riscos e projetos continuam no sistema, sem o seu nome, porque fazem parte do histórico dos projetos e do treino do modelo. Não dá para desfazer."
      >
        <Button color="error" variant="outlined" startIcon={<DeleteForeverOutlinedIcon />} onClick={() => setExcluindo(true)}>
          Excluir minha conta
        </Button>
      </Secao>

      <Dialog open={excluindo} onClose={() => setExcluindo(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Excluir a conta?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Esta ação não pode ser desfeita. Se quiser guardar uma cópia, exporte seus dados antes. Para confirmar, digite sua senha.
          </Typography>
          {erro && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {erro}
            </Alert>
          )}
          <TextField type="password" label="Senha" fullWidth value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExcluindo(false)}>Cancelar</Button>
          <Button color="error" variant="contained" disabled={!senha} onClick={excluir}>
            Excluir definitivamente
          </Button>
        </DialogActions>
      </Dialog>
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
      {aba === "notificacoes" && <Notificacoes />}
      {aba === "seguranca" && <Seguranca />}
      {aba === "privacidade" && <Privacidade />}
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
