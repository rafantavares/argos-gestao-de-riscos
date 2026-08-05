import api from "./api";

export async function gerarRecomendacao(idRisco, algoritmo = "knn") {
  const { data } = await api.post(
    `/riscos/${idRisco}/recomendacoes`,
    null,
    { params: { algoritmo } }
  );
  return data;
}

export async function listarRecomendacoes(idRisco) {
  const { data } = await api.get(`/riscos/${idRisco}/recomendacoes`);
  return data;
}

export async function decidirRecomendacao(id, aceita) {
  const { data } = await api.patch(`/recomendacoes/${id}`, { aceita });
  return data;
}
