import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import TelaCarregando from "./TelaCarregando";

export default function ProtectedRoute({ children }) {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return <TelaCarregando mensagem="Conectando ao servidor…" />;
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
