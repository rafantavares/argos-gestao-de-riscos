import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "@mui/material/styles";
import { ESCALAS, ESTADOS_DALTONICO, PALETAS } from "../theme";

// Preferências visuais de quem está usando (ficam no navegador):
// - modo: "dark" (padrão) ou "light"; o MUI guarda em localStorage["mui-mode"]
//   e troca o atributo data-tema do <html>.
// - daltonico: troca a escala de exposição pela versão segura para daltonismo
//   (atributo data-escala do <html>; ver ESCALAS em theme.js).
// - tamanhoTexto: "padrao", "grande" (115%) ou "maior" (130%) (data-texto).
// - reduzirAnimacoes: desliga transições, animações e gráficos animados
//   (data-movimento="reduzido"), mesmo sem a opção do sistema operacional.
const CHAVE_ESCALA = "argos.escala";
const CHAVE_TEXTO = "argos.texto";
const CHAVE_MOVIMENTO = "argos.movimento";
const TAMANHOS_TEXTO = ["padrao", "grande", "maior"];
const PreferenciasContext = createContext(null);

function ler(chave) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    // navegação privada: a preferência vale só nesta visita
  }
}

// Atributo no <html>: presente com o valor, ou removido quando é o padrão.
function marcarRaiz(atributo, valor) {
  if (valor) document.documentElement.setAttribute(atributo, valor);
  else document.documentElement.removeAttribute(atributo);
}

export function PreferenciasProvider({ children }) {
  const { mode, systemMode, setMode } = useColorScheme();
  const [daltonico, setDaltonico] = useState(() => ler(CHAVE_ESCALA) === "daltonico");
  const [tamanhoTexto, setTamanhoTexto] = useState(() => (TAMANHOS_TEXTO.includes(ler(CHAVE_TEXTO)) ? ler(CHAVE_TEXTO) : "padrao"));
  const [reduzirAnimacoes, setReduzirAnimacoes] = useState(() => ler(CHAVE_MOVIMENTO) === "reduzido");

  useEffect(() => {
    marcarRaiz("data-escala", daltonico && "daltonico");
    gravar(CHAVE_ESCALA, daltonico ? "daltonico" : "padrao");
  }, [daltonico]);

  useEffect(() => {
    marcarRaiz("data-texto", tamanhoTexto !== "padrao" && tamanhoTexto);
    gravar(CHAVE_TEXTO, tamanhoTexto);
  }, [tamanhoTexto]);

  useEffect(() => {
    marcarRaiz("data-movimento", reduzirAnimacoes && "reduzido");
    gravar(CHAVE_MOVIMENTO, reduzirAnimacoes ? "reduzido" : "normal");
  }, [reduzirAnimacoes]);

  // "system" só aparece se alguém mexer no armazenamento; resolve para o real.
  const modo = (mode === "system" ? systemMode : mode) ?? "dark";

  // Os gráficos do x-charts calculam tons a partir da cor (ex.: destaque no
  // hover) e não entendem var(--argos-*); `corReal` devolve o hexadecimal do
  // modo e da escala atuais.
  const tabela = useMemo(() => {
    const kebab = (nome) => nome.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`);
    const tema = modo === "light" ? "light" : "dark";
    const mapa = {};
    Object.entries({ ...PALETAS[tema], ...(daltonico ? ESTADOS_DALTONICO[tema] : {}) }).forEach(([nome, cor]) => {
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
    tamanhoTexto,
    definirTamanhoTexto: setTamanhoTexto,
    reduzirAnimacoes,
    definirReduzirAnimacoes: setReduzirAnimacoes,
    corReal,
  };

  return <PreferenciasContext.Provider value={valor}>{children}</PreferenciasContext.Provider>;
}

export function usePreferencias() {
  return useContext(PreferenciasContext);
}
