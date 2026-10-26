import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "@mui/material/styles";
import { ESCALAS, PALETAS } from "../theme";

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

  // Os gráficos do x-charts calculam tons a partir da cor (ex.: destaque no
  // hover) e não entendem var(--argos-*); `corReal` devolve o hexadecimal do
  // modo e da escala atuais.
  const tabela = useMemo(() => {
    const kebab = (nome) => nome.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`);
    const tema = modo === "light" ? "light" : "dark";
    const mapa = {};
    Object.entries(PALETAS[tema]).forEach(([nome, cor]) => {
      mapa[kebab(nome)] = cor;
    });
    ESCALAS[daltonico ? "daltonico" : "padrao"][tema].cores.forEach((cor, i) => {
      mapa[`exp-${i}`] = cor;
    });
    return mapa;
  }, [modo, daltonico]);
  const corReal = useCallback(
    (cor) => {
      const nome = /^var\(--argos-([a-z0-9-]+)\)$/.exec(cor ?? "")?.[1];
      return nome ? tabela[nome] ?? cor : cor;
    },
    [tabela]
  );

  const valor = {
    modo,
    escuro: modo !== "light",
    definirModo: setMode,
    alternarModo: () => setMode(modo === "light" ? "dark" : "light"),
    daltonico,
    definirDaltonico: setDaltonico,
    corReal,
  };

  return <PreferenciasContext.Provider value={valor}>{children}</PreferenciasContext.Provider>;
}

export function usePreferencias() {
  return useContext(PreferenciasContext);
}
