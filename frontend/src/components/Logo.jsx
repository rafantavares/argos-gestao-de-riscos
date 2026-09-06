// Marca provisória do Escopilot (bússola + ponto de predição). Isolada aqui
// para ser fácil de trocar quando a arte final da logo estiver pronta.
export default function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <circle cx="28" cy="28" r="21" stroke="#2DD4BF" strokeWidth="3" />
      <path d="M28 28 L39 15 L32 30 L28 28 L17 35 L28 28 Z" fill="#2DD4BF" />
      <circle cx="39" cy="15" r="4" fill="#A78BFA" />
    </svg>
  );
}

export function Logo({ size = 28, fontSize = 20, color = "#E6E9F0" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <LogoMark size={size} />
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600,
          fontSize,
          color,
        }}
      >
        Escopilot
      </span>
    </div>
  );
}
