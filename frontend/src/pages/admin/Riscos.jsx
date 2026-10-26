import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, MenuItem, TextField, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { projetos as servicoProjetos, riscos as servicoRiscos } from "../../services/api";
import {
  AREAS_AFETADAS,
  CATEGORIAS,
  FASES_PROJETO,
  IMPACTOS,
  PROBABILIDADES,
  STATUS_RISCO,
  URGENCIAS,
  faixaExposicao,
  pontuacaoSeveridade,
  rotulo,
} from "../../constants";
import { ChipArea, ChipSeveridade, ChipStatus, ChipUrgencia } from "../../components/Badges";
import TabelaDados from "../../components/TabelaDados";
import { exportarCsv } from "../../utils/exportarCsv";

const COLUNAS_CSV = (nomeProjeto) => [
  { rotulo: "Projeto", valor: (r) => nomeProjeto(r.id_projeto) },
  { rotulo: "Índice", valor: (r) => r.indice },
  { rotulo: "Categoria (área afetada)", valor: (r) => rotulo(AREAS_AFETADAS, r.area_afetada) },
  { rotulo: "Risco", valor: (r) => r.titulo },
  { rotulo: "Descrição do impacto", valor: (r) => r.descricao_impacto },
  { rotulo: "Impacto", valor: (r) => `${r.impacto} - ${rotulo(IMPACTOS, r.impacto)}` },
  { rotulo: "Probabilidade", valor: (r) => `${r.probabilidade} - ${rotulo(PROBABILIDADES, r.probabilidade)}` },
  { rotulo: "Exposição", valor: (r) => r.exposicao },
  { rotulo: "Avaliação da exposição", valor: (r) => r.avaliacao_exposicao },
  { rotulo: "Mitigação", valor: (r) => r.mitigacao ?? "" },
  { rotulo: "Contingência", valor: (r) => r.contingencia ?? "" },
  { rotulo: "Gatilho", valor: (r) => r.gatilho ?? "" },
  { rotulo: "Grupo PMBOK", valor: (r) => rotulo(CATEGORIAS, r.categoria) },
  { rotulo: "Urgência", valor: (r) => rotulo(URGENCIAS, r.urgencia) },
  { rotulo: "Fase do projeto", valor: (r) => rotulo(FASES_PROJETO, r.fase_projeto) },
  { rotulo: "Status", valor: (r) => rotulo(STATUS_RISCO, r.status) },
];

export default function Riscos() {
  const [riscos, setRiscos] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [filtroProjeto, setFiltroProjeto] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([servicoRiscos.listarTodosAdmin(), servicoProjetos.listar()]).then(([listaRiscos, listaProjetos]) => {
      setRiscos(listaRiscos);
      setProjetos(listaProjetos);
      setCarregando(false);
    });
  }, []);

  const nomeProjeto = (id) => projetos.find((p) => p.id === id)?.nome ?? `#${id}`;

  const riscosFiltrados = useMemo(
    () =>
      riscos
        .filter((r) => (filtroProjeto ? r.id_projeto === filtroProjeto : true))
        .filter((r) => (filtroStatus ? r.status === filtroStatus : true))
        .sort(
          (a, b) =>
            pontuacaoSeveridade(b.probabilidade, b.impacto) - pontuacaoSeveridade(a.probabilidade, a.impacto)
        ),
    [riscos, filtroProjeto, filtroStatus]
  );

  const colunas = [
    {
      chave: "titulo",
      rotulo: "Risco",
      render: (r) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 4,
              height: 36,
              borderRadius: 999,
              bgcolor: faixaExposicao(r.exposicao).cor,
              flexShrink: 0,
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 320 }}>
              <Box component="span" sx={{ color: "primary.main", mr: 0.8 }}>
                {r.indice}
              </Box>
              {r.titulo}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {nomeProjeto(r.id_projeto)} · {new Date(r.criado_em).toLocaleDateString("pt-BR")}
            </Typography>
          </Box>
        </Box>
      ),
    },
    { chave: "categoria", rotulo: "Categoria", largura: 170, render: (r) => <ChipArea area={r.area_afetada} /> },
    {
      chave: "severidade",
      rotulo: "Exposição",
      largura: 170,
      render: (r) => <ChipSeveridade probabilidade={r.probabilidade} impacto={r.impacto} />,
    },
    { chave: "urgencia", rotulo: "Urgência", largura: 140, render: (r) => <ChipUrgencia urgencia={r.urgencia} /> },
    {
      chave: "fase_projeto",
      rotulo: "Fase",
      largura: 130,
      render: (r) => <Chip size="small" variant="outlined" label={rotulo(FASES_PROJETO, r.fase_projeto)} />,
    },
    { chave: "status", rotulo: "Status", largura: 150, render: (r) => <ChipStatus status={r.status} /> },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Riscos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visão consolidada de todos os projetos, ordenada por exposição (impacto × probabilidade).
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          disabled={riscosFiltrados.length === 0}
          onClick={() => exportarCsv("riscos-todos-projetos.csv", COLUNAS_CSV(nomeProjeto), riscosFiltrados)}
        >
          Exportar CSV
        </Button>
      </Box>

      <TabelaDados
        colunas={colunas}
        linhas={riscosFiltrados}
        carregando={carregando}
        textoBusca={(r) => `${r.indice} ${r.titulo} ${nomeProjeto(r.id_projeto)} ${rotulo(AREAS_AFETADAS, r.area_afetada)}`}
        placeholderBusca="Buscar risco por título, projeto ou categoria"
        filtrosExtras={
          <>
            <TextField
              SelectProps={{ displayEmpty: true }}
              InputLabelProps={{ shrink: true }}
              select
              size="small"
              label="Projeto"
              value={filtroProjeto}
              onChange={(e) => setFiltroProjeto(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Todos</MenuItem>
              {projetos.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.nome}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              SelectProps={{ displayEmpty: true }}
              InputLabelProps={{ shrink: true }}
              select
              size="small"
              label="Status"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="">Todos</MenuItem>
              {STATUS_RISCO.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
          </>
        }
        vazio={{
          titulo: "Nenhum risco encontrado",
          descricao: "Os gerentes vinculados aos seus projetos ainda não registraram riscos com esses filtros.",
        }}
      />
    </Box>
  );
}
