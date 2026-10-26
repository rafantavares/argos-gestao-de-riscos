import { createContext, useContext, useEffect, useState } from "react";
import { auth, obterToken, removerToken, salvarToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarUsuario() {
      if (!obterToken()) {
        setCarregando(false);
        return;
      }
      try {
        const dados = await auth.me();
        setUsuario(dados);
      } catch {
        removerToken();
      } finally {
        setCarregando(false);
      }
    }
    carregarUsuario();
  }, []);

  async function entrar(email, senha) {
    const { access_token: token } = await auth.login(email, senha);
    salvarToken(token);
    const dados = await auth.me();
    setUsuario(dados);
    return dados;
  }

  // Cadastro aberto: a API cria a conta e já devolve o token.
  async function cadastrar(nome, email, senha) {
    const { access_token: token } = await auth.cadastrar(nome, email, senha);
    salvarToken(token);
    const dados = await auth.me();
    setUsuario(dados);
    return dados;
  }

  function sair() {
    removerToken();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, entrar, cadastrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth precisa ser usado dentro de um AuthProvider");
  }
  return contexto;
}
