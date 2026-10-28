import { useCallback, useMemo, useRef, useState } from "react";
import { Box, GlobalStyles } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import UpdateIcon from "@mui/icons-material/Update";
import { ESCALAS } from "../theme";
import { usePreferencias } from "../contexts/PreferenciasContext";
import LogoMark from "./Logo";

// Painel da tela de login: o "radar de riscos" do Argos no canto (um feixe de
// varredura gira e cada risco acende quando o feixe passa por ele) e cartões
// flutuantes com pedaços do produto (matriz, aviso de reavaliação, evolução da
// exposição e plano recomendado pela IA). As camadas se deslocam com o mouse
// (parallax). O painel é sempre escuro, nos dois modos. Conteúdo ilustrativo.
// Com "reduzir movimento" no sistema, tudo fica parado.

const VOLTA = 8; // segundos por volta do feixe do radar
const FONTE_TITULO = '"Space Grotesk", sans-serif';
const COR = { texto: "#E8ECF3", texto2: "#97A2B6", texto3: "#6B7588", marca: "#2DD4BF", ia: "#A78BFA", fundo: "#080B11" };
const vidro = {
  boxSizing: "border-box",
  borderRadius: "14px",
  background: "rgba(17,22,31,0.82)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
  backdropFilter: "blur(8px)",
};

const ANIMACOES = {
  "@keyframes radarGirar": { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } },
  "@keyframes radarAcender": {
    "0%": { opacity: 1, transform: "scale(1.9)" },
    "12%": { opacity: 1, transform: "scale(1.25)" },
    "45%, 100%": { opacity: 0.38, transform: "scale(1)" },
  },
  "@keyframes radarOnda": { "0%": { opacity: 0.55, transform: "scale(1)" }, "100%": { opacity: 0, transform: "scale(2.6)" } },
  "@keyframes radarRespirar": { "0%, 100%": { opacity: 0.55 }, "50%": { opacity: 0.9 } },
  "@keyframes flutuarA": { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
  "@keyframes flutuarB": { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(7px)" } },
  "@keyframes flutuarC": { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-5px)" } },
  "@keyframes surgirCartao": { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "none" } },
  "@keyframes desenharLinha": { from: { strokeDashoffset: 600 }, to: { strokeDashoffset: 0 } },
  "@media (prefers-reduced-motion: reduce)": {
    ".painel-login *": { animation: "none !important", transition: "none !important" },
  },
  "[data-movimento='reduzido'] .painel-login *": { animation: "none !important", transition: "none !important" },
};

// Contagem de riscos por célula ("probabilidade-impacto") do cartão da matriz.
const CONTAGEM = { "5-3": 1, "4-2": 2, "4-4": 1, "4-5": 1, "3-3": 3, "3-4": 1, "2-2": 2, "2-4": 1, "1-1": 1 };
const faixa = (s) => (s <= 3 ? 0 : s <= 10 ? 1 : s <= 15 ? 2 : s <= 20 ? 3 : 4);

function gerarPontos(cores) {
  // Gerador fixo: os pontos ficam sempre no mesmo lugar. A maioria é leve.
  let semente = 11;
  const aleatorio = () => {
    semente = (semente * 9301 + 49297) % 233280;
    return semente / 233280;
  };
  const pontos = [];
  [5, 7, 6, 3, 2].forEach((quantidade, f) => {
    for (let i = 0; i < quantidade; i += 1) {
      const angulo = aleatorio() * 360; // graus, sentido horário a partir do topo
      const raio = 80 + aleatorio() * 240;
      const rad = ((angulo - 90) * Math.PI) / 180;
      pontos.push({
        x: Math.cos(rad) * raio,
        y: Math.sin(rad) * raio,
        r: f >= 3 ? 5.5 : 4.5,
        cor: cores[f],
        // Acende quando o feixe (que parte do topo) passa pelo ângulo do ponto.
        atraso: `${((angulo / 360) * VOLTA - VOLTA).toFixed(2)}s`,
      });
    }
  });
  return pontos;
}

function Camada({ deslocamento, flutuar, sx, children }) {
  return (
    <Box sx={{ position: "absolute", transform: deslocamento, transition: "transform 400ms ease-out", ...sx }}>
      <Box sx={{ animation: flutuar ? `${flutuar} ease-in-out infinite` : "none" }}>{children}</Box>
    </Box>
  );
}

function Radar() {
  const { daltonico } = usePreferencias();
  const escala = ESCALAS[daltonico ? "daltonico" : "padrao"].dark;
  const pontos = useMemo(() => gerarPontos(escala.cores), [escala]);
  return (
    <Box sx={{ position: "relative", width: 680, height: 680 }}>
      <svg width="680" height="680" viewBox="-340 -340 680 680" style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id="radarAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={COR.marca} stopOpacity="0.2" />
            <stop offset="60%" stopColor={COR.ia} stopOpacity="0.06" />
            <stop offset="100%" stopColor={COR.fundo} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle r="260" fill="url(#radarAura)" style={{ animation: "radarRespirar 6s ease-in-out infinite" }} />
        {[90, 160, 230, 300].map((r, i) => (
          <circle key={r} r={r} fill="none" stroke={COR.marca} strokeOpacity={[0.18, 0.13, 0.09, 0.06][i]} />
        ))}
        <line x1="-330" y1="0" x2="330" y2="0" stroke={COR.marca} strokeOpacity="0.07" />
        <line x1="0" y1="-330" x2="0" y2="330" stroke={COR.marca} strokeOpacity="0.07" />
        {pontos.map((p, i) => (
          <g key={i} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
            {["radarOnda", "radarAcender"].map((animacao) => (
              <circle
                key={animacao}
                r={p.r}
                fill={animacao === "radarOnda" ? "none" : p.cor}
                stroke={animacao === "radarOnda" ? p.cor : "none"}
                strokeWidth="1.5"
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  animation: `${animacao} ${VOLTA}s ease-out ${p.atraso} infinite`,
                }}
              />
            ))}
          </g>
        ))}
        <circle r="12" fill="none" stroke={COR.marca} strokeOpacity="0.35" />
        <circle r="5" fill={COR.marca} />
      </svg>
      <Box
        sx={{
          position: "absolute",
          inset: "10px",
          borderRadius: "50%",
          background:
            "conic-gradient(from 0deg, rgba(45,212,191,0) 0deg, rgba(45,212,191,0) 290deg, rgba(45,212,191,0.22) 352deg, rgba(94,234,212,0.55) 359.5deg, rgba(45,212,191,0) 360deg)",
          animation: `radarGirar ${VOLTA}s linear infinite`,
        }}
      />
    </Box>
  );
}

function CartaoMatriz() {
  const { daltonico } = usePreferencias();
  const { cores, texto } = ESCALAS[daltonico ? "daltonico" : "padrao"].dark;
  return (
    <Box sx={{ ...vidro, width: 290, p: 2, animation: "surgirCartao .8s ease-out .2s both" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 1.5 }}>
        <Box component="span" sx={{ fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: "0.875rem", color: COR.texto }}>
          Matriz do projeto
        </Box>
        <Box component="span" sx={{ fontSize: "0.6875rem", color: COR.texto2 }}>
          13 riscos ativos
        </Box>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "4px" }}>
        {[5, 4, 3, 2, 1].flatMap((p) =>
          [1, 2, 3, 4, 5].map((i) => {
            const n = CONTAGEM[`${p}-${i}`] ?? 0;
            const f = faixa(p * i);
            return (
              <Box
                key={`${p}-${i}`}
                sx={{
                  height: 30,
                  borderRadius: "5px",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: FONTE_TITULO,
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  color: texto[f],
                  bgcolor: n ? cores[f] : `color-mix(in srgb, ${cores[f]} 20%, transparent)`,
                  boxShadow: p === 4 && i === 5 ? "0 0 0 2px #11161F, 0 0 0 3.5px #E8ECF3" : "none",
                }}
              >
                {n || ""}
              </Box>
            );
          })
        )}
      </Box>
      <Box sx={{ mt: 1, fontSize: "0.6875rem", color: COR.texto2 }}>probabilidade × impacto</Box>
    </Box>
  );
}

function AvisoReavaliacao() {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 1.75,
        py: 1.1,
        borderRadius: 999,
        background: "rgba(17,22,31,0.85)",
        border: "1px solid rgba(240,206,101,0.35)",
        boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
        fontSize: "0.8125rem",
        color: COR.texto,
        whiteSpace: "nowrap",
        animation: "surgirCartao .8s ease-out .5s both",
      }}
    >
      <UpdateIcon sx={{ fontSize: "1.0625rem", color: "#F0CE65" }} />
      <span>
        <strong style={{ fontWeight: 600 }}>R07</strong> · reavaliação pendente há 34 dias
      </span>
    </Box>
  );
}

function CartaoEvolucao() {
  const { daltonico } = usePreferencias();
  const corLeve = ESCALAS[daltonico ? "daltonico" : "padrao"].dark.cores[1];
  const curva = "M0 18 C 30 14, 50 10, 76 14 S 120 28, 152 30 S 200 44, 228 46 S 276 52, 304 54";
  return (
    <Box sx={{ ...vidro, width: 340, px: 2.25, py: 2, animation: "surgirCartao .8s ease-out .35s both" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Box sx={{ fontSize: "0.75rem", color: COR.texto2 }}>Exposição média do projeto</Box>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.25, mt: 0.5 }}>
            <Box component="span" sx={{ fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: "1.75rem", color: COR.texto }}>
              9,2
            </Box>
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, fontSize: "0.75rem", color: COR.texto }}>
              <Box component="span" sx={{ width: 9, height: 9, borderRadius: "2px", bgcolor: corLeve }} />
              Leve
            </Box>
          </Box>
        </Box>
        <Box component="span" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#6CCB8B", px: 1, py: 0.4, borderRadius: "6px", bgcolor: "rgba(108,203,139,0.12)" }}>
          −38% após mitigação
        </Box>
      </Box>
      <svg width="304" height="70" viewBox="0 0 304 70" style={{ display: "block", marginTop: 10 }}>
        <defs>
          <linearGradient id="painelArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COR.marca} stopOpacity="0.28" />
            <stop offset="100%" stopColor={COR.marca} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${curva} L304 70 L0 70 Z`} fill="url(#painelArea)" />
        <path
          d={curva}
          fill="none"
          stroke={COR.marca}
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ strokeDasharray: 600, animation: "desenharLinha 2.2s ease-out .6s both" }}
        />
        <circle cx="304" cy="54" r="4" fill={COR.marca} />
      </svg>
      <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", color: COR.texto3, mt: 0.5 }}>
        <span>set.</span>
        <span>out.</span>
        <span>hoje</span>
      </Box>
    </Box>
  );
}

function CartaoIA() {
  return (
    <Box
      sx={{
        ...vidro,
        width: 320,
        p: 2,
        background: "rgba(23,29,40,0.9)",
        border: "1px solid rgba(167,139,250,0.4)",
        animation: "surgirCartao .8s ease-out .65s both",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <AutoAwesomeIcon sx={{ fontSize: "1rem", color: COR.ia }} />
        <Box component="span" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#C4B5FD" }}>
          Plano recomendado pela IA
        </Box>
      </Box>
      <Box sx={{ fontSize: "0.875rem", fontWeight: 600, color: COR.texto, lineHeight: 1.4 }}>
        Ativar fornecedor alternativo e acionar as cláusulas de contingência.
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mt: 1.5 }}>
        <Box sx={{ flex: 1, height: 5, borderRadius: 3, bgcolor: "rgba(255,255,255,0.08)" }}>
          <Box sx={{ width: "82%", height: "100%", borderRadius: 3, bgcolor: COR.ia }} />
        </Box>
        <Box component="span" sx={{ fontSize: "0.6875rem", color: COR.texto2 }}>
          82% de confiança
        </Box>
      </Box>
    </Box>
  );
}

export default function PainelLogin() {
  const { reduzirAnimacoes } = usePreferencias();
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const quadro = useRef(0);

  // Posição do mouse (−0,5 a 0,5), no máximo uma atualização por quadro.
  const aoMover = useCallback((e) => {
    const alvo = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - alvo.left) / alvo.width - 0.5;
    const y = (e.clientY - alvo.top) / alvo.height - 0.5;
    cancelAnimationFrame(quadro.current);
    quadro.current = requestAnimationFrame(() => setMouse({ x, y }));
  }, []);

  // Camadas da frente andam mais que as de trás; o radar vai para o lado oposto.
  const deslocar = (k) => `translate(${(mouse.x * k).toFixed(1)}px, ${(mouse.y * k).toFixed(1)}px)`;

  return (
    <Box
      className="painel-login"
      aria-hidden="true"
      onMouseMove={reduzirAnimacoes ? undefined : aoMover}
      onMouseLeave={() => setMouse({ x: 0, y: 0 })}
      sx={{
        position: "relative",
        overflow: "hidden",
        height: "100%",
        background: "radial-gradient(ellipse 90% 80% at 85% 10%, #0F1A26 0%, #080B11 55%, #05070B 100%)",
        fontFamily: '"IBM Plex Sans", sans-serif',
      }}
    >
      <GlobalStyles styles={ANIMACOES} />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(151,162,182,0.07) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />

      <Camada deslocamento={deslocar(-10)} sx={{ right: -290, top: -230 }}>
        <Radar />
      </Camada>

      {/* Cartões em posições relativas ao painel, para acompanhar telas maiores e menores */}
      <Camada deslocamento={deslocar(14)} flutuar="flutuarA 9s" sx={{ left: "7%", top: "17%" }}>
        <CartaoMatriz />
      </Camada>
      <Camada deslocamento={deslocar(22)} flutuar="flutuarC 7s" sx={{ left: "42%", top: "22%" }}>
        <AvisoReavaliacao />
      </Camada>
      <Camada deslocamento={deslocar(26)} flutuar="flutuarB 11s" sx={{ left: "50%", top: "47%" }}>
        <CartaoEvolucao />
      </Camada>
      <Camada deslocamento={deslocar(34)} flutuar="flutuarC 7s" sx={{ left: "12%", top: "53%" }}>
        <CartaoIA />
      </Camada>

      <Box sx={{ position: "absolute", left: "7%", bottom: 48, display: "flex", alignItems: "center", gap: 2.25 }}>
        <Box sx={{ filter: "drop-shadow(0 0 18px rgba(45,212,191,0.3))", display: "flex", "--argos-marca": COR.marca, "--argos-ia": COR.ia, "--argos-menu": COR.fundo }}>
          <LogoMark size={64} />
        </Box>
        <Box>
          <Box sx={{ fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: "2.625rem", lineHeight: 1, letterSpacing: "0.16em", color: COR.texto }}>ARGOS</Box>
          <Box sx={{ fontSize: "0.9375rem", color: COR.texto2, mt: 0.75 }}>Monitoramento contínuo de riscos, com análise preditiva</Box>
        </Box>
      </Box>
    </Box>
  );
}
