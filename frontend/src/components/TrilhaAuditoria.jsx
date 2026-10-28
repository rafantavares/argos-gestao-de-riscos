import { useEffect, useState } from "react";
import { Box, Collapse, Divider, LinearProgress, Link, Stack, Typography } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import UpdateIcon from "@mui/icons-material/Update";
import { riscos as servicoRiscos } from "../services/api";

const ICONES = {
  cadastro: AddCircleOutlineIcon,
  edicao: EditOutlinedIcon,
  status: SwapHorizIcon,
  reavaliacao: UpdateIcon,
  recomendacao: AutoAwesomeOutlinedIcon,
  decisao: GavelOutlinedIcon,
  arquivo: ArchiveOutlinedIcon,
  anexo: AttachFileIcon,
};

const ROTULOS_CAMPOS = {
  titulo: "Risco",
  area_afetada: "Área afetada",
  orcamento_impacto: "Orçamento",
  urgencia: "Urgência",
  descricao_impacto: "Descrição do impacto",
  mitigacao: "Mitigação",
  probabilidade_residual: "Probabilidade residual",
  impacto_residual: "Impacto residual",
  contingencia: "Contingência",
  gatilho: "Gatilho",
};

const LIMITE_TEXTO = 140;
const curto = (v) => {
  if (v === null || v === undefined || v === "") return "(vazio)";
  const texto = String(v);
  return texto.length > LIMITE_TEXTO ? `${texto.slice(0, LIMITE_TEXTO)}…` : texto;
};

// Edição do registro: cada campo alterado com o valor antes e depois.
function Mudancas({ detalhes }) {
  const [aberto, setAberto] = useState(false);
  const campos = Object.entries(detalhes ?? {});
  if (!campos.length) return null;
  return (
    <Box sx={{ mt: 0.5 }}>
      <Link component="button" type="button" variant="caption" onClick={() => setAberto((a) => !a)}>
        {aberto ? "Esconder o que mudou" : "Ver o que mudou"}
      </Link>
      <Collapse in={aberto}>
        <Stack spacing={1} sx={{ mt: 1, pl: 1.5, borderLeft: 1, borderColor: "divider" }}>
          {campos.map(([campo, { antes, depois }]) => (
            <Box key={campo}>
              <Typography variant="caption" fontWeight={600}>
                {ROTULOS_CAMPOS[campo] ?? campo}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", textDecoration: "line-through" }}>
                {curto(antes)}
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                {curto(depois)}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

// Trilha de auditoria do risco (GET /riscos/{id}/auditoria): tudo o que
// aconteceu, do mais recente ao mais antigo, com quem fez e quando
// (rastreabilidade). `versao` muda quando a página altera o risco, para recarregar.
export default function TrilhaAuditoria({ idRisco, versao }) {
  const [entradas, setEntradas] = useState(null);

  useEffect(() => {
    servicoRiscos
      .auditoria(idRisco)
      .then(setEntradas)
      .catch(() => setEntradas([]));
  }, [idRisco, versao]);

  if (entradas === null) return <LinearProgress />;
  if (!entradas.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        Nenhum registro na trilha.
      </Typography>
    );
  }

  return (
    <Stack divider={<Divider />}>
      {entradas.map((e, i) => {
        const Icone = ICONES[e.tipo] ?? EditOutlinedIcon;
        const observacao = e.detalhes?.comentario || e.detalhes?.justificativa || e.detalhes?.motivo;
        return (
          <Box key={`${e.tipo}-${e.data}-${i}`} sx={{ display: "flex", gap: 1.5, py: 1.25 }}>
            <Icone sx={{ fontSize: "1.125rem", color: "text.secondary", mt: 0.25 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={500}>
                {e.descricao}
              </Typography>
              {observacao && (
                <Typography variant="body2" color="text.secondary">
                  {e.tipo === "decisao" ? "Motivo: " : ""}
                  {observacao}
                </Typography>
              )}
              {e.tipo === "edicao" && <Mudancas detalhes={e.detalhes} />}
              <Typography variant="caption" color="text.secondary">
                {e.data ? new Date(e.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : ""}
                {e.usuario && ` · ${e.usuario}`}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
