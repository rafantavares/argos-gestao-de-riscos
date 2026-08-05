import api from "./api";

export async function listarProjetos() {
  const { data } = await api.get("/projetos");
  return data;
}

export async function obterProjeto(id) {
  const { data } = await api.get(`/projetos/${id}`);
  return data;
}

export async function criarProjeto(dados) {
  const { data } = await api.post("/projetos", dados);
  return data;
}

export async function atualizarProjeto(id, dados) {
  const { data } = await api.put(`/projetos/${id}`, dados);
  return data;
}

export async function removerProjeto(id) {
  await api.delete(`/projetos/${id}`);
}
