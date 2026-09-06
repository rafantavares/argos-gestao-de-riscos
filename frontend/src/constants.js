// Valores devem bater exatamente com os enums do backend (app/models/enums.py).

export const CATEGORIAS = [
  { value: "tecnico", label: "Técnico" },
  { value: "organizacional", label: "Organizacional" },
  { value: "externo", label: "Externo" },
  { value: "pessoal", label: "Pessoal" },
];

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

const ESCALA_PROBABILIDADE = { baixa: 1, media: 2, alta: 3 };
const ESCALA_IMPACTO = { baixo: 1, medio: 2, alto: 3 };

export const CORES_SEVERIDADE = {
  baixo: "#4ADE80",
  medio: "#FBBF24",
  alto: "#F87171",
};

export const STATUS_RISCO = [
  { value: "identificado", label: "Identificado" },
  { value: "em_monitoramento", label: "Em monitoramento" },
  { value: "mitigado", label: "Mitigado" },
  { value: "encerrado", label: "Encerrado" },
];

// Cores do ciclo de vida do risco (independentes da cor de severidade, pra
// não confundir "em que fase o risco está" com "quão grave ele é").
export const CORES_STATUS = {
  identificado: "#8A93A6",
  em_monitoramento: "#FBBF24",
  mitigado: "#4ADE80",
  encerrado: "#A78BFA",
};

export function nivelSeveridade(probabilidade, impacto) {
  const pontuacao = ESCALA_PROBABILIDADE[probabilidade] + ESCALA_IMPACTO[impacto];
  if (pontuacao <= 3) return "baixo";
  if (pontuacao === 4) return "medio";
  return "alto";
}

export function rotulo(lista, value) {
  return lista.find((item) => item.value === value)?.label ?? value;
}
