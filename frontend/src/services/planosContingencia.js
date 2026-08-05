import api from "./api";

export async function listarPlanos(idRisco) {
  const params = idRisco ? { id_risco: idRisco } : {};
  const { data } = await api.get("/planos-contingencia", { params });
  return data;
}

export async function criarPlano(dados) {
  const { data } = await api.post("/planos-contingencia", dados);
  return data;
}

export async function atualizarPlano(id, dados) {
  const { data } = await api.put(`/planos-contingencia/${id}`, dados);
  return data;
}

export async function removerPlano(id) {
  await api.delete(`/planos-contingencia/${id}`);
}
