import { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "@mui/material/styles";

// Preferências visuais de quem está usando (ficam no navegador):
// - modo: "dark" (padrão) ou "light"; o MUI guarda em localStorage["mui-mode"]
//   e troca o atributo data-tema do <html>.
// - daltonico: troca a escala de exposição pela versão segura para daltonismo
//   (atributo data-escala do <html>; ver ESCALAS em theme.js).
const CHAVE_ESCALA = "argos.escala";
const PreferenciasContext = createContext(null);

function lerDaltonico() {
  try {
    return localStorage.getItem(CHAVE_ESCALA) === "daltonico";
  } catch {
    return false;
  }
}

export function PreferenciasProvider({ children }) {
  const { mode, systemMode, setMode } = useColorScheme();
  const [daltonico, setDaltonico] = useState(lerDaltonico);

  useEffect(() => {
    const raiz = document.documentElement;
    if (daltonico) raiz.setAttribute("data-escala", "daltonico");
    else raiz.removeAttribute("data-escala");
    try {
      localStorage.setItem(CHAVE_ESCALA, daltonico ? "daltonico" : "padrao");
    } catch {
      // navegação privada: a preferência vale só nesta visita
    }
  }, [daltonico]);

  // "system" só aparece se alguém mexer no armazenamento; resolve para o real.
  const modo = (mode === "system" ? systemMode : mode) ?? "dark";

  const valor = {
    modo,
    escuro: modo !== "light",
    definirModo: setMode,
    alternarModo: () => setMode(modo === "light" ? "dark" : "light"),
    daltonico,
    definirDaltonico: setDaltonico,
  };

  return <PreferenciasContext.Provider value={valor}>{children}</PreferenciasContext.Provider>;
}

export function usePreferencias() {
  return useContext(PreferenciasContext);
}
