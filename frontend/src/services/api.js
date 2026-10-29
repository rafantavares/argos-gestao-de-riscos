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
  // Cadastro aberto: cria a conta (gerente) e devolve o token, como o login.
  cadastrar: (nome, email, senha) => api.post("/auth/cadastro", { nome, email, senha }).then((r) => r.data),
  // A troca de senha encerra as outras sessões e devolve um token novo.
  trocarSenha: (senhaAtual, senhaNova) =>
    api.patch("/auth/me/senha", { senha_atual: senhaAtual, senha_nova: senhaNova }).then((r) => r.data),
  atualizar: (dados) => api.patch("/auth/me", dados).then((r) => r.data),
  salvarPreferencias: (preferencias) => api.put("/auth/me/preferencias", preferencias).then((r) => r.data),
  resumo: () => api.get("/auth/me/resumo").then((r) => r.data),
  acessos: () => api.get("/auth/me/acessos").then((r) => r.data),
  encerrarOutrasSessoes: () => api.post("/auth/me/encerrar-outras-sessoes").then((r) => r.data),
  exportarDados: () => api.get("/auth/me/dados").then((r) => r.data),
  excluirConta: (senha) => api.post("/auth/me/excluir", { senha }),
};

// --- projetos ---
export const projetos = {
  meus: (incluirArquivados = false) =>
    api.get("/projetos/meus", { params: incluirArquivados ? { incluir_arquivados: true } : {} }).then((r) => r.data),
  criar: (dados) => api.post("/projetos", dados).then((r) => r.data),
  editar: (id, dados) => api.put(`/projetos/${id}`, dados).then((r) => r.data),
  arquivar: (id, arquivado) => api.patch(`/projetos/${id}/arquivo`, { arquivado }).then((r) => r.data),
  excluir: (id, confirmacao) => api.delete(`/projetos/${id}`, { params: confirmacao ? { confirmacao } : {} }),
};

// --- riscos ---
export const riscos = {
  criar: (dados) => api.post("/riscos", dados).then((r) => r.data),
  listarMeus: (incluirArquivados = false) =>
    api.get("/riscos", { params: incluirArquivados ? { incluir_arquivados: true } : {} }).then((r) => r.data),
  arquivar: (id, arquivado) => api.patch(`/riscos/${id}/arquivo`, { arquivado }).then((r) => r.data),
  anexos: (id) => api.get(`/riscos/${id}/anexos`).then((r) => r.data),
  anexar: (id, arquivo) => {
    const formulario = new FormData();
    formulario.append("arquivo", arquivo);
    return api.post(`/riscos/${id}/anexos`, formulario).then((r) => r.data);
  },
  baixarAnexo: (id, idAnexo) =>
    api.get(`/riscos/${id}/anexos/${idAnexo}`, { responseType: "blob" }).then((r) => r.data),
  excluirAnexo: (id, idAnexo) => api.delete(`/riscos/${id}/anexos/${idAnexo}`),
  obter: (id) => api.get(`/riscos/${id}`).then((r) => r.data),
  listarPorProjeto: (idProjeto) => api.get(`/riscos/projeto/${idProjeto}`).then((r) => r.data),
  atualizarStatus: (id, statusNovo, comentario) =>
    api.patch(`/riscos/${id}/status`, { status: statusNovo, comentario }).then((r) => r.data),
  historico: (id) => api.get(`/riscos/${id}/historico`).then((r) => r.data),
  auditoria: (id) => api.get(`/riscos/${id}/auditoria`).then((r) => r.data),
  atualizarTratamento: (id, dados) => api.patch(`/riscos/${id}/tratamento`, dados).then((r) => r.data),
  reavaliar: (id, dados) => api.post(`/riscos/${id}/reavaliacao`, dados).then((r) => r.data),
  evolucao: (id) => api.get(`/riscos/${id}/evolucao`).then((r) => r.data),
  calibracao: () => api.get("/riscos/painel/calibracao").then((r) => r.data),
  evolucaoAgregada: (idProjeto, semanas = 12) =>
    api.get("/riscos/painel/evolucao", { params: { id_projeto: idProjeto, semanas } }).then((r) => r.data),
  assistente: (dados) => api.post("/riscos/assistente", dados).then((r) => r.data),
};

// --- chat do assistente de IA ---
export const chat = {
  conversar: (idProjeto, mensagens, idConversa) =>
    api
      .post("/chat", { id_projeto: idProjeto, mensagens, id_conversa: idConversa ?? undefined })
      .then((r) => r.data),
  conversas: (idProjeto) => api.get("/chat/conversas", { params: { id_projeto: idProjeto } }).then((r) => r.data),
  conversa: (idConversa) => api.get(`/chat/conversas/${idConversa}`).then((r) => r.data),
  renomearConversa: (idConversa, titulo) =>
    api.patch(`/chat/conversas/${idConversa}`, { titulo }).then((r) => r.data),
  excluirConversa: (idConversa) => api.delete(`/chat/conversas/${idConversa}`),
  rascunho: (idProjeto, mensagens) =>
    api.post("/chat/rascunho", { id_projeto: idProjeto, mensagens }).then((r) => r.data),
};

// --- recomendacoes ---
export const recomendacoes = {
  gerar: (idRisco) => api.post(`/recomendacoes/gerar/${idRisco}`).then((r) => r.data),
  listarMinhas: () => api.get("/recomendacoes").then((r) => r.data),
  listarPorRisco: (idRisco) => api.get(`/recomendacoes/risco/${idRisco}`).then((r) => r.data),
  responder: (id, aceita, motivoRejeicao) =>
    api.patch(`/recomendacoes/${id}`, { aceita, motivo_rejeicao: motivoRejeicao || null }).then((r) => r.data),
  metricasHistorico: () => api.get("/recomendacoes/metricas-historico").then((r) => r.data),
};

// --- módulo de ML ---
export const ml = {
  metricas: () => api.get("/ml/metricas").then((r) => r.data),
  importanciaFeatures: () => api.get("/ml/feature-importance").then((r) => r.data),
};

// --- planos de contingência (catálogo que o modelo recomenda; só consulta) ---
export const planos = {
  listar: () => api.get("/planos").then((r) => r.data),
};
