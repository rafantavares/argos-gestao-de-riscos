import { Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Projetos from "./pages/Projetos";
import Riscos from "./pages/Riscos";
import RiscoDetalhe from "./pages/RiscoDetalhe";
import Recomendacoes from "./pages/Recomendacoes";

function Protegida({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protegida><Dashboard /></Protegida>} />
      <Route path="/projetos" element={<Protegida><Projetos /></Protegida>} />
      <Route path="/riscos" element={<Protegida><Riscos /></Protegida>} />
      <Route path="/riscos/:riscoId" element={<Protegida><RiscoDetalhe /></Protegida>} />
      <Route
        path="/riscos/:riscoId/recomendacoes"
        element={<Protegida><Recomendacoes /></Protegida>}
      />
    </Routes>
  );
}
