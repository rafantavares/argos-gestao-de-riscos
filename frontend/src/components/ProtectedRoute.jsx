import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import TelaCarregando from "./TelaCarregando";

export default function ProtectedRoute({ perfil, children }) {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return <TelaCarregando mensagem="Conectando ao servidor…" />;
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (perfil && usuario.perfil !== perfil) {
    const destino = usuario.perfil === "admin" ? "/admin" : "/gerente";
    return <Navigate to={destino} replace />;
  }

  return children;
}
