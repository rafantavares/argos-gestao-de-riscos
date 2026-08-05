import { createContext, useContext, useEffect, useState } from "react";
import { login as loginRequest, obterUsuarioAtual } from "../services/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setCarregando(false);
      return;
    }

    obterUsuarioAtual()
      .then((dados) => {
        setUsuario(dados);
        localStorage.setItem("usuario", JSON.stringify(dados));
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
      })
      .finally(() => setCarregando(false));
  }, []);

  async function login(email, senha) {
    const { access_token: token } = await loginRequest(email, senha);
    localStorage.setItem("token", token);
    const dadosUsuario = await obterUsuarioAtual();
    localStorage.setItem("usuario", JSON.stringify(dadosUsuario));
    setUsuario(dadosUsuario);
    return dadosUsuario;
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return contexto;
}
