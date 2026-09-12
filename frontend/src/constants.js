// Valores devem bater exatamente com os enums do backend (app/models/enums.py).
import pacote from "../package.json";

export const VERSAO_SISTEMA = pacote.version;

export const CATEGORIAS = [
  { value: "tecnico", label: "Técnico" },
  { value: "organizacional", label: "Organizacional" },
  { value: "externo", label: "Externo" },
  { value: "pessoal", label: "Pessoal" },
];

export const CORES_CATEGORIA = {
  tecnico: "#60A5FA",
  organizacional: "#A78BFA",
  externo: "#F472B6",
  pessoal: "#FB923C",
};

export const PROBABILIDADES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

export const IMPACTOS = [
  { value: "baixo", label: "Baixo" },
  { value: "medio", label: "Médio" },
  { value: "alto", label: "Alto" },
];

export const ORCAMENTOS_IMPACTO = [
  { value: "baixo", label: "Baixo" },
  { value: "medio", label: "Médio" },
  { value: "alto", label: "Alto" },
];

export const URGENCIAS = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

// Fase do ciclo de vida do projeto (PMBOK) em que o risco foi identificado.
export const FASES_PROJETO = [
  { value: "iniciacao", label: "Iniciação", progresso: 15 },
  { value: "planejamento", label: "Planejamento", progresso: 40 },
  { value: "execucao", label: "Execução", progresso: 70 },
  { value: "encerramento", label: "Encerramento", progresso: 95 },
];

const ESCALA_PROBABILIDADE = { baixa: 1, media: 2, alta: 3 };
const ESCALA_IMPACTO = { baixo: 1, medio: 2, alto: 3 };

export const CORES_SEVERIDADE = {
  baixo: "#4ADE80",
  medio: "#FBBF24",
  alto: "#F87171",
};

export const ROTULOS_SEVERIDADE = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
};

export const STATUS_RISCO = [
  { value: "identificado", label: "Identificado" },
  { value: "em_tratamento", label: "Em tratamento" },
  { value: "em_monitoramento", label: "Em monitoramento" },
  { value: "mitigado", label: "Mitigado" },
  { value: "encerrado", label: "Encerrado" },
];

// Cores do ciclo de vida do risco (independentes da cor de severidade, pra
// não confundir "em que fase o risco está" com "quão grave ele é").
export const CORES_STATUS = {
  identificado: "#8A93A6",
  em_tratamento: "#2DD4BF",
  em_monitoramento: "#FBBF24",
  mitigado: "#4ADE80",
  encerrado: "#A78BFA",
};

export const NOMES_ALGORITMOS = {
  knn: "KNN",
  arvore_decisao: "Árvore de Decisão",
  random_forest: "Random Forest",
};

export const CORES_ALGORITMOS = {
  knn: "#2DD4BF",
  arvore_decisao: "#60A5FA",
  random_forest: "#A78BFA",
};

export const ALGORITMOS = ["knn", "arvore_decisao", "random_forest"];

export function nivelSeveridade(probabilidade, impacto) {
  const pontuacao = ESCALA_PROBABILIDADE[probabilidade] + ESCALA_IMPACTO[impacto];
  if (pontuacao <= 3) return "baixo";
  if (pontuacao === 4) return "medio";
  return "alto";
}

// Pontuação numérica (probabilidade x impacto, 1 a 9) usada para ordenar riscos
// por criticidade -- escala clássica da matriz PMBOK.
export function pontuacaoSeveridade(probabilidade, impacto) {
  return (ESCALA_PROBABILIDADE[probabilidade] ?? 0) * (ESCALA_IMPACTO[impacto] ?? 0);
}

// Faixas de confiança da recomendação (probabilidade da classe prevista).
export function corConfianca(confianca) {
  if (confianca == null) return "#8A93A6";
  if (confianca >= 0.8) return CORES_SEVERIDADE.baixo;
  if (confianca >= 0.6) return CORES_SEVERIDADE.medio;
  return CORES_SEVERIDADE.alto;
}

export function rotuloConfianca(confianca) {
  if (confianca == null) return "Não disponível";
  if (confianca >= 0.8) return "Alta confiança";
  if (confianca >= 0.6) return "Confiança moderada";
  return "Baixa confiança";
}

export function rotulo(lista, value) {
  return lista.find((item) => item.value === value)?.label ?? value;
}

export function iniciais(nome) {
  return (nome ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
}
