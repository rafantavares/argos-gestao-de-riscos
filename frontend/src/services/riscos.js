import api from "./api";

export async function listarRiscos(idProjeto) {
  const params = idProjeto ? { id_projeto: idProjeto } : {};
  const { data } = await api.get("/riscos", { params });
  return data;
}

export async function obterRisco(id) {
  const { data } = await api.get(`/riscos/${id}`);
  return data;
}

export async function criarRisco(dados) {
  const { data } = await api.post("/riscos", dados);
  return data;
}

export async function atualizarRisco(id, dados) {
  const { data } = await api.put(`/riscos/${id}`, dados);
  return data;
}

export async function removerRisco(id) {
  await api.delete(`/riscos/${id}`);
}
