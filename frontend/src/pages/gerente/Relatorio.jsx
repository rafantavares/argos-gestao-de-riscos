import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Button, CircularProgress, GlobalStyles, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useAuth } from "../../contexts/AuthContext";
import {
  projetos as servicoProjetos,
  recomendacoes as servicoRecomendacoes,
  riscos as servicoRiscos,
} from "../../services/api";
import {
  AREAS_AFETADAS,
  FAIXAS_EXPOSICAO,
  IMPACTOS,
  PROBABILIDADES,
  STATUS_RISCO,
  URGENCIAS,
  faixaExposicao,
  precisaReavaliar,
  rotulo,
} from "../../constants";
import { COR, Etiqueta, Indicador, Secao, cabecalho, celula } from "../../components/DocumentoPdf";
import LogoMark from "../../components/Logo";

// Relatório de riscos para impressão / PDF (o navegador salva em PDF pelo
// "Baixar PDF"). Organizado como dossiê do MR-MPS-SW:2023: resumo, matriz e
// riscos identificados (GPR 10), tratamento (GPR 10+) e monitoramento (GPR 17).
// Recebe pela navegação os riscos já filtrados (página Riscos) ou um projeto
// (Visão geral); sem isso, usa todos os riscos ativos.

export default function Relatorio() {
  const { usuario } = useAuth();
  const localizacao = useLocation();
  const navigate = useNavigate();
  const pedido = localizacao.state ?? {};
  const [dados, setDados] = useState(null);

  useEffect(() => {
    Promise.all([servicoRiscos.listarMeus(), servicoProjetos.meus(), servicoRecomendacoes.listarMinhas()])
      .then(([riscos, projetos, recomendacoes]) => setDados({ riscos, projetos, recomendacoes }))
      .catch(() => setDados({ riscos: [], projetos: [], recomendacoes: [] }));
  }, []);

  // Documento claro para impressão (o tema do sistema é escuro).
  useEffect(() => {
    const anterior = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#E5E7EB";
    return () => {
      document.body.style.backgroundColor = anterior;
    };
  }, []);

  const relatorio = useMemo(() => {
    if (!dados) return null;
    const projetoPorId = new Map(dados.projetos.map((p) => [p.id, p]));
    let riscos = dados.riscos;
    if (pedido.ids) {
      const ordem = new Map(pedido.ids.map((id, i) => [id, i]));
      riscos = riscos.filter((r) => ordem.has(r.id)).sort((a, b) => ordem.get(a.id) - ordem.get(b.id));
    } else {
      riscos = riscos
        .filter((r) => r.status !== "encerrado" && (!pedido.idProjeto || r.id_projeto === pedido.idProjeto))
        .sort((a, b) => b.exposicao - a.exposicao);
    }
    const ultimaRec = new Map();
    [...dados.recomendacoes]
      .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
      .forEach((rec) => ultimaRec.set(rec.id_risco, rec));
    const idsProjetos = [...new Set(riscos.map((r) => r.id_projeto))];
    const nomesProjetos = pedido.idProjeto
      ? [projetoPorId.get(pedido.idProjeto)?.nome]
      : idsProjetos.map((id) => projetoPorId.get(id)?.nome).filter(Boolean);
    const ativos = riscos.filter((r) => r.status !== "encerrado");
    const media = ativos.length ? ativos.reduce((s, r) => s + r.exposicao, 0) / ativos.length : 0;
    return { riscos, ativos, media, projetoPorId, ultimaRec, nomesProjetos };
  }, [dados, pedido.ids, pedido.idProjeto]);

  if (!relatorio) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  const { riscos, ativos, media, projetoPorId, ultimaRec, nomesProjetos } = relatorio;
  const emitido = new Date();
  const faixaMedia = faixaExposicao(Math.max(1, Math.round(media)));
  const titulo = pedido.idProjeto ? "Relatório de riscos do projeto" : "Relatório de riscos";
  const contagemFaixa = FAIXAS_EXPOSICAO.map((f) => ({ ...f, n: riscos.filter((r) => r.avaliacao_exposicao === f.label).length }));
  const aceitos = riscos.filter((r) => ultimaRec.get(r.id)?.aceita === true).length;
  const pendentesReav = riscos.filter(precisaReavaliar).length;

  return (
    <Box sx={{ py: { xs: 0, md: 3 }, "@media print": { py: 0 } }}>
      <GlobalStyles
        styles={{
          "@page": { size: "A4", margin: "14mm" },
          "@media print": { body: { backgroundColor: "#fff !important" } },
          "*": { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" },
        }}
      />
      {/* Barra de ações (não sai na impressão) */}
      <Box
        sx={{
          maxWidth: 820,
          mx: "auto",
          mb: 2,
          px: 2,
          display: "flex",
          gap: 1.5,
          alignItems: "center",
          "@media print": { display: "none" },
        }}
      >
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ color: "#111827" }}>
          Voltar
        </Button>
        <Typography sx={{ flexGrow: 1, fontSize: 13, color: "#374151" }}>
          Em "Destino", escolha <strong>Salvar como PDF</strong>.
        </Typography>
        <Button variant="contained" startIcon={<PictureAsPdfIcon />} onClick={() => window.print()}>
          Baixar PDF
        </Button>
      </Box>

      {/* Documento */}
      <Box
        sx={{
          maxWidth: 820,
          mx: "auto",
          bgcolor: "#FFFFFF",
          color: COR.texto,
          p: { xs: 2.5, md: 5 },
          boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
          "@media print": { boxShadow: "none", p: 0, maxWidth: "none" },
          "& *": { fontFamily: '"IBM Plex Sans", Arial, sans-serif' },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, borderBottom: `3px solid ${COR.marca}`, pb: 1.5 }}>
          <Box sx={{ bgcolor: "#0B0E14", borderRadius: 1, p: 0.5, display: "flex" }}>
            <LogoMark size={34} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{titulo}</Typography>
            <Typography sx={{ fontSize: 12, color: COR.suave }}>
              {nomesProjetos.length ? nomesProjetos.join(" · ") : "Todos os projetos"}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: COR.marca }}>ARGOS</Typography>
            <Typography sx={{ fontSize: 11, color: COR.suave }}>
              Emitido em {emitido.toLocaleDateString("pt-BR")} às {emitido.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </Typography>
            <Typography sx={{ fontSize: 11, color: COR.suave }}>Responsável: {usuario.nome}</Typography>
          </Box>
        </Box>
        {pedido.filtros && (
          <Typography sx={{ fontSize: 11, color: COR.suave, mt: 1 }}>
            <strong>Filtros aplicados:</strong> {pedido.filtros}
          </Typography>
        )}

        <Secao numero={1} titulo="Resumo executivo">
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Indicador valor={riscos.length} rotulo="riscos no relatório" />
            <Indicador valor={media ? media.toFixed(1) : "—"} rotulo={`exposição média (${faixaMedia.label})`} cor={faixaMedia.cor} />
            <Indicador valor={riscos.filter((r) => r.exposicao >= 16).length} rotulo="graves ou muito graves" cor="#DC2626" />
            <Indicador valor={aceitos} rotulo="com plano aceito" />
            <Indicador valor={pendentesReav} rotulo="reavaliação pendente" cor={pendentesReav ? "#EA580C" : undefined} />
          </Box>
          <Typography sx={{ fontSize: 11, color: COR.suave, mt: 1 }}>
            Distribuição por faixa de exposição:{" "}
            {contagemFaixa.map((f) => `${f.label} ${f.n}`).join(" · ")}. Exposição = impacto × probabilidade (1 a 25).
          </Typography>
        </Secao>

        <Secao numero={2} titulo="Matriz de risco" norma="MR-MPS-SW:2023 · GPR 10">
          <table style={{ borderCollapse: "collapse", margin: "0 auto" }}>
            <thead>
              <tr>
                <th style={{ ...celula, border: 0, fontSize: 10, color: COR.suave }}>Probabilidade \ Impacto</th>
                {IMPACTOS.map((i) => (
                  <th key={i.value} style={{ ...celula, border: 0, fontSize: 10, textAlign: "center", color: COR.suave }}>
                    {i.value} · {i.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...PROBABILIDADES].reverse().map((p) => (
                <tr key={p.value}>
                  <th style={{ ...celula, border: 0, fontSize: 10, textAlign: "right", color: COR.suave }}>
                    {p.value} · {p.label}
                  </th>
                  {IMPACTOS.map((i) => {
                    const n = riscos.filter((r) => r.probabilidade === p.value && r.impacto === i.value).length;
                    const cor = faixaExposicao(p.value * i.value).cor;
                    return (
                      <td
                        key={i.value}
                        style={{
                          ...celula,
                          width: 58,
                          height: 30,
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: 13,
                          background: n ? `${cor}AA` : `${cor}26`,
                        }}
                      >
                        {n || ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Secao>

        <Secao numero={3} titulo="Riscos identificados" norma="GPR 10">
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                {["Índice", "Risco", "Projeto", "Área", "P", "I", "Exposição", "Status", "Plano"].map((c) => (
                  <th key={c} style={cabecalho}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {riscos.map((r) => {
                const rec = ultimaRec.get(r.id);
                const faixa = faixaExposicao(r.exposicao);
                return (
                  <tr key={r.id} style={{ breakInside: "avoid" }}>
                    <td style={{ ...celula, fontWeight: 700, color: COR.marca }}>{r.indice}</td>
                    <td style={celula}>{r.titulo}</td>
                    <td style={celula}>{projetoPorId.get(r.id_projeto)?.nome ?? "—"}</td>
                    <td style={celula}>{rotulo(AREAS_AFETADAS, r.area_afetada)}</td>
                    <td style={{ ...celula, textAlign: "center" }}>{r.probabilidade}</td>
                    <td style={{ ...celula, textAlign: "center" }}>{r.impacto}</td>
                    <td style={celula}>
                      <Etiqueta cor={faixa.cor}>
                        {r.exposicao} · {faixa.label}
                      </Etiqueta>
                    </td>
                    <td style={celula}>{rotulo(STATUS_RISCO, r.status)}</td>
                    <td style={celula}>{!rec ? "—" : rec.aceita === true ? "Aceito" : rec.aceita === false ? "Rejeitado" : "Pendente"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {riscos.length === 0 && <Typography sx={{ fontSize: 12, color: COR.suave, mt: 1 }}>Nenhum risco.</Typography>}
        </Secao>

        <Secao numero={4} titulo="Tratamento dos riscos" norma="GPR 10+ · mitigação e contingência">
          {riscos.map((r) => {
            const rec = ultimaRec.get(r.id);
            return (
              <Box key={r.id} sx={{ border: `1px solid ${COR.linha}`, borderLeft: `4px solid ${faixaExposicao(r.exposicao).cor}`, p: 1.25, mb: 1, breakInside: "avoid" }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                  {r.indice} · {r.titulo}{" "}
                  <span style={{ fontWeight: 400, color: COR.suave }}>
                    — P{r.probabilidade} ({rotulo(PROBABILIDADES, r.probabilidade)}) × I{r.impacto} ({rotulo(IMPACTOS, r.impacto)}) ·
                    urgência {rotulo(URGENCIAS, r.urgencia).toLowerCase()}
                  </span>
                </Typography>
                {[
                  ["Impacto", r.descricao_impacto],
                  ["Mitigação", r.mitigacao],
                  ["Contingência", r.contingencia],
                  ["Gatilho", r.gatilho],
                  [
                    "Plano recomendado (modelo)",
                    rec && `${rec.plano?.descricao ?? "—"} (${rec.aceita === true ? "aceito" : rec.aceita === false ? "rejeitado" : "aguardando decisão"})`,
                  ],
                ]
                  .filter(([, valor]) => valor)
                  .map(([nome, valor]) => (
                    <Typography key={nome} sx={{ fontSize: 11, mt: 0.4 }}>
                      <strong>{nome}:</strong> {valor}
                    </Typography>
                  ))}
              </Box>
            );
          })}
        </Secao>

        <Secao numero={5} titulo="Monitoramento" norma="GPR 17">
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                {["Índice", "Risco", "Status", "Cadastro", "Última avaliação", "Situação"].map((c) => (
                  <th key={c} style={cabecalho}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {riscos.map((r) => (
                <tr key={r.id} style={{ breakInside: "avoid" }}>
                  <td style={{ ...celula, fontWeight: 700, color: COR.marca }}>{r.indice}</td>
                  <td style={celula}>{r.titulo}</td>
                  <td style={celula}>{rotulo(STATUS_RISCO, r.status)}</td>
                  <td style={celula}>{new Date(r.criado_em).toLocaleDateString("pt-BR")}</td>
                  <td style={celula}>{new Date(r.ultima_avaliacao_em ?? r.criado_em).toLocaleDateString("pt-BR")}</td>
                  <td style={{ ...celula, color: precisaReavaliar(r) ? "#C2410C" : COR.texto, fontWeight: precisaReavaliar(r) ? 700 : 400 }}>
                    {precisaReavaliar(r) ? "Reavaliação pendente (30+ dias)" : r.status === "encerrado" ? "Encerrado" : "Em dia"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Typography sx={{ fontSize: 11, color: COR.suave, mt: 1 }}>
            {ativos.length} riscos ativos. Riscos ativos sem reavaliação há 30 dias ou mais devem ter as notas revisadas
            conforme o andamento do projeto.
          </Typography>
        </Secao>

        <Typography sx={{ fontSize: 10, color: COR.suave, mt: 4, pt: 1, borderTop: `1px solid ${COR.linha}`, textAlign: "center" }}>
          Gerado pelo Argos — Sistema de Gestão de Riscos com Análise Preditiva · Base normativa: PMBOK e MR-MPS-SW:2023
          (GPR 10, GPR 10+, GPR 17, GPC 7). As recomendações do modelo apoiam a decisão; a decisão é do gerente.
        </Typography>
      </Box>
    </Box>
  );
}
