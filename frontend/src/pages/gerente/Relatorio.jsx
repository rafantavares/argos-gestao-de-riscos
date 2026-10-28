import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "../../contexts/AuthContext";
import {
  projetos as servicoProjetos,
  recomendacoes as servicoRecomendacoes,
  riscos as servicoRiscos,
} from "../../services/api";
import {
  AREAS_AFETADAS,
  IMPACTOS,
  PROBABILIDADES,
  STATUS_RISCO,
  URGENCIAS,
  exposicaoResidual,
  faixaExposicao,
  precisaReavaliar,
  reducaoPercentual,
  rotulo,
} from "../../constants";
import {
  COR,
  Campos,
  DistribuicaoFaixas,
  DocumentoPdf,
  Indicador,
  Indicadores,
  MarcadorFaixa,
  MatrizPdf,
  Secao,
  Tabela,
  celula,
  quando,
} from "../../components/DocumentoPdf";

// Relatório de riscos para impressão / PDF (o navegador salva em PDF pelo
// "Baixar PDF"). Organizado como dossiê do MR-MPS-SW:2023: resumo, matriz e
// riscos identificados (GPR 10), tratamento (GPR 10+) e monitoramento (GPR 17).
// Recebe pela navegação os riscos já filtrados (página Riscos) ou um projeto
// (Visão geral); sem isso, usa todos os riscos ativos.

const decisao = (rec) => (!rec ? "Sem recomendação" : rec.aceita === true ? "Aceito" : rec.aceita === false ? "Rejeitado" : "Aguardando decisão");

export default function Relatorio() {
  const { usuario } = useAuth();
  const localizacao = useLocation();
  const pedido = localizacao.state ?? {};
  const [dados, setDados] = useState(null);

  useEffect(() => {
    Promise.all([servicoRiscos.listarMeus(), servicoProjetos.meus(), servicoRecomendacoes.listarMinhas()])
      .then(([riscos, projetos, recomendacoes]) => setDados({ riscos, projetos, recomendacoes }))
      .catch(() => setDados({ riscos: [], projetos: [], recomendacoes: [] }));
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
    return { riscos, projetoPorId, ultimaRec, nomesProjetos };
  }, [dados, pedido.ids, pedido.idProjeto]);

  if (!relatorio) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  const { riscos, projetoPorId, ultimaRec, nomesProjetos } = relatorio;
  const media = riscos.length ? riscos.reduce((s, r) => s + r.exposicao, 0) / riscos.length : null;
  const faixaMedia = media ? faixaExposicao(Math.max(1, Math.round(media))) : null;
  const graves = riscos.filter((r) => r.exposicao >= 16).length;
  const aceitos = riscos.filter((r) => ultimaRec.get(r.id)?.aceita === true).length;
  const pendentesReav = riscos.filter(precisaReavaliar).length;
  const comResidual = riscos.filter((r) => r.exposicao_residual != null).length;
  const reducao = reducaoPercentual(
    riscos.reduce((s, r) => s + r.exposicao, 0),
    riscos.reduce((s, r) => s + exposicaoResidual(r), 0)
  );
  const umProjeto = nomesProjetos.length === 1;

  return (
    <DocumentoPdf
      titulo={pedido.idProjeto ? "Relatório de riscos do projeto" : "Relatório de riscos"}
      subtitulo={nomesProjetos.length ? nomesProjetos.join(" · ") : "Todos os projetos"}
      resumo={`${riscos.length} ${riscos.length === 1 ? "risco" : "riscos"} · ${nomesProjetos.length || "todos os"} ${nomesProjetos.length === 1 ? "projeto" : "projetos"}`}
      metadados={[
        ["Emitido em", quando()],
        ["Responsável", usuario.nome],
        ["Riscos no relatório", String(riscos.length)],
        ["Recorte", pedido.filtros || (pedido.idProjeto ? "Riscos ativos do projeto" : "Riscos ativos")],
      ]}
    >
      <Secao numero={1} titulo="Resumo">
        <Indicadores>
          <Indicador
            valor={media ? media.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}
            rotulo="exposição média (1 a 25)"
            detalhe={faixaMedia && <MarcadorFaixa pontuacao={Math.round(media)} rotulo={faixaMedia.label} />}
          />
          <Indicador valor={graves} rotulo="graves ou muito graves" />
          <Indicador valor={pendentesReav} rotulo="com reavaliação pendente (30+ dias)" />
          <Indicador valor={`${aceitos} de ${riscos.length}`} rotulo="com plano do modelo aceito" />
          <Indicador valor={comResidual ? `−${reducao}%` : "—"} rotulo="exposição esperada após a mitigação" />
          <Indicador valor={comResidual} rotulo="com exposição residual prevista" />
        </Indicadores>
        <Typography sx={{ fontSize: "0.6875rem", color: COR.suave, mt: 2.5, mb: 1 }}>
          Distribuição por faixa de exposição (impacto × probabilidade)
        </Typography>
        <DistribuicaoFaixas riscos={riscos} />
      </Secao>

      <Secao numero={2} titulo="Matriz de risco" norma="MR-MPS-SW:2023 · GPR 10">
        <MatrizPdf riscos={riscos} />
      </Secao>

      <Secao numero={3} titulo="Riscos identificados" norma="GPR 10">
        {riscos.length === 0 ? (
          <Typography sx={{ fontSize: "0.75rem", color: COR.suave }}>Nenhum risco neste recorte.</Typography>
        ) : (
          <Tabela
            colunas={[
              "Índice",
              "Risco",
              ...(umProjeto ? [] : ["Projeto"]),
              "Área",
              { rotulo: "P × I", estilo: { textAlign: "center" } },
              "Exposição",
              "Residual",
              "Status",
            ]}
          >
            {riscos.map((r) => (
              <tr key={r.id}>
                <td style={{ ...celula, fontWeight: 600, color: COR.marca, whiteSpace: "nowrap" }}>{r.indice}</td>
                <td style={{ ...celula, fontWeight: 500 }}>{r.titulo}</td>
                {!umProjeto && <td style={celula}>{projetoPorId.get(r.id_projeto)?.nome ?? "—"}</td>}
                <td style={celula}>{rotulo(AREAS_AFETADAS, r.area_afetada)}</td>
                <td style={{ ...celula, textAlign: "center", whiteSpace: "nowrap" }}>
                  {r.probabilidade} × {r.impacto}
                </td>
                <td style={celula}>
                  <MarcadorFaixa pontuacao={r.exposicao} />
                </td>
                <td style={celula}>{r.exposicao_residual != null ? <MarcadorFaixa pontuacao={r.exposicao_residual} rotulo={String(r.exposicao_residual)} /> : "—"}</td>
                <td style={{ ...celula, whiteSpace: "nowrap" }}>{rotulo(STATUS_RISCO, r.status)}</td>
              </tr>
            ))}
          </Tabela>
        )}
      </Secao>

      <Secao numero={4} titulo="Tratamento dos riscos" norma="GPR 10+ · mitigação e contingência">
        {riscos.map((r, indice) => {
          const rec = ultimaRec.get(r.id);
          return (
            <Box
              key={r.id}
              sx={{ py: 2, borderTop: indice === 0 ? "none" : `1px solid ${COR.linha}`, breakInside: "avoid" }}
            >
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, flexWrap: "wrap", mb: 1.25 }}>
                <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                  <Box component="span" sx={{ color: COR.marca, mr: 1 }}>
                    {r.indice}
                  </Box>
                  {r.titulo}
                </Typography>
                <Typography sx={{ fontSize: "0.6875rem", color: COR.suave, ml: "auto", display: "inline-flex", gap: 1.5 }}>
                  <MarcadorFaixa pontuacao={r.exposicao} />
                  <span>urgência {rotulo(URGENCIAS, r.urgencia).toLowerCase()}</span>
                </Typography>
              </Box>
              <Campos
                itens={[
                  ["Avaliação", `Probabilidade ${r.probabilidade} (${rotulo(PROBABILIDADES, r.probabilidade).toLowerCase()}) × impacto ${r.impacto} (${rotulo(IMPACTOS, r.impacto).toLowerCase()})`],
                  ["Impacto", r.descricao_impacto],
                  ["Mitigação", r.mitigacao],
                  ["Contingência", r.contingencia],
                  ["Gatilho", r.gatilho],
                  ["Plano do modelo", rec ? `${rec.plano?.descricao ?? "—"} (${decisao(rec).toLowerCase()})` : "Nenhuma recomendação gerada"],
                ]}
              />
            </Box>
          );
        })}
      </Secao>

      <Secao numero={5} titulo="Monitoramento" norma="GPR 17">
        <Tabela colunas={["Índice", "Risco", "Status", "Cadastro", "Última avaliação", "Situação"]}>
          {riscos.map((r) => {
            const pendente = precisaReavaliar(r);
            return (
              <tr key={r.id}>
                <td style={{ ...celula, fontWeight: 600, color: COR.marca, whiteSpace: "nowrap" }}>{r.indice}</td>
                <td style={celula}>{r.titulo}</td>
                <td style={{ ...celula, whiteSpace: "nowrap" }}>{rotulo(STATUS_RISCO, r.status)}</td>
                <td style={{ ...celula, whiteSpace: "nowrap" }}>{new Date(r.criado_em).toLocaleDateString("pt-BR")}</td>
                <td style={{ ...celula, whiteSpace: "nowrap" }}>{new Date(r.ultima_avaliacao_em ?? r.criado_em).toLocaleDateString("pt-BR")}</td>
                <td style={{ ...celula, whiteSpace: "nowrap", fontWeight: pendente ? 600 : 400 }}>
                  {pendente ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--argos-atencao)" }} />
                      Reavaliação pendente
                    </span>
                  ) : r.status === "encerrado" ? (
                    "Encerrado"
                  ) : (
                    "Em dia"
                  )}
                </td>
              </tr>
            );
          })}
        </Tabela>
        <Typography sx={{ fontSize: "0.6875rem", color: COR.suave, mt: 1.25 }}>
          Riscos ativos com a reavaliação vencida (prazo do projeto por faixa de exposição) devem ter as notas revisadas conforme o andamento do projeto.
        </Typography>
      </Secao>
    </DocumentoPdf>
  );
}
