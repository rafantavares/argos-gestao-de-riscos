import api from "./api";

export async function login(email, senha) {
  const dados = new URLSearchParams();
  dados.append("username", email);
  dados.append("password", senha);

  const { data } = await api.post("/auth/login", dados);
  return data;
}

export async function obterUsuarioAtual() {
  const { data } = await api.get("/auth/me");
  return data;
}
