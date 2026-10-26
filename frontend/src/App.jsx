import { Suspense, lazy } from "react";
import { LinearProgress } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import TelaCarregando from "./components/TelaCarregando";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";

// Páginas baixadas sob demanda: o primeiro acesso só carrega o login.
const Perfil = lazy(() => import("./pages/Perfil"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const Gerentes = lazy(() => import("./pages/admin/Gerentes"));
const PlanosContingencia = lazy(() => import("./pages/admin/PlanosContingencia"));
const ProjetosAdmin = lazy(() => import("./pages/admin/Projetos"));
const RiscosAdmin = lazy(() => import("./pages/admin/Riscos"));
const GerenteDashboard = lazy(() => import("./pages/gerente/Dashboard"));
const ProjetosGerente = lazy(() => import("./pages/gerente/Projetos"));
const Assistente = lazy(() => import("./pages/gerente/Assistente"));
const Relatorio = lazy(() => import("./pages/gerente/Relatorio"));
const FichaRiscoPdf = lazy(() => import("./pages/gerente/FichaRiscoPdf"));
const Recomendacao = lazy(() => import("./pages/gerente/Recomendacao"));
const Riscos = lazy(() => import("./pages/gerente/Riscos"));

function PaginaProtegida({ perfil, children }) {
  return (
    <ProtectedRoute perfil={perfil}>
      <AppLayout>
        {/* Troca de página sem esconder o menu enquanto a página baixa. */}
        <Suspense fallback={<LinearProgress sx={{ mt: 2 }} />}>{children}</Suspense>
      </AppLayout>
    </ProtectedRoute>
  );
}

function PaginaInicial() {
  const { usuario, carregando } = useAuth();
  if (carregando) return <TelaCarregando mensagem="Conectando ao servidor…" />;
  if (!usuario) return <Navigate to="/login" replace />;
  return <Navigate to={usuario.perfil === "admin" ? "/admin" : "/gerente"} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<TelaCarregando />}>
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
          path="/gerente/riscos/:idRisco/ficha"
          element={
            <ProtectedRoute perfil="gerente">
              <FichaRiscoPdf />
            </ProtectedRoute>
          }
        />

        <Route
          path="/gerente/relatorio"
          element={
            <ProtectedRoute perfil="gerente">
              <Relatorio />
            </ProtectedRoute>
          }
        />

        <Route path="/sobre" element={<Navigate to="/configuracoes?aba=sobre" replace />} />

        <Route
          path="/perfil"
          element={
            <PaginaProtegida>
              <Perfil />
            </PaginaProtegida>
          }
        />

        <Route
          path="/configuracoes"
          element={
            <PaginaProtegida>
              <Configuracoes />
            </PaginaProtegida>
          }
        />

        <Route path="/ajuda" element={<Navigate to="/configuracoes?aba=sobre" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
