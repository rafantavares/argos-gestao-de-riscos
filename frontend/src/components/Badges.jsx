import { Box, Chip, Tooltip } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import CodeIcon from "@mui/icons-material/Code";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import CorporateFareIcon from "@mui/icons-material/CorporateFare";
import PublicIcon from "@mui/icons-material/Public";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import UpdateIcon from "@mui/icons-material/Update";
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

// Modo daltônico: cada faixa de exposição ganha uma forma própria, para que a
// gravidade não dependa só da cor (WCAG 1.4.1). Da mais leve à mais grave:
// círculo, quadrado, losango, triângulo e estrela.
const FORMAS_FAIXA = [
  { clipPath: "circle(50%)" },
  { borderRadius: "1px" },
  { clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)", transform: "scale(1.2)" },
  { clipPath: "polygon(50% 4%, 100% 96%, 0 96%)", transform: "scale(1.25)" },
  {
    clipPath: "polygon(50% 0, 63% 34%, 100% 36%, 71% 59%, 81% 96%, 50% 75%, 19% 96%, 29% 59%, 0 36%, 37% 34%)",
    transform: "scale(1.4)",
  },
];

export function Marcador({ cor, forma = "quadrado", tamanho = 10 }) {
  const faixa = /--argos-exp-(\d)\)/.exec(cor ?? "")?.[1];
  return (
    <Box
      component="span"
      aria-hidden="true"
      sx={{
        width: tamanho,
        height: tamanho,
        flex: "none",
        borderRadius: forma === "circulo" ? "50%" : "3px",
        bgcolor: cor,
        display: "inline-block",
        ...(faixa !== undefined && { "[data-escala='daltonico'] &": { borderRadius: 0, ...FORMAS_FAIXA[faixa] } }),
      }}
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
      icon={<IconeArea area={area} sx={{ fontSize: "1rem" }} />}
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
      icon={Icone ? <Icone sx={{ fontSize: "0.9375rem" }} /> : undefined}
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

// Decisão sobre a recomendação: ícone (✓, ✕, ampulheta) + cor, para não
// depender só do par verde/vermelho.
const ACEITE = {
  true: { label: "Aceita", cor: "var(--argos-sucesso)", Icone: CheckIcon },
  false: { label: "Rejeitada", cor: "var(--argos-erro)", Icone: CloseIcon },
  null: { label: "Pendente", cor: "var(--argos-atencao)", Icone: HourglassEmptyIcon },
};

export function ChipAceite({ aceita, size = "small" }) {
  const { label, cor, Icone } = ACEITE[aceita === true ? "true" : aceita === false ? "false" : "null"];
  return (
    <Chip
      size={size}
      variant="outlined"
      icon={<Icone sx={{ fontSize: "0.9375rem" }} />}
      label={label}
      sx={{ ...estiloMarcado, "& .MuiChip-icon": { color: cor, ml: "6px", mr: "-2px" } }}
    />
  );
}

// Aviso de reavaliação pendente (monitoramento contínuo, GPR 17): o mesmo
// formato no quadro, nos cartões e na tabela.
export function ChipReavaliar({ size = "small" }) {
  return (
    <Tooltip title="Reavaliação vencida pelo prazo do projeto (monitoramento contínuo, GPR 17)">
      <Chip
        size={size}
        variant="outlined"
        icon={<UpdateIcon sx={{ fontSize: "0.9375rem" }} />}
        label="Reavaliar"
        sx={{ ...estiloMarcado, "& .MuiChip-icon": { color: "var(--argos-atencao)", ml: "6px", mr: "-2px" } }}
      />
    </Tooltip>
  );
}

// Exposição acima do limite de tolerância do projeto (apetite a risco, ISO 31000).
export function ChipForaApetite({ size = "small" }) {
  return (
    <Tooltip title="Exposição acima do limite de tolerância do projeto (apetite a risco, ISO 31000): pede tratamento">
      <Chip
        size={size}
        variant="outlined"
        icon={<WarningAmberOutlinedIcon sx={{ fontSize: "0.9375rem" }} />}
        label="Acima do limite"
        sx={{ ...estiloMarcado, "& .MuiChip-icon": { color: "var(--argos-erro)", ml: "6px", mr: "-2px" } }}
      />
    </Tooltip>
  );
}
