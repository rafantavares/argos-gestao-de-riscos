import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Box, Button, ButtonBase, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HistoryIcon from "@mui/icons-material/History";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import TuneIcon from "@mui/icons-material/Tune";
import BarChartIcon from "@mui/icons-material/BarChart";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import UpdateIcon from "@mui/icons-material/Update";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { useAuth } from "../contexts/AuthContext";
import { projetos as servicoProjetos, recomendacoes as servicoRecomendacoes, riscos as servicoRiscos } from "../services/api";
import { misturar, texturaFaixa, v } from "../theme";
import { AREAS_AFETADAS, FAIXAS_EXPOSICAO, faixaExposicao, iniciais, precisaReavaliar, rotulo } from "../constants";
import CartaoEstatistica from "../components/CartaoEstatistica";
import { ChipAceite, Marcador } from "../components/Badges";
import EstadoVazio from "../components/EstadoVazio";

const LIMITE_ATIVIDADE = 8;
const UM_MINUTO = 60 * 1000;

function Secao({ icone, titulo, acao, children, semPadding = false }) {
  return (
    <Paper sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2.5, pt: 2.25, pb: semPadding ? 1.25 : 1.5 }}>
        <Box sx={{ color: "text.secondary", display: "flex" }}>{icone}</Box>
        <Typography variant="subtitle1" component="h2" sx={{ flexGrow: 1 }}>
          {titulo}
        </Typography>
        {acao}
      </Box>
      <Box sx={{ px: semPadding ? 0 : 2.5, pb: semPadding ? 1 : 2.5, flexGrow: 1 }}>{children}</Box>
    </Paper>
  );
}

// "há 3 dias", "hoje", "ontem": a atividade é lida por proximidade, não por data exata.
function quando(data) {
  const dias = Math.floor((Date.now() - new Date(data).getTime()) / 86400000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
}

// Linha do tempo montada com o que o sistema já guarda: cadastro do risco,
// última reavaliação, cada recomendação do modelo e a decisão do gerente (com
// data e, na rejeição, o motivo).
function montarAtividade(riscos, recomendacoes) {
  const porId = new Map(riscos.map((r) => [r.id, r]));
  const eventos = [];
  riscos.forEach((r) => {
    eventos.push({ chave: `c${r.id}`, tipo: "cadastro", data: r.criado_em, risco: r, texto: "Risco cadastrado" });
    const reavaliado = r.ultima_avaliacao_em && new Date(r.ultima_avaliacao_em) - new Date(r.criado_em) > UM_MINUTO;
    if (reavaliado)
      eventos.push({ chave: `a${r.id}`, tipo: "reavaliacao", data: r.ultima_avaliacao_em, risco: r, texto: "Reavaliação registrada" });
  });
  recomendacoes.forEach((rec) => {
    const risco = porId.get(rec.id_risco);
    if (!risco) return;
    eventos.push({ chave: `r${rec.id}`, tipo: "recomendacao", data: rec.criado_em, risco, texto: "Plano recomendado pela IA", rec });
    if (rec.decidida_em) {
      const aceita = rec.aceita === true;
      eventos.push({
        chave: `d${rec.id}`,
        tipo: aceita ? "aceite" : "rejeicao",
        data: rec.decidida_em,
        risco,
        texto: aceita ? "Plano aceito" : "Plano rejeitado",
        detalhe: rec.motivo_rejeicao,
      });
    }
  });
  return eventos.sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, LIMITE_ATIVIDADE);
}

const ICONE_EVENTO = {
  cadastro: <AddCircleOutlineIcon sx={{ fontSize: "1.125rem" }} />,
  reavaliacao: <UpdateIcon sx={{ fontSize: "1.125rem" }} />,
  recomendacao: <AutoAwesomeOutlinedIcon sx={{ fontSize: "1.125rem" }} />,
  aceite: <CheckIcon sx={{ fontSize: "1.125rem", color: "var(--argos-sucesso)" }} />,
  rejeicao: <CloseIcon sx={{ fontSize: "1.125rem", color: "var(--argos-erro)" }} />,
};

const MINIMO_CALIBRACAO = 3;
const formatar = (n) => `${n > 0 ? "+" : ""}${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}`;
const pontos = (n) => `${Math.abs(n).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${Math.abs(n) === 1 ? "ponto" : "pontos"}`;

// Tendência das avaliações do gerente: quanto as notas iniciais mudaram até a
// última reavaliação (GET /riscos/painel/calibracao). Só interpreta a partir de
// 3 riscos reavaliados, e avisa que a variação também reflete mudanças reais.
function Calibracao({ dados }) {
  if (!dados) return null;
  if (dados.riscos_reavaliados < MINIMO_CALIBRACAO) {
    return (
      <Typography variant="body2" color="text.secondary">
        Reavalie pelo menos {MINIMO_CALIBRACAO} riscos para ver a sua tendência de avaliação (hoje: {dados.riscos_reavaliados}). Ela mostra
        se as notas que você dá no cadastro costumam subir ou cair conforme o projeto anda.
      </Typography>
    );
  }
  const media = dados.variacao_media_exposicao;
  const estavel = Math.abs(media) < 1;
  const Icone = estavel ? TrendingFlatIcon : media < 0 ? TrendingDownIcon : TrendingUpIcon;
  let leitura = "Suas notas iniciais quase não mudam nas reavaliações: a avaliação do cadastro tem se mantido.";
  if (!estavel && media < 0) {
    leitura = `Nas reavaliações, a exposição dos seus riscos caiu em média ${pontos(media)}: você tende a avaliar no cadastro acima do que o risco se mostra.`;
  } else if (!estavel) {
    leitura = `Nas reavaliações, a exposição dos seus riscos subiu em média ${pontos(media)}: você tende a avaliar no cadastro abaixo do que o risco se mostra.`;
  }
  return (
    <Box sx={{ display: "grid", gap: { xs: 2, md: 4 }, gridTemplateColumns: { xs: "1fr", md: "minmax(0, 3fr) minmax(0, 2fr)" } }}>
      <Box>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", mb: 2 }}>
          <Icone sx={{ color: "text.secondary", mt: 0.25 }} />
          <Typography variant="body2">{leitura}</Typography>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1.5, mb: 2 }}>
          {[
            ["Probabilidade", dados.variacao_media_probabilidade],
            ["Impacto", dados.variacao_media_impacto],
            ["Exposição", dados.variacao_media_exposicao],
          ].map(([nome, valor]) => (
            <Box key={nome} sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, px: 1.5, py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {nome}
              </Typography>
              <Typography sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: "1.25rem" }}>
                {formatar(valor)}
              </Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary">
          Base: {dados.riscos_reavaliados} de {dados.riscos_total} riscos reavaliados. A variação também reflete mudanças reais nos riscos
          (ex.: uma mitigação concluída); leia como tendência, não como erro.
        </Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75, fontWeight: 600 }}>
          Por área afetada (variação média da exposição)
        </Typography>
        <Stack spacing={0.5}>
          {dados.por_area.slice(0, 6).map((a) => (
            <Box key={a.area} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {rotulo(AREAS_AFETADAS, a.area)} ({a.riscos})
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatar(a.variacao_media_exposicao)}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

// Página de perfil: quem é o usuário, como está a carteira de riscos dele, o
// que ele fez por último e os projetos. Senha e preferências ficam em
// Configurações (atalhos no cartão "Conta").
export default function Perfil() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState([]);
  const [riscos, setRiscos] = useState([]);
  const [recomendacoes, setRecomendacoes] = useState([]);
  const [calibracao, setCalibracao] = useState(null);

  useEffect(() => {
    servicoRiscos
      .calibracao()
      .then(setCalibracao)
      .catch(() => setCalibracao(null));
    servicoProjetos
      .meus()
      .then(setProjetos)
      .catch(() => setProjetos([]));
    servicoRiscos
      .listarMeus()
      .then(setRiscos)
      .catch(() => setRiscos([]));
    servicoRecomendacoes
      .listarMinhas()
      .then(setRecomendacoes)
      .catch(() => setRecomendacoes([]));
  }, []);

  const ativos = useMemo(() => riscos.filter((r) => !r.arquivado && r.status !== "encerrado"), [riscos]);
  const graves = ativos.filter((r) => r.exposicao >= 16).length;
  const emDia = ativos.filter((r) => !precisaReavaliar(r)).length;
  const respondidas = recomendacoes.filter((r) => r.aceita !== null);
  const taxaAceite = respondidas.length ? Math.round((respondidas.filter((r) => r.aceita).length / respondidas.length) * 100) : null;
  const atividade = useMemo(
    () =>
      montarAtividade(
        riscos.filter((r) => !r.arquivado),
        recomendacoes,
      ),
    [riscos, recomendacoes],
  );

  const porFaixa = FAIXAS_EXPOSICAO.map((f) => ({
    ...f,
    quantidade: ativos.filter((r) => faixaExposicao(r.exposicao).indice === f.indice).length,
  }));

  const resumoProjetos = projetos.map((p) => {
    const doProjeto = ativos.filter((r) => r.id_projeto === p.id);
    const pior = doProjeto.reduce((max, r) => Math.max(max, r.exposicao), 0);
    return { ...p, quantidade: doProjeto.length, pior: pior ? faixaExposicao(pior) : null };
  });

  return (
    <Stack spacing={2.5}>
      {/* Identificação */}
      <Paper sx={{ p: { xs: 2.5, md: 3 }, display: "flex", alignItems: "center", gap: 2.5, flexWrap: "wrap" }}>
        <Avatar
          sx={{
            width: 72,
            height: 72,
            fontSize: "1.625rem",
            fontWeight: 700,
            fontFamily: '"Space Grotesk", sans-serif',
            bgcolor: misturar(v("marca"), 16),
            color: v("marca"),
          }}
        >
          {iniciais(usuario.nome)}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h5">{usuario.nome}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
            {usuario.email}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mt: 1 }}>
            <Chip size="small" label="Gerente de projetos" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
            {usuario.criado_em && (
              <Typography variant="caption" color="text.secondary">
                Membro desde {new Date(usuario.criado_em).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </Typography>
            )}
          </Box>
        </Box>
        <Button variant="outlined" startIcon={<LogoutIcon />} onClick={sair}>
          Sair da conta
        </Button>
      </Paper>

      {/* Indicadores pessoais */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4, minmax(0, 1fr))" } }}>
        <CartaoEstatistica
          titulo="Riscos ativos"
          valor={ativos.length}
          icone={<ReportProblemOutlinedIcon fontSize="small" />}
          rodape={`em ${projetos.length} ${projetos.length === 1 ? "projeto" : "projetos"}`}
        />
        <CartaoEstatistica
          titulo="Graves ou muito graves"
          valor={graves}
          icone={<WarningAmberOutlinedIcon fontSize="small" />}
          rodape="exposição 16 ou mais"
        />
        <CartaoEstatistica
          titulo="Em dia com a reavaliação"
          valor={ativos.length ? `${Math.round((emDia / ativos.length) * 100)}%` : "—"}
          icone={<UpdateIcon fontSize="small" />}
          rodape="dentro do prazo de cada projeto"
        />
        <CartaoEstatistica
          titulo="Planos aceitos"
          valor={taxaAceite === null ? "—" : `${taxaAceite}%`}
          icone={<ThumbUpOutlinedIcon fontSize="small" />}
          rodape={`${respondidas.length} ${respondidas.length === 1 ? "recomendação respondida" : "recomendações respondidas"}`}
        />
      </Box>

      <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 3fr) minmax(0, 2fr)" }, alignItems: "start" }}>
        {/* Atividade recente */}
        <Secao icone={<HistoryIcon fontSize="small" />} titulo="Atividade recente" semPadding>
          {atividade.length === 0 ? (
            <Box sx={{ px: 2.5, pb: 1.5 }}>
              <EstadoVazio compacto titulo="Nada por aqui ainda" descricao="Cadastre um risco para começar o histórico." />
            </Box>
          ) : (
            atividade.map((e) => (
              <ButtonBase
                key={e.chave}
                onClick={() => navigate(`/gerente/riscos/${e.risco.id}/recomendacao${e.tipo === "reavaliacao" ? "?aba=evolucao" : ""}`)}
                sx={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 2.5,
                  py: 1.1,
                  textAlign: "left",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    flex: "none",
                    borderRadius: 1.5,
                    display: "grid",
                    placeItems: "center",
                    color: e.tipo === "recomendacao" ? v("ia") : "text.secondary",
                    bgcolor: e.tipo === "recomendacao" ? misturar(v("ia"), 12) : "action.hover",
                  }}
                >
                  {ICONE_EVENTO[e.tipo]}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={500} noWrap>
                    {e.texto} · {e.risco.indice} {e.risco.titulo}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                    {quando(e.data)}
                    {e.detalhe && ` · Motivo: ${e.detalhe}`}
                  </Typography>
                </Box>
                {e.tipo === "recomendacao" && <ChipAceite aceita={e.rec.aceita} />}
              </ButtonBase>
            ))
          )}
        </Secao>

        <Stack spacing={2.5}>
          {/* Projetos */}
          <Secao
            icone={<AccountTreeOutlinedIcon fontSize="small" />}
            titulo="Projetos"
            acao={
              <Button size="small" onClick={() => navigate("/gerente/projetos")}>
                Gerenciar
              </Button>
            }
            semPadding
          >
            {resumoProjetos.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2.5, pb: 1.5 }}>
                Nenhum projeto ainda.
              </Typography>
            ) : (
              resumoProjetos.map((p) => (
                <ButtonBase
                  key={p.id}
                  onClick={() => navigate("/gerente/riscos", { state: { projeto: p.id } })}
                  sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2.5,
                    py: 1.1,
                    textAlign: "left",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={500} noWrap>
                      {p.nome}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      {p.quantidade} {p.quantidade === 1 ? "risco ativo" : "riscos ativos"}
                      {p.pior && (
                        <>
                          {" · pior: "}
                          <Marcador cor={p.pior.cor} tamanho={8} /> {p.pior.label}
                        </>
                      )}
                    </Typography>
                  </Box>
                  <ChevronRightIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </ButtonBase>
              ))
            )}
          </Secao>

          {/* Riscos por gravidade */}
          <Secao icone={<BarChartIcon fontSize="small" />} titulo="Riscos por gravidade">
            {ativos.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nenhum risco ativo.
              </Typography>
            ) : (
              <>
                <Box
                  role="img"
                  aria-label={porFaixa.map((f) => `${f.label}: ${f.quantidade}`).join(", ")}
                  sx={{ display: "flex", gap: "2px", height: 12, borderRadius: "4px", overflow: "hidden", mb: 1.75 }}
                >
                  {porFaixa
                    .filter((f) => f.quantidade)
                    .map((f) => (
                      <Box key={f.label} sx={{ flex: f.quantidade, bgcolor: f.cor, ...texturaFaixa(f.indice) }} />
                    ))}
                </Box>
                <Stack spacing={0.75}>
                  {[...porFaixa].reverse().map((f) => (
                    <Box key={f.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Marcador cor={f.cor} />
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                        {f.label}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {f.quantidade}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </>
            )}
          </Secao>

          {/* Conta */}
          <Secao icone={<TuneIcon fontSize="small" />} titulo="Conta">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Senha, aparência e acessibilidade ficam em Configurações.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap divider={<Divider orientation="vertical" flexItem />}>
              <Button size="small" startIcon={<LockOutlinedIcon />} onClick={() => navigate("/configuracoes?aba=seguranca")}>
                Alterar senha
              </Button>
              <Button size="small" startIcon={<TuneIcon />} onClick={() => navigate("/configuracoes")}>
                Preferências
              </Button>
            </Stack>
          </Secao>
        </Stack>
      </Box>

      {/* Tendência das avaliações (calibração) */}
      <Secao icone={<InsightsOutlinedIcon fontSize="small" />} titulo="Sua tendência de avaliação">
        <Calibracao dados={calibracao} />
      </Secao>
    </Stack>
  );
}
