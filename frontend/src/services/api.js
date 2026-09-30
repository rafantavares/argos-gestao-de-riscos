import axios from "axios";

const CHAVE_TOKEN = "tcc_risco_token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(CHAVE_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    if (erro.response?.status === 401) {
      localStorage.removeItem(CHAVE_TOKEN);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(erro);
  }
);

export function salvarToken(token) {
  localStorage.setItem(CHAVE_TOKEN, token);
}

export function obterToken() {
  return localStorage.getItem(CHAVE_TOKEN);
}

export function removerToken() {
  localStorage.removeItem(CHAVE_TOKEN);
}

// --- auth ---
export const auth = {
  login: (email, senha) => api.post("/auth/login", { email, senha }).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  cadastrarGerente: (dados) => api.post("/auth/gerentes", dados).then((r) => r.data),
  listarGerentes: () => api.get("/auth/gerentes").then((r) => r.data),
};

// --- projetos ---
export const projetos = {
  listar: () => api.get("/projetos").then((r) => r.data),
  meus: () => api.get("/projetos/meus").then((r) => r.data),
  criar: (dados) => api.post("/projetos", dados).then((r) => r.data),
  editar: (id, dados) => api.put(`/projetos/${id}`, dados).then((r) => r.data),
  vincularGerente: (idProjeto, idGerente) =>
    api.post(`/projetos/${idProjeto}/gerentes`, { id_gerente: idGerente }).then((r) => r.data),
  listarGerentesVinculados: (idProjeto) =>
    api.get(`/projetos/${idProjeto}/gerentes`).then((r) => r.data),
};

// --- riscos ---
export const riscos = {
  criar: (dados) => api.post("/riscos", dados).then((r) => r.data),
  listarMeus: () => api.get("/riscos").then((r) => r.data),
  obter: (id) => api.get(`/riscos/${id}`).then((r) => r.data),
  listarPorProjeto: (idProjeto) => api.get(`/riscos/projeto/${idProjeto}`).then((r) => r.data),
  atualizarStatus: (id, statusNovo, comentario) =>
    api.patch(`/riscos/${id}/status`, { status: statusNovo, comentario }).then((r) => r.data),
  historico: (id) => api.get(`/riscos/${id}/historico`).then((r) => r.data),
  atualizarTratamento: (id, dados) => api.patch(`/riscos/${id}/tratamento`, dados).then((r) => r.data),
  reavaliar: (id, dados) => api.post(`/riscos/${id}/reavaliacao`, dados).then((r) => r.data),
  evolucao: (id) => api.get(`/riscos/${id}/evolucao`).then((r) => r.data),
  assistente: (dados) => api.post("/riscos/assistente", dados).then((r) => r.data),
  listarTodosAdmin: () => api.get("/riscos/admin/todos").then((r) => r.data),
};

// --- recomendacoes ---
export const recomendacoes = {
  gerar: (idRisco) => api.post(`/recomendacoes/gerar/${idRisco}`).then((r) => r.data),
  listarMinhas: () => api.get("/recomendacoes").then((r) => r.data),
  listarPorRisco: (idRisco) => api.get(`/recomendacoes/risco/${idRisco}`).then((r) => r.data),
  responder: (id, aceita) => api.patch(`/recomendacoes/${id}`, { aceita }).then((r) => r.data),
  listarTodasAdmin: () => api.get("/recomendacoes/admin/todas").then((r) => r.data),
  metricasHistorico: () => api.get("/recomendacoes/admin/metricas-historico").then((r) => r.data),
};

// --- módulo de ML ---
export const ml = {
  metricas: () => api.get("/ml/metricas").then((r) => r.data),
  importanciaFeatures: () => api.get("/ml/feature-importance").then((r) => r.data),
};

// --- relatórios (admin) ---
export const relatorio = {
  riscos: (idProjeto, idGerente) =>
    api
      .get("/relatorio/riscos", {
        params: {
          ...(idProjeto ? { id_projeto: idProjeto } : {}),
          ...(idGerente ? { id_gerente: idGerente } : {}),
        },
      })
      .then((r) => r.data),
};

// --- planos de contingência (admin) ---
export const planos = {
  listar: () => api.get("/planos").then((r) => r.data),
  criar: (dados) => api.post("/planos", dados).then((r) => r.data),
  editar: (id, dados) => api.put(`/planos/${id}`, dados).then((r) => r.data),
  alternarAtivo: (id, ativo) =>
    api.patch(`/planos/${id}/ativo?ativo=${ativo}`).then((r) => r.data),
};
