import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Box, ButtonBase, IconButton, Popover, Tooltip, Typography } from "@mui/material";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import UpdateIcon from "@mui/icons-material/Update";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { precisaReavaliar } from "../constants";

const dias = (data) => Math.floor((Date.now() - new Date(data).getTime()) / 86400000);

// O que pede ação do gerente agora: riscos sem reavaliação há 30+ dias (GPR 17)
// e recomendações da IA aguardando decisão. Cada item abre o risco.
export function itensPendentes(riscos, recomendacoes) {
  const riscoPorId = new Map(riscos.map((r) => [r.id, r]));
  const reavaliar = riscos
    .filter((r) => !r.arquivado && precisaReavaliar(r))
    .map((r) => ({
      chave: `reav-${r.id}`,
      tipo: "reavaliar",
      titulo: `${r.indice} · ${r.titulo}`,
      detalhe: `Sem reavaliação há ${dias(r.ultima_avaliacao_em ?? r.criado_em)} dias`,
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
  return [...decidir, ...reavaliar];
}

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
          <Badge badgeContent={total} max={99} color="warning" sx={{ "& .MuiBadge-badge": { fontWeight: 700, fontSize: 10, minWidth: 18, height: 18 } }}>
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
            <Typography variant="body2">Tudo em dia. Nenhuma decisão ou reavaliação pendente.</Typography>
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
                    color: item.tipo === "decidir" ? "secondary.main" : "warning.main",
                    bgcolor:
                      item.tipo === "decidir"
                        ? "color-mix(in srgb, var(--argos-ia) 14%, transparent)"
                        : "color-mix(in srgb, var(--argos-atencao) 14%, transparent)",
                  }}
                >
                  {item.tipo === "decidir" ? <AutoAwesomeOutlinedIcon sx={{ fontSize: 17 }} /> : <UpdateIcon sx={{ fontSize: 17 }} />}
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
