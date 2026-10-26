import { Box, Button, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import {
  FASES_PROJETO,
  IMPACTOS,
  PROBABILIDADES,
  faixaExposicao,
  precisaReavaliar,
  reducaoPercentual,
  rotulo,
} from "../constants";
import { ChipArea, ChipStatus, ChipUrgencia } from "./Badges";
import MiniMatriz from "./MiniMatriz";

function Dado({ rotulo: nome, children }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
        {nome}
      </Typography>
      <Typography variant="body2" fontWeight={600} component="div">
        {children}
      </Typography>
    </Box>
  );
}

// Cabeçalho do detalhe do risco: a "ficha" com a exposição em destaque e os
// dados principais do registro.
export default function FichaRisco({ risco, aoArquivar }) {
  const navigate = useNavigate();
  const faixa = faixaExposicao(risco.exposicao);
  const ultimaAvaliacao = new Date(risco.ultima_avaliacao_em ?? risco.criado_em);
  return (
    <Paper sx={{ p: { xs: 2, md: 2.5 }, mb: 2, borderTop: `4px solid ${faixa.cor}` }}>
      <Box sx={{ display: "flex", gap: { xs: 2, md: 3 }, alignItems: "center", flexWrap: "wrap" }}>
        <Box
          sx={{
            width: 96,
            height: 96,
            borderRadius: 2,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            bgcolor: `color-mix(in srgb, ${faixa.cor} 12%, transparent)`,
            border: `2px solid ${faixa.cor}`,
          }}
        >
          <Box>
            <Typography sx={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 38, fontWeight: 700, lineHeight: 1, color: faixa.cor }}>
              {risco.exposicao}
            </Typography>
            <Typography variant="caption" sx={{ color: faixa.cor, fontWeight: 700 }}>
              {faixa.label}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flex: "1 1 320px", minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
            <Typography variant="h6" sx={{ color: "primary.main", fontWeight: 700 }}>
              {risco.indice}
            </Typography>
            <ChipStatus status={risco.status} />
            {risco.arquivado && (
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                ARQUIVADO
              </Typography>
            )}
            {precisaReavaliar(risco) && (
              <Typography variant="caption" sx={{ color: "var(--argos-atencao)", fontWeight: 700 }}>
                REAVALIAÇÃO PENDENTE
              </Typography>
            )}
          </Box>
          <Typography variant="h5" fontWeight={600} sx={{ lineHeight: 1.25, mb: 1.5, wordBreak: "break-word" }}>
            {risco.titulo}
          </Typography>
          <Box sx={{ display: "flex", gap: { xs: 2, md: 3 }, flexWrap: "wrap" }}>
            <Dado rotulo="Área afetada">
              <ChipArea area={risco.area_afetada} />
            </Dado>
            <Dado rotulo="Probabilidade">
              {risco.probabilidade} · {rotulo(PROBABILIDADES, risco.probabilidade)}
            </Dado>
            <Dado rotulo="Impacto">
              {risco.impacto} · {rotulo(IMPACTOS, risco.impacto)}
            </Dado>
            <Dado rotulo="Urgência">
              <ChipUrgencia urgencia={risco.urgencia} />
            </Dado>
            <Dado rotulo="Fase">{rotulo(FASES_PROJETO, risco.fase_projeto)}</Dado>
            <Dado rotulo="Última avaliação">{ultimaAvaliacao.toLocaleDateString("pt-BR")}</Dado>
            {risco.exposicao_residual != null && (
              <Dado rotulo="Residual esperada">
                <span style={{ color: faixaExposicao(risco.exposicao_residual).cor }}>
                  {risco.exposicao_residual} · {risco.avaliacao_exposicao_residual}
                </span>{" "}
                <Typography component="span" variant="caption" color="text.secondary">
                  (−{reducaoPercentual(risco.exposicao, risco.exposicao_residual)}%)
                </Typography>
              </Dado>
            )}
          </Box>
          {risco.id_conversa_origem && (
            <Button
              size="small"
              color="secondary"
              startIcon={<ForumOutlinedIcon />}
              onClick={() => navigate("/gerente/assistente", { state: { idConversa: risco.id_conversa_origem } })}
              sx={{ mt: 1.5, px: 1, textTransform: "none" }}
            >
              Criado a partir de uma conversa com o Assistente IA
            </Button>
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
          <MiniMatriz probabilidade={risco.probabilidade} impacto={risco.impacto} tamanho={14} folga={3} />
          <Button
            size="small"
            color="inherit"
            startIcon={<PictureAsPdfIcon />}
            onClick={() => navigate(`/gerente/riscos/${risco.id}/ficha`)}
            sx={{ color: "text.secondary" }}
          >
            Ficha em PDF
          </Button>
          <Button
            size="small"
            color={risco.arquivado ? "primary" : "inherit"}
            startIcon={risco.arquivado ? <UnarchiveOutlinedIcon /> : <ArchiveOutlinedIcon />}
            onClick={aoArquivar}
            sx={{ color: risco.arquivado ? undefined : "text.secondary" }}
          >
            {risco.arquivado ? "Restaurar" : "Arquivar"}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
