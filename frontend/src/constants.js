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

// Escalas do registro de riscos (MR-MPS-SW / PMBOK): notas de 1 a 5.
export const PROBABILIDADES = [
  { value: 1, label: "Quase nula" },
  { value: 2, label: "Não provável" },
  { value: 3, label: "Provável" },
  { value: 4, label: "Muito provável" },
  { value: 5, label: "Esperado" },
];

export const IMPACTOS = [
  { value: 1, label: "Limitado" },
  { value: 2, label: "Baixo" },
  { value: 3, label: "Moderado" },
  { value: 4, label: "Elevado" },
  { value: 5, label: "Alto" },
];

// Escala de 3 níveis usada apenas pelos planos de contingência do catálogo
// (situação típica em que o plano se aplica).
export const PROBABILIDADES_PLANO = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

export const IMPACTOS_PLANO = [
  { value: "baixo", label: "Baixo" },
  { value: "medio", label: "Médio" },
  { value: "alto", label: "Alto" },
];

// Categoria de negócio do risco (área do projeto afetada). Cada área pertence a
// um dos 4 grupos PMBOK (CATEGORIAS), que alimenta o modelo de recomendação --
// mesmo mapeamento de AREA_PARA_CATEGORIA em app/models/enums.py.
export const AREAS_AFETADAS = [
  { value: "cronograma", label: "Cronograma", categoria: "organizacional" },
  { value: "custo", label: "Custo", categoria: "organizacional" },
  { value: "escopo", label: "Escopo", categoria: "organizacional" },
  { value: "qualidade", label: "Qualidade", categoria: "tecnico" },
  { value: "seguranca_informacao", label: "Segurança da informação", categoria: "tecnico" },
  { value: "infraestrutura", label: "Infraestrutura", categoria: "tecnico" },
  { value: "usabilidade", label: "Usabilidade", categoria: "tecnico" },
  { value: "equipe", label: "Equipe", categoria: "pessoal" },
  { value: "fornecedores", label: "Fornecedores", categoria: "externo" },
  { value: "legal_regulatorio", label: "Legal e regulatório", categoria: "externo" },
];

// Faixas da exposição (pontuação = probabilidade x impacto, de 1 a 25).
export const FAIXAS_EXPOSICAO = [
  { ate: 3, label: "Muito Leve", cor: "#4ADE80" },
  { ate: 10, label: "Leve", cor: "#A3E635" },
  { ate: 15, label: "Moderado", cor: "#FBBF24" },
  { ate: 20, label: "Grave", cor: "#FB923C" },
  { ate: 25, label: "Muito Grave", cor: "#F87171" },
];

export function faixaExposicao(pontuacao) {
  return FAIXAS_EXPOSICAO.find((faixa) => pontuacao <= faixa.ate) ?? FAIXAS_EXPOSICAO[FAIXAS_EXPOSICAO.length - 1];
}

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

// Aceita as notas 1-5 dos riscos (faixas da exposição) e, para os planos do
// catálogo, a escala de 3 níveis em texto.
export function nivelSeveridade(probabilidade, impacto) {
  if (typeof probabilidade === "number") {
    const exposicao = probabilidade * impacto;
    if (exposicao <= 10) return "baixo";
    if (exposicao <= 15) return "medio";
    return "alto";
  }
  const pontuacao = ESCALA_PROBABILIDADE[probabilidade] + ESCALA_IMPACTO[impacto];
  if (pontuacao <= 3) return "baixo";
  if (pontuacao === 4) return "medio";
  return "alto";
}

// Exposição numérica (probabilidade x impacto, 1 a 25) usada para ordenar riscos
// por criticidade.
export function pontuacaoSeveridade(probabilidade, impacto) {
  if (typeof probabilidade === "number") return probabilidade * impacto;
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

// Monitoramento contínuo (MR-MPS-SW:2023, GPR 17): risco ativo sem reavaliação
// há 30 dias ou mais (mesma regra de backend/app/assistente/monitoramento.py).
export const DIAS_PARA_REAVALIAR = 30;

export function precisaReavaliar(risco) {
  if (risco.status === "encerrado") return false;
  const data = new Date(risco.ultima_avaliacao_em ?? risco.criado_em);
  return (Date.now() - data.getTime()) / 86400000 >= DIAS_PARA_REAVALIAR;
}

// Risco residual (PMBOK / ISO 31000): exposição esperada após a mitigação.
// Sem previsão de residual, o risco conta com a exposição atual.
export function exposicaoResidual(risco) {
  return risco.exposicao_residual ?? risco.exposicao;
}

export function reducaoPercentual(antes, depois) {
  return antes > 0 ? Math.round(((antes - depois) / antes) * 100) : 0;
}
