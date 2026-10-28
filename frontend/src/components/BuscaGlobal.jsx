import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, ButtonBase, Dialog, InputBase, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import SubdirectoryArrowLeftIcon from "@mui/icons-material/SubdirectoryArrowLeft";
import { projetos as servicoProjetos } from "../services/api";
import { faixaExposicao } from "../constants";
import { Marcador } from "./Badges";

const LIMITE_POR_GRUPO = 6;
const normalizar = (texto) =>
  (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Atalho exibido no botão: ⌘K no Mac, Ctrl K nos demais.
export const ATALHO = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K";

// Busca global (Ctrl+K): riscos, projetos e páginas do sistema. Setas para
// escolher, Enter para abrir, Esc para fechar.
export default function BuscaGlobal({ aberta, aoFechar, riscos, paginas }) {
  const navigate = useNavigate();
  const [termo, setTermo] = useState("");
  const [projetos, setProjetos] = useState([]);
  const [selecionado, setSelecionado] = useState(0);
  const lista = useRef(null);

  useEffect(() => {
    if (!aberta) return;
    setTermo("");
    setSelecionado(0);
    servicoProjetos.meus().then(setProjetos).catch(() => setProjetos([]));
  }, [aberta]);

  const projetoPorId = useMemo(() => new Map(projetos.map((p) => [p.id, p])), [projetos]);

  const grupos = useMemo(() => {
    const t = normalizar(termo.trim());
    const casa = (...campos) => !t || campos.some((c) => normalizar(c).includes(t));
    const riscosAchados = riscos
      .filter((r) => !r.arquivado && casa(r.indice, r.titulo, projetoPorId.get(r.id_projeto)?.nome))
      .sort((a, b) => b.exposicao - a.exposicao)
      .slice(0, LIMITE_POR_GRUPO)
      .map((r) => ({
        chave: `r${r.id}`,
        titulo: `${r.indice} · ${r.titulo}`,
        detalhe: projetoPorId.get(r.id_projeto)?.nome ?? "",
        icone: <Marcador cor={faixaExposicao(r.exposicao).cor} />,
        destino: `/gerente/riscos/${r.id}/recomendacao`,
      }));
    const projetosAchados = projetos
      .filter((p) => casa(p.nome, p.descricao))
      .slice(0, LIMITE_POR_GRUPO)
      .map((p) => ({
        chave: `p${p.id}`,
        titulo: p.nome,
        detalhe: "Ver riscos do projeto",
        icone: <AccountTreeOutlinedIcon sx={{ fontSize: "1.125rem" }} />,
        destino: "/gerente/riscos",
        estado: { projeto: p.id },
      }));
    const paginasAchadas = paginas
      .filter((p) => casa(p.titulo, p.grupo))
      .map((p) => ({ chave: p.caminho, titulo: p.titulo, detalhe: p.grupo, icone: p.icone, destino: p.caminho }));
    return [
      { nome: "Riscos", itens: riscosAchados },
      { nome: "Projetos", itens: projetosAchados },
      { nome: "Páginas", itens: paginasAchadas },
    ].filter((g) => g.itens.length);
  }, [termo, riscos, projetos, paginas, projetoPorId]);

  const itens = grupos.flatMap((g) => g.itens);

  useEffect(() => {
    setSelecionado(0);
  }, [termo]);

  useEffect(() => {
    lista.current?.querySelector(`[data-indice="${selecionado}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selecionado]);

  function abrir(item) {
    aoFechar();
    navigate(item.destino, item.estado ? { state: item.estado } : undefined);
  }

  function aoTeclar(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelecionado((i) => Math.min(i + 1, itens.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelecionado((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && itens[selecionado]) {
      e.preventDefault();
      abrir(itens[selecionado]);
    }
  }

  let indice = -1;
  return (
    <Dialog
      open={aberta}
      onClose={aoFechar}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { alignSelf: "flex-start", mt: { xs: 2, sm: "12vh" }, overflow: "hidden" } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, borderBottom: 1, borderColor: "divider" }}>
        <SearchIcon sx={{ color: "text.secondary" }} />
        <InputBase
          autoFocus
          fullWidth
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={aoTeclar}
          placeholder="Buscar riscos, projetos e páginas…"
          inputProps={{ "aria-label": "Buscar riscos, projetos e páginas", role: "combobox", "aria-expanded": true, "aria-controls": "resultados-busca" }}
          sx={{ py: 2, fontSize: "1rem" }}
        />
        <Box component="kbd" sx={{ fontSize: "0.6875rem", color: "text.secondary", border: 1, borderColor: "divider", borderRadius: 1, px: 0.75, py: 0.25, fontFamily: "inherit" }}>
          Esc
        </Box>
      </Box>

      <Box id="resultados-busca" ref={lista} role="listbox" sx={{ maxHeight: "55vh", overflowY: "auto", py: 1 }}>
        {itens.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 3, py: 4, textAlign: "center" }}>
            Nada encontrado para &quot;{termo}&quot;.
          </Typography>
        ) : (
          grupos.map((g) => (
            <Box key={g.nome} sx={{ pb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2.5, pt: 1, pb: 0.5, fontWeight: 600 }}>
                {g.nome}
              </Typography>
              {g.itens.map((item) => {
                indice += 1;
                const atual = indice === selecionado;
                const meuIndice = indice;
                return (
                  <ButtonBase
                    key={item.chave}
                    data-indice={meuIndice}
                    role="option"
                    aria-selected={atual}
                    onClick={() => abrir(item)}
                    onMouseEnter={() => setSelecionado(meuIndice)}
                    sx={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      px: 2.5,
                      py: 1.1,
                      textAlign: "left",
                      bgcolor: atual ? "color-mix(in srgb, var(--argos-marca) 12%, transparent)" : "transparent",
                    }}
                  >
                    <Box sx={{ width: 20, display: "grid", placeItems: "center", color: "text.secondary", flex: "none" }}>{item.icone}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {item.titulo}
                      </Typography>
                      {item.detalhe && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                          {item.detalhe}
                        </Typography>
                      )}
                    </Box>
                    {atual && <SubdirectoryArrowLeftIcon sx={{ fontSize: "1rem", color: "text.secondary" }} />}
                  </ButtonBase>
                );
              })}
            </Box>
          ))
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 2, px: 2.5, py: 1.25, borderTop: 1, borderColor: "divider", color: "text.secondary", fontSize: "0.75rem" }}>
        <span>↑ ↓ para navegar</span>
        <span>Enter para abrir</span>
        <Box component="span" sx={{ ml: "auto", display: "inline-flex", alignItems: "center", gap: 0.5 }}>
          <ReportProblemOutlinedIcon sx={{ fontSize: "0.875rem" }} /> {riscos.filter((r) => !r.arquivado).length} riscos
        </Box>
      </Box>
    </Dialog>
  );
}
