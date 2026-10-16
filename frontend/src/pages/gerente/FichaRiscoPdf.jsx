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
  rotulo,
} from "../../constants";
import { COR, DocumentoPdf, Etiqueta, Secao, cabecalho, celula } from "../../components/DocumentoPdf";
import MiniMatriz from "../../components/MiniMatriz";

const data = (valor) => new Date(valor).toLocaleDateString("pt-BR");
const dataHora = (valor) =>
  new Date(valor).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function Campo({ nome, children }) {
  return (
    <Box sx={{ mb: 0.75 }}>
      <Typography sx={{ fontSize: 10, color: COR.suave, textTransform: "uppercase", letterSpacing: 0.4 }}>{nome}</Typography>
      <Typography sx={{ fontSize: 12 }}>{children || "—"}</Typography>
    </Box>
  );
}

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

  return (
    <DocumentoPdf
      titulo={`Ficha do risco ${risco.indice}`}
      subtitulo={`${projeto?.nome ?? "Projeto"} · ${risco.titulo}`}
      responsavel={usuario.nome}
    >
      {/* Identificação + exposição em destaque */}
      <Box sx={{ display: "flex", gap: 2.5, alignItems: "center", mt: 2.5, flexWrap: "wrap" }}>
        <Box
          sx={{
            width: 92,
            height: 92,
            borderRadius: 1.5,
            border: `2px solid ${faixa.cor}`,
            bgcolor: `${faixa.cor}33`,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 34, fontWeight: 700, lineHeight: 1 }}>{risco.exposicao}</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{faixa.label}</Typography>
          </Box>
        </Box>
        <Box sx={{ flex: 1, minWidth: 260 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25 }}>
            <span style={{ color: COR.marca }}>{risco.indice}</span> · {risco.titulo}
          </Typography>
          <Typography sx={{ fontSize: 12, color: COR.suave, mt: 0.5 }}>
            Status: <strong style={{ color: COR.texto }}>{rotulo(STATUS_RISCO, risco.status)}</strong>
            {risco.arquivado ? " · ARQUIVADO" : ""}
            {precisaReavaliar(risco) ? " · reavaliação pendente (30+ dias)" : ""} · cadastrado em {data(risco.criado_em)} ·
            última avaliação em {data(risco.ultima_avaliacao_em ?? risco.criado_em)}
          </Typography>
        </Box>
        <MiniMatriz probabilidade={risco.probabilidade} impacto={risco.impacto} tamanho={13} folga={3} />
      </Box>

      <Secao numero={1} titulo="Identificação e avaliação" norma="MR-MPS-SW:2023 · GPR 10">
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", columnGap: 2 }}>
          <Campo nome="Área afetada">{rotulo(AREAS_AFETADAS, risco.area_afetada)}</Campo>
          <Campo nome="Grupo PMBOK">{rotulo(CATEGORIAS, risco.categoria)}</Campo>
          <Campo nome="Fase do projeto">{rotulo(FASES_PROJETO, risco.fase_projeto)}</Campo>
          <Campo nome="Probabilidade">
            {risco.probabilidade} · {rotulo(PROBABILIDADES, risco.probabilidade)}
          </Campo>
          <Campo nome="Impacto">
            {risco.impacto} · {rotulo(IMPACTOS, risco.impacto)}
          </Campo>
          <Campo nome="Exposição (P × I)">
            {risco.exposicao} · {risco.avaliacao_exposicao}
          </Campo>
          <Campo nome="Urgência">{rotulo(URGENCIAS, risco.urgencia)}</Campo>
          <Campo nome="Impacto no orçamento">{rotulo(ORCAMENTOS_IMPACTO, risco.orcamento_impacto)}</Campo>
          <Campo nome="Projeto">{projeto?.nome}</Campo>
        </Box>
        <Campo nome="Descrição do impacto">{risco.descricao_impacto}</Campo>
      </Secao>

      <Secao numero={2} titulo="Tratamento" norma="GPR 10+ · mitigação e contingência">
        <Campo nome="Mitigação (ação preventiva)">{risco.mitigacao}</Campo>
        <Campo nome="Contingência (ação reativa)">{risco.contingencia}</Campo>
        <Campo nome="Gatilho">{risco.gatilho}</Campo>
      </Secao>

      <Secao numero={3} titulo="Planos recomendados pelo modelo" norma="apoio à decisão">
        {recomendacoes.length === 0 ? (
          <Typography sx={{ fontSize: 12, color: COR.suave }}>Nenhuma recomendação gerada.</Typography>
        ) : (
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                {["Data", "Plano de contingência", "Algoritmo", "Confiança", "Decisão"].map((c) => (
                  <th key={c} style={cabecalho}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...recomendacoes]
                .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
                .map((rec) => (
                  <tr key={rec.id} style={{ breakInside: "avoid" }}>
                    <td style={{ ...celula, whiteSpace: "nowrap" }}>{data(rec.criado_em)}</td>
                    <td style={celula}>{rec.plano?.descricao ?? "—"}</td>
                    <td style={celula}>
                      {NOMES_ALGORITMOS[rec.algoritmo_usado] ?? rec.algoritmo_usado}
                      {rec.acuracia_momento ? ` (acurácia ${(rec.acuracia_momento * 100).toFixed(1)}%)` : ""}
                    </td>
                    <td style={{ ...celula, textAlign: "right" }}>
                      {rec.confianca != null ? `${(rec.confianca * 100).toFixed(0)}%` : "—"}
                    </td>
                    <td style={{ ...celula, fontWeight: 700 }}>{decisao(rec)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </Secao>

      <Secao numero={4} titulo="Evolução da exposição" norma="GPR 17 · monitoramento">
        {pontos.length <= 1 ? (
          <Typography sx={{ fontSize: 12, color: COR.suave }}>
            Sem reavaliações: a exposição é a da avaliação inicial ({risco.exposicao} · {risco.avaliacao_exposicao}).
          </Typography>
        ) : (
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                {["Data", "P × I", "Exposição", "Fase", "Justificativa"].map((c) => (
                  <th key={c} style={cabecalho}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pontos.map((p, i) => (
                <tr key={i} style={{ breakInside: "avoid" }}>
                  <td style={{ ...celula, whiteSpace: "nowrap" }}>{data(p.data)}</td>
                  <td style={celula}>
                    {p.probabilidade} × {p.impacto}
                  </td>
                  <td style={celula}>
                    <Etiqueta cor={faixaExposicao(p.exposicao).cor}>
                      {p.exposicao} · {p.avaliacao}
                    </Etiqueta>
                  </td>
                  <td style={celula}>{rotulo(FASES_PROJETO, p.fase_projeto)}</td>
                  <td style={celula}>{p.justificativa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {evolucao?.tendencia && pontos.length > 1 && (
          <Typography sx={{ fontSize: 11, color: COR.suave, mt: 1 }}>
            Tendência: exposição {evolucao.tendencia === "caindo" ? "caindo" : evolucao.tendencia === "subindo" ? "subindo" : "estável"}.
          </Typography>
        )}
      </Secao>

      <Secao numero={5} titulo="Histórico do ciclo de vida" norma="GPR 17">
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              {["Data", "Mudança de status", "Comentário"].map((c) => (
                <th key={c} style={cabecalho}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {historico.map((h) => (
              <tr key={h.id} style={{ breakInside: "avoid" }}>
                <td style={{ ...celula, whiteSpace: "nowrap" }}>{dataHora(h.criado_em)}</td>
                <td style={celula}>
                  {h.status_anterior ? `${rotulo(STATUS_RISCO, h.status_anterior)} → ` : ""}
                  <strong>{rotulo(STATUS_RISCO, h.status_novo)}</strong>
                </td>
                <td style={celula}>{h.comentario ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Secao>

      <Secao numero={6} titulo="Evidências anexadas">
        {anexos.length === 0 ? (
          <Typography sx={{ fontSize: 12, color: COR.suave }}>Nenhuma evidência anexada.</Typography>
        ) : (
          anexos.map((a) => (
            <Typography key={a.id} sx={{ fontSize: 12 }}>
              • {a.nome_arquivo}{" "}
              <span style={{ color: COR.suave }}>
                ({(a.tamanho / 1024).toFixed(0)} KB, anexado em {data(a.criado_em)})
              </span>
            </Typography>
          ))
        )}
        {risco.id_conversa_origem && (
          <Typography sx={{ fontSize: 11, color: COR.suave, mt: 1 }}>
            Risco criado a partir de uma conversa com o Assistente IA (sugestão revisada pelo gerente).
          </Typography>
        )}
      </Secao>
    </DocumentoPdf>
  );
}
