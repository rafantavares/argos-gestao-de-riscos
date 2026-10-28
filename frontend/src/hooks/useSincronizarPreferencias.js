import { useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { usePreferencias } from "../contexts/PreferenciasContext";
import { auth as servicoAuth } from "../services/api";

const ESPERA_MS = 800;

// Preferências visuais salvas na conta, para valer em qualquer computador:
// ao entrar, aplica as que vieram da API; depois, cada mudança é gravada (com
// uma pequena espera, para não chamar a API a cada clique). Sem nada salvo na
// conta ainda, as do navegador sobem como ponto de partida.
export default function useSincronizarPreferencias() {
  const { usuario, atualizarUsuario } = useAuth();
  const prefs = usePreferencias();
  const aplicadas = useRef(false);
  const ultimaGravada = useRef(null);

  const atuais = {
    tema: prefs.modo === "light" ? "light" : "dark",
    escala: prefs.daltonico ? "daltonico" : "padrao",
    tamanho_texto: prefs.tamanhoTexto,
    reduzir_animacoes: prefs.reduzirAnimacoes,
  };
  const chave = JSON.stringify(atuais);

  // 1) Ao entrar: aplica as preferências da conta.
  useEffect(() => {
    if (!usuario || aplicadas.current) return;
    aplicadas.current = true;
    const salvas = usuario.preferencias ?? {};
    if (salvas.tema) prefs.definirModo(salvas.tema);
    if (salvas.escala) prefs.definirDaltonico(salvas.escala === "daltonico");
    if (salvas.tamanho_texto) prefs.definirTamanhoTexto(salvas.tamanho_texto);
    if (typeof salvas.reduzir_animacoes === "boolean") prefs.definirReduzirAnimacoes(salvas.reduzir_animacoes);
    const temSalvas = ["tema", "escala", "tamanho_texto", "reduzir_animacoes"].some((k) => k in salvas);
    // Com preferências na conta, a próxima mudança local é a aplicação acima: não regrava.
    ultimaGravada.current = temSalvas
      ? JSON.stringify({ tema: salvas.tema, escala: salvas.escala, tamanho_texto: salvas.tamanho_texto, reduzir_animacoes: salvas.reduzir_animacoes })
      : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  // 2) Cada mudança depois disso é gravada na conta.
  useEffect(() => {
    if (!usuario || !aplicadas.current || chave === ultimaGravada.current) return undefined;
    const temporizador = setTimeout(() => {
      ultimaGravada.current = chave;
      servicoAuth
        .salvarPreferencias(atuais)
        .then(atualizarUsuario)
        .catch(() => {});
    }, ESPERA_MS);
    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, usuario?.id]);
}
