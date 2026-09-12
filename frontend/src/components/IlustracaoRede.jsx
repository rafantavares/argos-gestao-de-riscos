// Ilustração abstrata de rede de nós (grafo) usada no hero da tela de login:
// alusão à análise de risco como rede de fatores interligados. Puro SVG, sem
// dependência externa; a animação vem das classes de index.css.

const NOS = [
  { x: 110, y: 90, r: 7, cor: "#2DD4BF" },
  { x: 250, y: 60, r: 5, cor: "#A78BFA" },
  { x: 380, y: 120, r: 9, cor: "#2DD4BF" },
  { x: 180, y: 200, r: 11, cor: "#2DD4BF" },
  { x: 320, y: 240, r: 6, cor: "#A78BFA" },
  { x: 470, y: 210, r: 5, cor: "#2DD4BF" },
  { x: 90, y: 320, r: 5, cor: "#A78BFA" },
  { x: 240, y: 350, r: 8, cor: "#2DD4BF" },
  { x: 410, y: 360, r: 12, cor: "#A78BFA" },
  { x: 520, y: 320, r: 4, cor: "#2DD4BF" },
  { x: 150, y: 450, r: 6, cor: "#2DD4BF" },
  { x: 330, y: 470, r: 5, cor: "#2DD4BF" },
  { x: 480, y: 460, r: 7, cor: "#A78BFA" },
];

const ARESTAS = [
  [0, 1], [1, 2], [0, 3], [1, 3], [2, 4], [3, 4], [2, 5], [4, 5],
  [3, 6], [3, 7], [4, 7], [4, 8], [5, 8], [5, 9], [8, 9],
  [6, 10], [7, 10], [7, 11], [8, 11], [8, 12], [9, 12], [10, 11], [11, 12],
];

export default function IlustracaoRede({ largura = "100%" }) {
  return (
    <svg
      viewBox="0 0 600 540"
      width={largura}
      fill="none"
      aria-hidden="true"
      style={{ maxWidth: 560, display: "block" }}
    >
      <defs>
        <radialGradient id="brilho" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="aresta" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      <circle cx="300" cy="270" r="230" fill="url(#brilho)" />

      <g className="flutuar">
        {ARESTAS.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={NOS[a].x}
            y1={NOS[a].y}
            x2={NOS[b].x}
            y2={NOS[b].y}
            stroke="url(#aresta)"
            strokeWidth="1.4"
          />
        ))}

        {NOS.map((no, i) => (
          <g key={i}>
            <circle cx={no.x} cy={no.y} r={no.r * 2.4} fill={no.cor} opacity="0.08" />
            <circle
              cx={no.x}
              cy={no.y}
              r={no.r}
              fill={no.cor}
              className={i % 3 === 0 ? "pulsar" : undefined}
              style={{ animationDelay: `${(i % 5) * 0.4}s` }}
            />
          </g>
        ))}

        {/* Nó "crítico" destacado: anel de alerta em volta do maior nó */}
        <circle cx="410" cy="360" r="22" stroke="#F87171" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />
        <circle cx="180" cy="200" r="20" stroke="#2DD4BF" strokeWidth="1.2" strokeDasharray="3 5" opacity="0.6" />
      </g>
    </svg>
  );
}
