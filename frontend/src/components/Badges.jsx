import { Chip } from "@mui/material";
import {
  CATEGORIAS,
  CORES_CATEGORIA,
  CORES_SEVERIDADE,
  CORES_STATUS,
  ROTULOS_SEVERIDADE,
  STATUS_RISCO,
  URGENCIAS,
  nivelSeveridade,
  rotulo,
} from "../constants";

// Chips padronizados: a mesma cor para o mesmo conceito em todas as telas.

export function ChipStatus({ status, size = "small" }) {
  const cor = CORES_STATUS[status] ?? "#8A93A6";
  return (
    <Chip
      size={size}
      variant="outlined"
      label={rotulo(STATUS_RISCO, status)}
      sx={{ color: cor, borderColor: cor, fontWeight: 600 }}
    />
  );
}

// Concordância com "severidade" (substantivo feminino).
const SEVERIDADE_FEMININO = { baixo: "baixa", medio: "média", alto: "alta" };

export function ChipSeveridade({ probabilidade, impacto, size = "small" }) {
  const nivel = nivelSeveridade(probabilidade, impacto);
  return (
    <Chip
      size={size}
      label={`Severidade ${SEVERIDADE_FEMININO[nivel] ?? ROTULOS_SEVERIDADE[nivel]}`}
      sx={{ bgcolor: CORES_SEVERIDADE[nivel], color: "#0B0E14", fontWeight: 700 }}
    />
  );
}

export function ChipCategoria({ categoria, size = "small" }) {
  const cor = CORES_CATEGORIA[categoria] ?? "#8A93A6";
  return (
    <Chip
      size={size}
      label={rotulo(CATEGORIAS, categoria)}
      sx={{ bgcolor: `${cor}26`, color: cor, fontWeight: 600, border: `1px solid ${cor}55` }}
    />
  );
}

const CORES_URGENCIA = { baixa: "#4ADE80", media: "#FBBF24", alta: "#F87171" };

export function ChipUrgencia({ urgencia, size = "small" }) {
  const cor = CORES_URGENCIA[urgencia] ?? "#8A93A6";
  return (
    <Chip
      size={size}
      label={`Urgência ${rotulo(URGENCIAS, urgencia).toLowerCase()}`}
      sx={{ bgcolor: `${cor}26`, color: cor, fontWeight: 600, border: `1px solid ${cor}55` }}
    />
  );
}

export function ChipAceite({ aceita, size = "small" }) {
  if (aceita === true) {
    return <Chip size={size} label="Aceita" sx={{ bgcolor: "#4ADE8026", color: "#4ADE80", fontWeight: 600 }} />;
  }
  if (aceita === false) {
    return <Chip size={size} label="Rejeitada" sx={{ bgcolor: "#F8717126", color: "#F87171", fontWeight: 600 }} />;
  }
  return <Chip size={size} label="Pendente" sx={{ bgcolor: "#FBBF2426", color: "#FBBF24", fontWeight: 600 }} />;
}
