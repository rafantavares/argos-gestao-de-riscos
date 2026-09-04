import { Box, CircularProgress } from "@mui/material";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ perfil, children }) {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
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
