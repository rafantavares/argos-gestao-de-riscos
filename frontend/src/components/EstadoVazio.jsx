import { Box, Typography } from "@mui/material";

// Ilustração abstrata (caixa vazia com pontos de rede) para listas sem dados.
function IlustracaoVazio({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <rect x="22" y="44" width="76" height="52" rx="8" stroke="#262D3B" strokeWidth="2" />
      <path d="M22 60 H98" stroke="#262D3B" strokeWidth="2" />
      <path d="M40 44 L48 30 H72 L80 44" stroke="#262D3B" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="60" cy="78" r="6" stroke="#2DD4BF" strokeWidth="2" opacity="0.7" />
      <circle cx="36" cy="22" r="3" fill="#2DD4BF" opacity="0.6" />
      <circle cx="90" cy="18" r="2.5" fill="#A78BFA" opacity="0.6" />
      <circle cx="104" cy="36" r="2" fill="#2DD4BF" opacity="0.4" />
      <path d="M36 22 L48 30" stroke="#2DD4BF" strokeWidth="1" opacity="0.4" />
      <path d="M90 18 L80 30" stroke="#A78BFA" strokeWidth="1" opacity="0.4" />
      <path d="M90 18 L104 36" stroke="#A78BFA" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

export default function EstadoVazio({ titulo, descricao, acao, compacto = false }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        py: compacto ? 3 : 6,
        px: 2,
        gap: 1,
      }}
    >
      <IlustracaoVazio size={compacto ? 80 : 120} />
      <Typography variant={compacto ? "body1" : "h6"} fontWeight={600}>
        {titulo}
      </Typography>
      {descricao && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380 }}>
          {descricao}
        </Typography>
      )}
      {acao && <Box sx={{ mt: 1 }}>{acao}</Box>}
    </Box>
  );
}
