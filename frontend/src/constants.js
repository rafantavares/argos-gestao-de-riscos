// Valores devem bater exatamente com os enums do backend (app/models/enums.py).
import pacote from "../package.json";
import { corExposicao, textoExposicao, v } from "./theme";

export const VERSAO_SISTEMA = pacote.version;

export const CATEGORIAS = [
  { value: "tecnico", label: "Técnico" },
  { value: "organizacional", label: "Organizacional" },
  { value: "externo", label: "Externo" },
  { value: "pessoal", label: "Pessoal" },
];

// Categorias não têm cor própria (ícone + rótulo bastam; quatro cores
// distintas não passam no teste de daltonismo).
export const CORES_CATEGORIA = {
  tecnico: v("texto2"),
  organizacional: v("texto2"),
  externo: v("texto2"),
  pessoal: v("texto2"),
};

// Só para gráficos que separam séries por categoria (ex.: barras empilhadas).
export const CORES_SERIE_CATEGORIA = {
  tecnico: v("serie0"),
  organizacional: v("serie1"),
  externo: v("serie2"),
  pessoal: v("serie3"),
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
// As cores vêm do tema (escala padrão ou a do modo daltônico, claro ou escuro).
export const FAIXAS_EXPOSICAO = [
  { ate: 3, label: "Muito Leve" },
  { ate: 10, label: "Leve" },
  { ate: 15, label: "Moderado" },
  { ate: 20, label: "Grave" },
  { ate: 25, label: "Muito Grave" },
].map((faixa, indice) => ({ ...faixa, indice, cor: corExposicao(indice), corTexto: textoExposicao(indice) }));

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
  baixo: corExposicao(1),
  medio: corExposicao(2),
  alto: corExposicao(4),
};

export const TEXTO_SEVERIDADE = {
  baixo: textoExposicao(1),
  medio: textoExposicao(2),
  alto: textoExposicao(4),
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
  identificado: v("texto2"),
  em_tratamento: v("marca"),
  em_monitoramento: v("info"),
  mitigado: v("sucesso"),
  encerrado: v("texto3"),
};

export const NOMES_ALGORITMOS = {
  knn: "KNN",
  arvore_decisao: "Árvore de Decisão",
  random_forest: "Random Forest",
};

export const CORES_ALGORITMOS = {
  knn: v("serie0"),
  arvore_decisao: v("serie1"),
  random_forest: v("serie2"),
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
  if (confianca == null) return v("texto3");
  if (confianca >= 0.8) return v("sucesso");
  if (confianca >= 0.6) return v("atencao");
  return v("erro");
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
