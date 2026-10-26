import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "../../contexts/AuthContext";
import {
  projetos as servicoProjetos,
  recomendacoes as servicoRecomendacoes,
  riscos as servicoRiscos,
} from "../../services/api";
import {
  AREAS_AFETADAS,
  CATEGORIAS,
  FASES_PROJETO,
  IMPACTOS,
  NOMES_ALGORITMOS,
  ORCAMENTOS_IMPACTO,
  PROBABILIDADES,
  STATUS_RISCO,
  URGENCIAS,
  faixaExposicao,
  precisaReavaliar,
  reducaoPercentual,
  rotulo,
} from "../../constants";
import { COR, Campos, DocumentoPdf, MarcadorFaixa, Secao, Tabela, celula, quando } from "../../components/DocumentoPdf";
import MiniMatriz from "../../components/MiniMatriz";

const data = (valor) => new Date(valor).toLocaleDateString("pt-BR");
const dataHora = (valor) =>
  new Date(valor).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function decisao(rec) {
  if (rec.aceita === true) return "Aceito";
  if (rec.aceita === false) return "Rejeitado";
  return "Aguardando decisão";
}

// Ficha completa de um risco em PDF: registro, avaliação, tratamento, planos
// recomendados pelo modelo, evolução da exposição, histórico e evidências.
export default function FichaRiscoPdf() {
  const { idRisco } = useParams();
  const { usuario } = useAuth();
  const [dados, setDados] = useState(null);

  useEffect(() => {
    Promise.all([
      servicoRiscos.obter(idRisco),
      servicoRiscos.historico(idRisco),
      servicoRiscos.evolucao(idRisco).catch(() => null),
      servicoRiscos.anexos(idRisco).catch(() => []),
      servicoRecomendacoes.listarPorRisco(idRisco).catch(() => []),
      servicoProjetos.meus().catch(() => []),
    ])
      .then(([risco, historico, evolucao, anexos, recomendacoes, projetos]) =>
        setDados({ risco, historico, evolucao, anexos, recomendacoes, projetos })
      )
      .catch(() => setDados({ erro: true }));
  }, [idRisco]);

  if (!dados) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }
  if (dados.erro) {
    return <Typography sx={{ p: 4 }}>Não foi possível carregar o risco.</Typography>;
  }

  const { risco, historico, evolucao, anexos, recomendacoes, projetos } = dados;
  const faixa = faixaExposicao(risco.exposicao);
  const projeto = projetos.find((p) => p.id === risco.id_projeto);
  const pontos = evolucao?.pontos ?? [];
  const situacao = [
    rotulo(STATUS_RISCO, risco.status),
    risco.arquivado ? "arquivado" : null,
    precisaReavaliar(risco) ? "reavaliação pendente" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <DocumentoPdf
      titulo={`${risco.indice} · ${risco.titulo}`}
      subtitulo={`Ficha do risco · ${projeto?.nome ?? "Projeto"}`}
      metadados={[
        ["Situação", situacao],
        ["Cadastrado em", data(risco.criado_em)],
        ["Última avaliação", data(risco.ultima_avaliacao_em ?? risco.criado_em)],
        ["Emitido em", `${quando()} por ${usuario.nome}`],
      ]}
    >
      {/* Exposição em destaque: célula da matriz + posição na matriz */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 3, mt: 3.5, p: 2, bgcolor: COR.fundo, borderRadius: 2, breakInside: "avoid" }}>
        <Box
          sx={{
            width: 88,
            height: 88,
            borderRadius: 2,
            bgcolor: faixa.cor,
            color: faixa.corTexto,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 34, fontWeight: 700, lineHeight: 1, color: "inherit", fontFamily: '"Space Grotesk", sans-serif !important' }}>
              {risco.exposicao}
            </Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: "inherit" }}>{faixa.label}</Typography>
          </Box>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 11, color: COR.suave }}>Exposição = probabilidade × impacto (1 a 25)</Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 600, mt: 0.5 }}>
            Probabilidade {risco.probabilidade} ({rotulo(PROBABILIDADES, risco.probabilidade).toLowerCase()}) × impacto{" "}
            {risco.impacto} ({rotulo(IMPACTOS, risco.impacto).toLowerCase()})
          </Typography>
          {risco.exposicao_residual != null && (
            <Typography sx={{ fontSize: 12, color: COR.suave, mt: 0.5, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              Esperada após a mitigação:
              <Box component="span" sx={{ color: COR.texto, fontWeight: 600 }}>
                <MarcadorFaixa pontuacao={risco.exposicao_residual} />
              </Box>
              (redução de {reducaoPercentual(risco.exposicao, risco.exposicao_residual)}%)
            </Typography>
          )}
        </Box>
        <MiniMatriz probabilidade={risco.probabilidade} impacto={risco.impacto} tamanho={12} folga={3} />
      </Box>

      <Secao numero={1} titulo="Identificação e avaliação" norma="MR-MPS-SW:2023 · GPR 10">
        <Campos
          itens={[
            ["Projeto", projeto?.nome],
            ["Área afetada", rotulo(AREAS_AFETADAS, risco.area_afetada)],
            ["Grupo PMBOK", rotulo(CATEGORIAS, risco.categoria)],
            ["Fase do projeto", rotulo(FASES_PROJETO, risco.fase_projeto)],
            ["Urgência", rotulo(URGENCIAS, risco.urgencia)],
            ["Impacto no orçamento", rotulo(ORCAMENTOS_IMPACTO, risco.orcamento_impacto)],
            ["Descrição do impacto", risco.descricao_impacto],
          ]}
        />
      </Secao>

      <Secao numero={2} titulo="Tratamento" norma="GPR 10+ · mitigação e contingência">
        <Campos
          itens={[
            ["Mitigação", risco.mitigacao],
            [
              "Exposição residual",
              risco.exposicao_residual != null
                ? `Probabilidade ${risco.probabilidade_residual} × impacto ${risco.impacto_residual} = ${risco.exposicao_residual} (${risco.avaliacao_exposicao_residual})`
                : "Sem previsão",
            ],
            ["Contingência", risco.contingencia],
            ["Gatilho", risco.gatilho],
          ]}
        />
      </Secao>

      <Secao numero={3} titulo="Planos recomendados pelo modelo" norma="apoio à decisão">
        {recomendacoes.length === 0 ? (
          <Typography sx={{ fontSize: 12, color: COR.suave }}>Nenhuma recomendação gerada.</Typography>
        ) : (
          <Tabela
            colunas={["Data", "Plano de contingência", "Algoritmo", { rotulo: "Confiança", estilo: { textAlign: "right" } }, "Decisão"]}
          >
            {[...recomendacoes]
              .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
              .map((rec) => (
                <tr key={rec.id}>
                  <td style={{ ...celula, whiteSpace: "nowrap" }}>{data(rec.criado_em)}</td>
                  <td style={celula}>{rec.plano?.descricao ?? "—"}</td>
                  <td style={celula}>
                    {NOMES_ALGORITMOS[rec.algoritmo_usado] ?? rec.algoritmo_usado}
                    {rec.acuracia_momento ? (
                      <span style={{ color: COR.suave }}>
                        {" "}
                        · acurácia {(rec.acuracia_momento * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                      </span>
                    ) : null}
                  </td>
                  <td style={{ ...celula, textAlign: "right", whiteSpace: "nowrap" }}>
                    {rec.confianca != null ? `${Math.round(rec.confianca * 100)}%` : "—"}
                  </td>
                  <td style={{ ...celula, fontWeight: 600, whiteSpace: "nowrap" }}>{decisao(rec)}</td>
                </tr>
              ))}
          </Tabela>
        )}
      </Secao>

      <Secao numero={4} titulo="Evolução da exposição" norma="GPR 17 · monitoramento">
        {pontos.length <= 1 ? (
          <Typography sx={{ fontSize: 12, color: COR.suave }}>
            Sem reavaliações: a exposição é a da avaliação inicial ({risco.exposicao} · {risco.avaliacao_exposicao}).
          </Typography>
        ) : (
          <>
            <Tabela colunas={["Data", { rotulo: "P × I", estilo: { textAlign: "center" } }, "Exposição", "Fase", "Justificativa"]}>
              {pontos.map((p, i) => (
                <tr key={i}>
                  <td style={{ ...celula, whiteSpace: "nowrap" }}>{i === 0 ? `${data(p.data)} (inicial)` : data(p.data)}</td>
                  <td style={{ ...celula, textAlign: "center", whiteSpace: "nowrap" }}>
                    {p.probabilidade} × {p.impacto}
                  </td>
                  <td style={celula}>
                    <MarcadorFaixa pontuacao={p.exposicao} />
                  </td>
                  <td style={{ ...celula, whiteSpace: "nowrap" }}>{rotulo(FASES_PROJETO, p.fase_projeto)}</td>
                  <td style={celula}>{p.justificativa || "—"}</td>
                </tr>
              ))}
            </Tabela>
            {evolucao?.tendencia && (
              <Typography sx={{ fontSize: 11, color: COR.suave, mt: 1.25 }}>
                Tendência: exposição {evolucao.tendencia === "caindo" ? "caindo" : evolucao.tendencia === "subindo" ? "subindo" : "estável"}.
              </Typography>
            )}
          </>
        )}
      </Secao>

      <Secao numero={5} titulo="Histórico do ciclo de vida" norma="GPR 17">
        <Tabela colunas={["Data", "Mudança de status", "Comentário"]}>
          {historico.map((h) => (
            <tr key={h.id}>
              <td style={{ ...celula, whiteSpace: "nowrap" }}>{dataHora(h.criado_em)}</td>
              <td style={{ ...celula, whiteSpace: "nowrap" }}>
                {h.status_anterior ? <span style={{ color: COR.suave }}>{rotulo(STATUS_RISCO, h.status_anterior)} → </span> : null}
                <strong>{rotulo(STATUS_RISCO, h.status_novo)}</strong>
              </td>
              <td style={celula}>{h.comentario || "—"}</td>
            </tr>
          ))}
        </Tabela>
      </Secao>

      <Secao numero={6} titulo="Evidências anexadas">
        {anexos.length === 0 ? (
          <Typography sx={{ fontSize: 12, color: COR.suave }}>Nenhuma evidência anexada.</Typography>
        ) : (
          <Tabela colunas={["Arquivo", { rotulo: "Tamanho", estilo: { textAlign: "right" } }, "Anexado em"]}>
            {anexos.map((a) => (
              <tr key={a.id}>
                <td style={celula}>{a.nome_arquivo}</td>
                <td style={{ ...celula, textAlign: "right", whiteSpace: "nowrap" }}>{Math.max(1, Math.round(a.tamanho / 1024))} KB</td>
                <td style={{ ...celula, whiteSpace: "nowrap" }}>{data(a.criado_em)}</td>
              </tr>
            ))}
          </Tabela>
        )}
        {risco.id_conversa_origem && (
          <Typography sx={{ fontSize: 11, color: COR.suave, mt: 1.25 }}>
            Risco criado a partir de uma conversa com o Assistente IA (sugestão revisada pelo gerente).
          </Typography>
        )}
      </Secao>
    </DocumentoPdf>
  );
}
