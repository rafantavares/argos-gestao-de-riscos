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
const GerenteDashboard = lazy(() => import("./pages/gerente/Dashboard"));
const ProjetosGerente = lazy(() => import("./pages/gerente/Projetos"));
const Assistente = lazy(() => import("./pages/gerente/Assistente"));
const Relatorio = lazy(() => import("./pages/gerente/Relatorio"));
const FichaRiscoPdf = lazy(() => import("./pages/gerente/FichaRiscoPdf"));
const Recomendacao = lazy(() => import("./pages/gerente/Recomendacao"));
const Riscos = lazy(() => import("./pages/gerente/Riscos"));

function PaginaProtegida({ children }) {
  return (
    <ProtectedRoute>
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
  return <Navigate to="/gerente" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<TelaCarregando />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PaginaInicial />} />

        <Route
          path="/gerente"
          element={
            <PaginaProtegida>
              <GerenteDashboard />
            </PaginaProtegida>
          }
        />
        <Route
          path="/gerente/projetos"
          element={
            <PaginaProtegida>
              <ProjetosGerente />
            </PaginaProtegida>
          }
        />
        <Route
          path="/gerente/riscos"
          element={
            <PaginaProtegida>
              <Riscos />
            </PaginaProtegida>
          }
        />
        <Route
          path="/gerente/riscos/:idRisco/recomendacao"
          element={
            <PaginaProtegida>
              <Recomendacao />
            </PaginaProtegida>
          }
        />

        <Route
          path="/gerente/assistente"
          element={
            <PaginaProtegida>
              <Assistente />
            </PaginaProtegida>
          }
        />

        {/* A página do modelo virou a aba "Desempenho da IA" de Configurações. */}
        <Route path="/gerente/modelo" element={<Navigate to="/configuracoes?aba=modelo" replace />} />

        <Route
          path="/gerente/riscos/:idRisco/ficha"
          element={
            <ProtectedRoute>
              <FichaRiscoPdf />
            </ProtectedRoute>
          }
        />

        <Route
          path="/gerente/relatorio"
          element={
            <ProtectedRoute>
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

        <Route path="/admin/*" element={<Navigate to="/gerente" replace />} />
        <Route path="/gerente/planos" element={<Navigate to="/configuracoes?aba=sobre" replace />} />
        <Route path="/ajuda" element={<Navigate to="/configuracoes?aba=sobre" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
