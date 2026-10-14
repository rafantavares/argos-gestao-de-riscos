import { Box, Chip, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { AREAS_AFETADAS, CATEGORIAS, FAIXAS_EXPOSICAO, IMPACTOS, PROBABILIDADES, STATUS_RISCO, rotulo } from "../constants";

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

// Glossário e regras do sistema: escalas, exposição, ciclo de vida e a base
// normativa (PMBOK / MR-MPS-SW:2023).
export default function Ajuda() {
  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Typography variant="h5" fontWeight={600}>
        Ajuda
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Como o Argos avalia, trata e monitora os riscos, e onde cada parte se apoia no PMBOK e no MR-MPS-SW:2023.
      </Typography>

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
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          SOFTEX. MPS.BR – Guia Geral MPS de Software:2023. GPR = Gerência de Projetos; GPC = Gerência de Processos.
        </Typography>
      </Secao>
    </Box>
  );
}
