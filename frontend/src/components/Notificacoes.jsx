import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Box, ButtonBase, IconButton, Popover, Tooltip, Typography } from "@mui/material";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import UpdateIcon from "@mui/icons-material/Update";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { diasDesdeAvaliacao, precisaReavaliar } from "../constants";

// O que pede ação do gerente agora: riscos fora do apetite ainda sem tratamento
// (ISO 31000), recomendações da IA aguardando decisão e reavaliações vencidas
// pelo prazo do projeto (GPR 17). Cada item abre o risco.
export function itensPendentes(riscos, recomendacoes) {
  const riscoPorId = new Map(riscos.map((r) => [r.id, r]));
  const reavaliar = riscos
    .filter((r) => !r.arquivado && precisaReavaliar(r))
    .map((r) => ({
      chave: `reav-${r.id}`,
      tipo: "reavaliar",
      titulo: `${r.indice} · ${r.titulo}`,
      detalhe: `Sem reavaliação há ${diasDesdeAvaliacao(r)} dias (prazo: ${r.prazo_reavaliacao_dias ?? 30})`,
      destino: `/gerente/riscos/${r.id}/recomendacao?aba=evolucao`,
      data: r.ultima_avaliacao_em ?? r.criado_em,
    }));
  const decidir = recomendacoes
    .filter((rec) => rec.aceita === null && riscoPorId.has(rec.id_risco) && !riscoPorId.get(rec.id_risco).arquivado)
    .map((rec) => {
      const r = riscoPorId.get(rec.id_risco);
      return {
        chave: `rec-${rec.id}`,
        tipo: "decidir",
        titulo: `${r.indice} · ${r.titulo}`,
        detalhe: "Plano recomendado aguardando sua decisão",
        destino: `/gerente/riscos/${r.id}/recomendacao`,
        data: rec.criado_em,
      };
    });
  const foraDoApetite = riscos
    .filter((r) => !r.arquivado && r.fora_do_apetite && r.status === "identificado")
    .map((r) => ({
      chave: `apet-${r.id}`,
      tipo: "apetite",
      titulo: `${r.indice} · ${r.titulo}`,
      detalhe: `Exposição ${r.exposicao}, acima do apetite do projeto, sem tratamento`,
      destino: `/gerente/riscos/${r.id}/recomendacao`,
      data: r.criado_em,
    }));
  return [...foraDoApetite, ...decidir, ...reavaliar];
}

const ESTILO_TIPO = {
  apetite: { cor: "var(--argos-erro)", icone: <WarningAmberOutlinedIcon sx={{ fontSize: "1.0625rem" }} /> },
  decidir: { cor: "var(--argos-ia)", icone: <AutoAwesomeOutlinedIcon sx={{ fontSize: "1.0625rem" }} /> },
  reavaliar: { cor: "var(--argos-atencao)", icone: <UpdateIcon sx={{ fontSize: "1.0625rem" }} /> },
};

export default function Notificacoes({ itens }) {
  const navigate = useNavigate();
  const [ancora, setAncora] = useState(null);
  const total = itens.length;

  function abrir(item) {
    setAncora(null);
    navigate(item.destino);
  }

  return (
    <>
      <Tooltip title={total ? `${total} pendência${total === 1 ? "" : "s"}` : "Nenhuma pendência"}>
        <IconButton
          onClick={(e) => setAncora(e.currentTarget)}
          aria-label={`Notificações: ${total} pendência${total === 1 ? "" : "s"}`}
          sx={{ border: 1, borderColor: "divider", bgcolor: "background.paper", width: 40, height: 40 }}
        >
          <Badge badgeContent={total} max={99} color="warning" sx={{ "& .MuiBadge-badge": { fontWeight: 700, fontSize: "0.625rem", minWidth: 18, height: 18 } }}>
            <NotificationsNoneOutlinedIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(ancora)}
        anchorEl={ancora}
        onClose={() => setAncora(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 380, mt: 1, overflow: "hidden" } } }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <Typography variant="subtitle2" component="h2">
            Pendências
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {total ? `${total} ${total === 1 ? "item" : "itens"}` : ""}
          </Typography>
        </Box>
        {total === 0 ? (
          <Box sx={{ px: 2, py: 4, textAlign: "center", color: "text.secondary" }}>
            <CheckCircleOutlineIcon sx={{ color: "success.main", mb: 1 }} />
            <Typography variant="body2">Tudo em dia. Nada fora do apetite, nenhuma decisão ou reavaliação pendente.</Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 420, overflowY: "auto", py: 0.5 }}>
            {itens.map((item) => (
              <ButtonBase
                key={item.chave}
                onClick={() => abrir(item)}
                sx={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 1.5, px: 2, py: 1.25, textAlign: "left", "&:hover": { bgcolor: "action.hover" } }}
              >
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    flex: "none",
                    borderRadius: 1.5,
                    display: "grid",
                    placeItems: "center",
                    color: ESTILO_TIPO[item.tipo].cor,
                    bgcolor: `color-mix(in srgb, ${ESTILO_TIPO[item.tipo].cor} 14%, transparent)`,
                  }}
                >
                  {ESTILO_TIPO[item.tipo].icone}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" fontWeight={500} noWrap>
                    {item.titulo}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.detalhe}
                  </Typography>
                </Box>
              </ButtonBase>
            ))}
          </Box>
        )}
      </Popover>
    </>
  );
}
