import { Box, Chip } from "@mui/material";
import CodeIcon from "@mui/icons-material/Code";
import CorporateFareIcon from "@mui/icons-material/CorporateFare";
import PublicIcon from "@mui/icons-material/Public";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CropFreeIcon from "@mui/icons-material/CropFree";
import DnsOutlinedIcon from "@mui/icons-material/DnsOutlined";
import GavelIcon from "@mui/icons-material/Gavel";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TouchAppOutlinedIcon from "@mui/icons-material/TouchAppOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import {
  AREAS_AFETADAS,
  CATEGORIAS,
  CORES_SEVERIDADE,
  CORES_STATUS,
  ROTULOS_SEVERIDADE,
  STATUS_RISCO,
  URGENCIAS,
  faixaExposicao,
  nivelSeveridade,
  pontuacaoSeveridade,
  rotulo,
} from "../constants";

// Chips padronizados: a mesma cor para o mesmo conceito em todas as telas. A
// cor fica num marcador ao lado do texto; o texto usa sempre a cor de texto,
// para a informação não depender só da cor (acessibilidade).

export function Marcador({ cor, forma = "quadrado", tamanho = 10 }) {
  return (
    <Box
      component="span"
      aria-hidden="true"
      sx={{ width: tamanho, height: tamanho, flex: "none", borderRadius: forma === "circulo" ? "50%" : "3px", bgcolor: cor, display: "inline-block" }}
    />
  );
}

const estiloMarcado = { fontWeight: 600, borderColor: "var(--argos-borda-forte)", color: "text.primary", "& .MuiChip-icon": { ml: "8px", mr: "-2px" } };

export function ChipStatus({ status, size = "small" }) {
  const cor = CORES_STATUS[status] ?? "var(--argos-texto2)";
  return (
    <Chip
      size={size}
      variant="outlined"
      icon={<Marcador cor={cor} forma="circulo" tamanho={8} />}
      label={rotulo(STATUS_RISCO, status)}
      sx={estiloMarcado}
    />
  );
}

// Concordância com "severidade" (substantivo feminino).
const SEVERIDADE_FEMININO = { baixo: "baixa", medio: "média", alto: "alta" };

export function ChipSeveridade({ probabilidade, impacto, size = "small" }) {
  // Riscos (notas 1-5): mostra a avaliação da exposição e a pontuação.
  if (typeof probabilidade === "number") {
    const pontuacao = pontuacaoSeveridade(probabilidade, impacto);
    const faixa = faixaExposicao(pontuacao);
    return (
      <Chip size={size} variant="outlined" icon={<Marcador cor={faixa.cor} />} label={`${faixa.label} · ${pontuacao}`} sx={estiloMarcado} />
    );
  }
  const nivel = nivelSeveridade(probabilidade, impacto);
  return (
    <Chip
      size={size}
      variant="outlined"
      icon={<Marcador cor={CORES_SEVERIDADE[nivel]} />}
      label={`Severidade ${SEVERIDADE_FEMININO[nivel] ?? ROTULOS_SEVERIDADE[nivel]}`}
      sx={estiloMarcado}
    />
  );
}

// Ícone de cada área afetada, usado nos chips, filtros e no panorama.
export const ICONES_AREA = {
  cronograma: ScheduleIcon,
  custo: AttachMoneyIcon,
  escopo: CropFreeIcon,
  qualidade: VerifiedOutlinedIcon,
  seguranca_informacao: LockOutlinedIcon,
  infraestrutura: DnsOutlinedIcon,
  usabilidade: TouchAppOutlinedIcon,
  equipe: GroupsOutlinedIcon,
  fornecedores: LocalShippingOutlinedIcon,
  legal_regulatorio: GavelIcon,
};

export function IconeArea({ area, ...props }) {
  const Icone = ICONES_AREA[area];
  return Icone ? <Icone {...props} /> : null;
}

export function ChipArea({ area, size = "small" }) {
  return (
    <Chip
      size={size}
      variant="outlined"
      icon={<IconeArea area={area} sx={{ fontSize: 16 }} />}
      label={rotulo(AREAS_AFETADAS, area)}
      sx={{ fontWeight: 600, borderColor: "var(--argos-borda-forte)", "& .MuiChip-icon": { color: "text.secondary" } }}
    />
  );
}

const ICONES_CATEGORIA = {
  tecnico: CodeIcon,
  organizacional: CorporateFareIcon,
  externo: PublicIcon,
  pessoal: PersonOutlineIcon,
};

// Categoria sem cor própria: ícone + nome, num fundo neutro.
export function ChipCategoria({ categoria, size = "small" }) {
  const Icone = ICONES_CATEGORIA[categoria];
  return (
    <Chip
      size={size}
      icon={Icone ? <Icone sx={{ fontSize: 15 }} /> : undefined}
      label={rotulo(CATEGORIAS, categoria)}
      sx={{ bgcolor: "var(--argos-trilha)", color: "text.primary", fontWeight: 500, "& .MuiChip-icon": { color: "text.secondary" } }}
    />
  );
}

const CORES_URGENCIA = { baixa: "var(--argos-exp-1)", media: "var(--argos-exp-2)", alta: "var(--argos-exp-4)" };

export function ChipUrgencia({ urgencia, size = "small" }) {
  const cor = CORES_URGENCIA[urgencia] ?? "var(--argos-texto2)";
  return (
    <Chip
      size={size}
      variant="outlined"
      icon={<Marcador cor={cor} forma="circulo" tamanho={8} />}
      label={`Urgência ${rotulo(URGENCIAS, urgencia).toLowerCase()}`}
      sx={estiloMarcado}
    />
  );
}

const ACEITE = {
  true: { label: "Aceita", cor: "var(--argos-sucesso)" },
  false: { label: "Rejeitada", cor: "var(--argos-erro)" },
  null: { label: "Pendente", cor: "var(--argos-atencao)" },
};

export function ChipAceite({ aceita, size = "small" }) {
  const { label, cor } = ACEITE[aceita === true ? "true" : aceita === false ? "false" : "null"];
  return <Chip size={size} variant="outlined" icon={<Marcador cor={cor} forma="circulo" tamanho={8} />} label={label} sx={estiloMarcado} />;
}
