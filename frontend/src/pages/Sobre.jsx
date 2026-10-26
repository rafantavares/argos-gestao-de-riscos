import { useEffect, useState } from "react";
import { Box, Chip, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import MemoryIcon from "@mui/icons-material/Memory";
import { ml as servicoMl } from "../services/api";
import {
  ALGORITMOS,
  AREAS_AFETADAS,
  CATEGORIAS,
  CORES_ALGORITMOS,
  FAIXAS_EXPOSICAO,
  IMPACTOS,
  NOMES_ALGORITMOS,
  PROBABILIDADES,
  STATUS_RISCO,
  VERSAO_SISTEMA,
  rotulo,
} from "../constants";

function Secao({ titulo, children }) {
  return (
    <Paper sx={{ p: 3, mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
        {titulo}
      </Typography>
      {children}
    </Paper>
  );
}

function Escala({ titulo, itens }) {
  return (
    <Box>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
        {titulo}
      </Typography>
      {itens.map((item) => (
        <Typography key={item.value} variant="body2" color="text.secondary">
          <strong>{item.value}</strong> · {item.label}
        </Typography>
      ))}
    </Box>
  );
}

const STATUS_EXPLICADO = {
  identificado: "Registrado, ainda sem plano decidido.",
  em_tratamento: "O gerente aceitou um plano de contingência recomendado.",
  em_monitoramento: "O risco está sendo acompanhado (gatilhos, reavaliações).",
  mitigado: "A ação preventiva surtiu efeito; a probabilidade tende a cair.",
  encerrado: "O risco não se aplica mais. Estado final, não muda mais.",
};

const NORMATIVO = [
  ["GPR 10", "Riscos identificados com impacto, probabilidade e prioridade de tratamento", "Cadastro do risco, notas 1–5, exposição, matriz de risco"],
  ["GPR 10+", "Tratamento conforme a estratégia: planos de mitigação e contingência", "Mitigação, contingência, gatilho, plano recomendado pelo modelo"],
  ["GPR 17", "Riscos monitorados e resultados comunicados às partes interessadas", "Status, histórico, reavaliações, evolução da exposição, evidências"],
  ["GPC 7", "Estratégia da organização com parâmetros e categorias de risco", "Áreas afetadas, escalas e faixas únicas, catálogo de planos"],
];

// Sobre o Argos: informações do sistema e do modelo, glossário e regras: escalas, exposição, ciclo de vida e a base
// normativa (PMBOK / MR-MPS-SW:2023).
function InformacoesSistema() {
  const [metricas, setMetricas] = useState(null);
  useEffect(() => {
    servicoMl.metricas().then(setMetricas).catch(() => setMetricas(null));
  }, []);
  const algoritmos = metricas ? ALGORITMOS.filter((a) => metricas[a]) : [];
  const ativo = algoritmos.reduce((melhor, a) => (!melhor || metricas[a].acuracia > metricas[melhor].acuracia ? a : melhor), null);
  const pct = (v) => (v != null ? `${(v * 100).toFixed(1)}%` : "—");
  return (
    <Secao titulo="Informações do sistema">
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
        <MemoryIcon sx={{ color: "secondary.main" }} />
        <Typography variant="body2">
          Modelo em uso: <strong>{ativo ? NOMES_ALGORITMOS[ativo] : "não treinado"}</strong>
          {ativo ? ` · acurácia ${pct(metricas[ativo].acuracia)} · F1 ${pct(metricas[ativo].f1)}` : ""}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: "auto" } }}>
          Versão {VERSAO_SISTEMA}
          {metricas?._dataset ? ` · ${metricas._dataset.n_exemplos} exemplos de treino` : ""}
          {metricas?.[ativo]?.n_divisoes ? ` · validação cruzada em ${metricas[ativo].n_divisoes} partes` : ""}
        </Typography>
      </Box>
      {algoritmos.length > 0 && (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Algoritmo</TableCell>
              <TableCell align="right">Acurácia</TableCell>
              <TableCell align="right">Precisão</TableCell>
              <TableCell align="right">Recall</TableCell>
              <TableCell align="right">F1</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {algoritmos.map((a) => (
              <TableRow key={a}>
                <TableCell sx={{ color: CORES_ALGORITMOS[a], fontWeight: a === ativo ? 700 : 500 }}>
                  {NOMES_ALGORITMOS[a]}
                  {a === ativo ? " (em uso)" : ""}
                </TableCell>
                <TableCell align="right">{pct(metricas[a].acuracia)}</TableCell>
                <TableCell align="right">{pct(metricas[a].precisao)}</TableCell>
                <TableCell align="right">{pct(metricas[a].recall)}</TableCell>
                <TableCell align="right">{pct(metricas[a].f1)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </Box>
      )}
    </Secao>
  );
}

export default function Sobre() {
  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Sistema web de gestão de riscos com análise preditiva para apoio à decisão em projetos de TI: como ele
        avalia, trata e monitora os riscos, e onde cada parte se apoia no PMBOK e no MR-MPS-SW:2023.
      </Typography>

      <InformacoesSistema />

      <Secao titulo="Como avaliar um risco">
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Escala titulo="Impacto (1 a 5)" itens={IMPACTOS} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Escala titulo="Probabilidade (1 a 5)" itens={PROBABILIDADES} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              Exposição = impacto × probabilidade (1 a 25)
            </Typography>
            {FAIXAS_EXPOSICAO.map((faixa, i) => (
              <Box key={faixa.label} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: faixa.cor }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>{faixa.label}</strong>: {i === 0 ? 1 : FAIXAS_EXPOSICAO[i - 1].ate + 1} a {faixa.ate}
                </Typography>
              </Box>
            ))}
          </Grid>
        </Grid>
      </Secao>

      <Secao titulo="Áreas afetadas e grupos PMBOK">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          A área afetada é a categoria do risco. Cada área pertence a um grupo da estrutura de riscos do PMBOK, que é o que o
          modelo de recomendação usa.
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {AREAS_AFETADAS.map((area) => (
            <Chip key={area.value} variant="outlined" label={`${area.label} · ${rotulo(CATEGORIAS, area.categoria)}`} />
          ))}
        </Box>
      </Secao>

      <Secao titulo="Ciclo de vida do risco">
        {STATUS_RISCO.map((s) => (
          <Typography key={s.value} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            <strong>{s.label}</strong>: {STATUS_EXPLICADO[s.value]}
          </Typography>
        ))}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          <strong>Reavaliação:</strong> conforme o projeto anda, o gerente revisa as notas e a fase; cada revisão vira um ponto
          na evolução da exposição. Riscos ativos sem reavaliação há 30 dias ou mais ganham o aviso <em>Reavaliar</em>.
          <br />
          <strong>Arquivar:</strong> tira o risco das listas, painéis, do modelo e do assistente, sem apagar o histórico
          (dá para restaurar pelo filtro de status “Arquivados”).
        </Typography>
      </Secao>

      <Secao titulo="Inteligência artificial no Argos">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          <strong>Recomendação de plano (aprendizado de máquina):</strong> Árvore de Decisão, Random Forest e KNN são
          avaliados por validação cruzada; o de melhor acurácia recomenda o plano de contingência. Cada plano aceito volta
          para o treino (o modelo aprende com o feedback dos gerentes).
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          <strong>Assistente do cadastro:</strong> sugere a área afetada, prevê as notas a partir de riscos parecidos já
          registrados, avisa de duplicados e audita a coerência entre a descrição e as notas.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Assistente IA (chat):</strong> o gerente descreve o problema e recebe uma proposta de registro e
          tratamento, que pode virar um novo risco com um clique. As sugestões são apoio à decisão: quem decide e registra é
          o gerente.
        </Typography>
      </Secao>

      <Secao titulo="Base normativa: MR-MPS-SW:2023">
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Resultado</TableCell>
              <TableCell>O que pede</TableCell>
              <TableCell>Onde está no Argos</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {NORMATIVO.map(([codigo, pede, onde]) => (
              <TableRow key={codigo}>
                <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>{codigo}</TableCell>
                <TableCell>{pede}</TableCell>
                <TableCell>{onde}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          SOFTEX. MPS.BR – Guia Geral MPS de Software:2023. GPR = Gerência de Projetos; GPC = Gerência de Processos.
        </Typography>
      </Secao>
    </Box>
  );
}
