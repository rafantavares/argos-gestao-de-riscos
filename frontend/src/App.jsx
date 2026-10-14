import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";
import Ajuda from "./pages/Ajuda";
import Login from "./pages/Login";
import Perfil from "./pages/Perfil";
import AdminDashboard from "./pages/admin/Dashboard";
import Gerentes from "./pages/admin/Gerentes";
import PlanosContingencia from "./pages/admin/PlanosContingencia";
import ProjetosAdmin from "./pages/admin/Projetos";
import RiscosAdmin from "./pages/admin/Riscos";
import GerenteDashboard from "./pages/gerente/Dashboard";
import ProjetosGerente from "./pages/gerente/Projetos";
import Assistente from "./pages/gerente/Assistente";
import Recomendacao from "./pages/gerente/Recomendacao";
import Riscos from "./pages/gerente/Riscos";

function PaginaProtegida({ perfil, children }) {
  return (
    <ProtectedRoute perfil={perfil}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

function PaginaInicial() {
  const { usuario, carregando } = useAuth();
  if (carregando) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  return <Navigate to={usuario.perfil === "admin" ? "/admin" : "/gerente"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PaginaInicial />} />

      <Route
        path="/admin"
        element={
          <PaginaProtegida perfil="admin">
            <AdminDashboard />
          </PaginaProtegida>
        }
      />
      <Route
        path="/admin/projetos"
        element={
          <PaginaProtegida perfil="admin">
            <ProjetosAdmin />
          </PaginaProtegida>
        }
      />
      <Route
        path="/admin/gerentes"
        element={
          <PaginaProtegida perfil="admin">
            <Gerentes />
          </PaginaProtegida>
        }
      />
      <Route
        path="/admin/riscos"
        element={
          <PaginaProtegida perfil="admin">
            <RiscosAdmin />
          </PaginaProtegida>
        }
      />
      <Route
        path="/admin/planos"
        element={
          <PaginaProtegida perfil="admin">
            <PlanosContingencia />
          </PaginaProtegida>
        }
      />

      <Route
        path="/gerente"
        element={
          <PaginaProtegida perfil="gerente">
            <GerenteDashboard />
          </PaginaProtegida>
        }
      />
      <Route
        path="/gerente/projetos"
        element={
          <PaginaProtegida perfil="gerente">
            <ProjetosGerente />
          </PaginaProtegida>
        }
      />
      <Route
        path="/gerente/riscos"
        element={
          <PaginaProtegida perfil="gerente">
            <Riscos />
          </PaginaProtegida>
        }
      />
      <Route
        path="/gerente/riscos/:idRisco/recomendacao"
        element={
          <PaginaProtegida perfil="gerente">
            <Recomendacao />
          </PaginaProtegida>
        }
      />

      <Route
        path="/gerente/assistente"
        element={
          <PaginaProtegida perfil="gerente">
            <Assistente />
          </PaginaProtegida>
        }
      />

      <Route
        path="/ajuda"
        element={
          <PaginaProtegida>
            <Ajuda />
          </PaginaProtegida>
        }
      />

      <Route
        path="/perfil"
        element={
          <PaginaProtegida>
            <Perfil />
          </PaginaProtegida>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
