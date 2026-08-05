import api from "./api";

export async function listarUsuarios() {
  const { data } = await api.get("/usuarios");
  return data;
}

export async function criarUsuario(dados) {
  const { data } = await api.post("/usuarios", dados);
  return data;
}
