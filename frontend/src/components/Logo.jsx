// Marca do Argos: a letra A protegendo um olho vigilante (Argos Panoptes, o
// gigante de cem olhos que nunca dormia) e a estrela violeta que, no sistema,
// sinaliza inteligência artificial. Vetorizada a partir da arte final; as
// mesmas formas estão em public/favicon.svg e docs/argos-logo.svg.
// Cores do tema (mudam com o modo claro/escuro); a pupila usa a cor do fundo.
export const CORES_MARCA = { ciano: "var(--argos-marca)", violeta: "var(--argos-ia)", fundo: "var(--argos-menu)" };

export function FormasMarca({ estrela = true }) {
  const { ciano, violeta, fundo } = CORES_MARCA;
  return (
    <>
      {/* Parte superior do A, recortada em volta do olho */}
      <path
        d="M610 372 Q626.5 352 643 372 L772 589 Q738 574 707 563 L674 527 L626.5 452 L579 527 L546 563 Q515 574 481 589 Z"
        fill={ciano}
      />
      {/* Pernas do A */}
      <path d="M470 612 Q497 602 527 600 L527 618 Q526 628 519 640 L476 709 L411 709 Z" fill={ciano} />
      <path d="M783 612 Q756 602 726 600 L726 618 Q727 628 734 640 L777 709 L842 709 Z" fill={ciano} />
      {/* Olho */}
      <path
        d="M546 607 Q626.5 513 707 607 Q626.5 701 546 607 Z"
        fill="none"
        stroke={ciano}
        strokeWidth="16"
        strokeLinejoin="miter"
      />
      <circle cx="626.5" cy="607.5" r="33" fill={violeta} />
      <circle cx="626.5" cy="607.5" r="13.5" fill={fundo} />
      {estrela && (
        <path
          d="M731 338 Q736 373 771 378 Q736 383 731 418 Q726 383 691 378 Q726 373 731 338 Z"
          fill={violeta}
        />
      )}
    </>
  );
}

export default function LogoMark({ size = 28, estrela = true }) {
  return (
    <svg width={size} height={size} viewBox="405 305 440 440" aria-hidden="true">
      <FormasMarca estrela={estrela} />
    </svg>
  );
}

export function Logo({ size = 28, fontSize = 20, color = "var(--argos-texto)" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <LogoMark size={size} />
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600,
          fontSize,
          letterSpacing: "0.12em",
          color,
        }}
      >
        ARGOS
      </span>
    </div>
  );
}
