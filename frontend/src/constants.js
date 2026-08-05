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

export const ALGORITMOS = [
  { value: "knn", label: "KNN" },
  { value: "decision_tree", label: "Decision Tree" },
  { value: "random_forest", label: "Random Forest" },
];

// Matriz de probabilidade x impacto -> nível de severidade (mesma regra usada
// para gerar o dataset semissintético em backend/ml/gerar_dataset.py).
const MATRIZ_SEVERIDADE = {
  "baixa|baixo": "baixo",
  "baixa|medio": "baixo",
  "baixa|alto": "medio",
  "media|baixo": "baixo",
  "media|medio": "medio",
  "media|alto": "alto",
  "alta|baixo": "medio",
  "alta|medio": "alto",
  "alta|alto": "alto",
};

export function nivelSeveridade(probabilidade, impacto) {
  return MATRIZ_SEVERIDADE[`${probabilidade}|${impacto}`] ?? "medio";
}

export const CORES_SEVERIDADE = {
  baixo: "#2e7d32",
  medio: "#ed6c02",
  alto: "#c62828",
};

export function rotulo(lista, value) {
  return lista.find((item) => item.value === value)?.label ?? value;
}
