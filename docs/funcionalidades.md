# Funcionalidades avançadas — Escopilot

Documenta as 4 frentes de expansão funcional do sistema (além do MVP
inicial), pensadas para aprofundar a avaliação técnica do TCC II (DSR).

## Fase 1 — Ciclo de vida do risco (status + histórico)

Um risco deixou de ser estático: agora tem `status` (identificado → em
monitoramento → mitigado → encerrado, sendo encerrado terminal) e uma
timeline (`HistoricoRisco`) registrando cada mudança, com quem mudou, quando
e um comentário opcional. A criação do risco já grava o primeiro evento.

- Backend: `app/models/risco.py`, `app/models/historico_risco.py`,
  `PATCH /riscos/{id}/status`, `GET /riscos/{id}/historico`.
- Frontend: coluna de status em `pages/gerente/Riscos.jsx`, seção de
  histórico/transição em `pages/gerente/Recomendacao.jsx`.

## Fase 2 — ML mais sofisticado (novos atributos de risco)

Adicionados 2 atributos de risco alinhados a fatores de severidade do
PMI/PMBOK, além de categoria/probabilidade/impacto:

- **orcamento_impacto** (baixo/médio/alto) — exposição financeira do risco.
- **urgencia** (baixa/média/alta) — proximidade temporal ("proximity" do
  PMBOK, distinto de probabilidade de ocorrência).

Isso expandiu o espaço de combinações únicas do dataset sintético de **36
para 324** (`gerar_dataset.py`), com o mesmo princípio de ruído controlado
(15%) usado antes.

**Resultado medido após a mudança** (`treinar_e_avaliar`, 1296 exemplos,
GridSearchCV, k-fold=5):

| Algoritmo       | Antes (3 features, 36 combos) | Depois (5 features, 324 combos) |
|-----------------|-------------------------------|----------------------------------|
| KNN             | 84,95%                        | 76,47%                          |
| Árvore de Decisão | 84,95%                       | 75,54%                          |
| Random Forest   | 84,95%                         | **78,55%**                      |

Achado relevante para o TCC: com apenas 3 features o problema era quase
uma tabela de decisão (36 chaves únicas), e os três algoritmos convergiam
para o mesmo resultado depois do tuning — não havia o que comparar. Com 5
features e o mesmo nível de ruído, o problema fica genuinamente mais
difícil (mais dimensões para errar) e os algoritmos **passam a divergir de
verdade**, com o Random Forest se saindo melhor — uma comparação bem mais
rica para a seção de avaliação técnica do que "os três empatam".

**Importante:** a fórmula de severidade de 4 dimensões (usada só para
gerar o dataset sintético, em `gerar_dataset.py`) é independente da matriz
de risco visual do frontend (`nivelSeveridade` em `constants.js`), que
continua 2D (probabilidade × impacto) — é o padrão PMBOK e não deveria
virar 4D só porque o dataset ficou mais rico.

- Backend: `app/models/enums.py` (`OrcamentoImpacto`, `Urgencia`),
  `app/ml/preprocessor.py`, `app/ml/gerar_dataset.py`, `app/ml/predictor.py`,
  `app/routers/recomendacoes.py`.
- Frontend: 2 selects novos em `pages/gerente/Riscos.jsx`, chips
  correspondentes em `pages/gerente/Recomendacao.jsx`.
- Migração: `app/core/migrar_fase2.py`.

## Fase 3 — Dashboards e relatórios

- Histórico de métricas de treinamento persistido no banco
  (`MetricaTreinamento`, uma linha por algoritmo a cada retreino) em vez de
  só sobrescrever `metricas.json` — gravado pelo *caller*
  (`app/routers/recomendacoes.py`), não pelo módulo `app.ml` (que continua
  sem depender de banco, testável isoladamente via CLI).
- Endpoints admin novos: `GET /riscos/admin/todos`,
  `GET /recomendacoes/admin/todas`, `GET /recomendacoes/admin/metricas-historico`.
- Dashboard do gerente: gráfico de barras "riscos por status" + contagem por
  categoria.
- Dashboard do admin: gráfico de linha da evolução da acurácia dos 3
  algoritmos entre retreinos, riscos por severidade (cross-projeto) e taxa
  de aceitação de recomendações.
- Biblioteca: `@mui/x-charts`, com cores fixas por série (não a paleta
  automática da lib) — teal/azul/violeta para KNN/Árvore/Random Forest,
  reaproveitando `CORES_SEVERIDADE`/`CORES_STATUS` onde fizer sentido
  semanticamente.
- Exportação CSV client-side (sem endpoint novo) na lista de riscos do
  gerente e na visão cross-projeto do admin.

## Fase 4 — Admin/governança

- `PlanoContingencia` ganha `ativo` (default true) — plano não é apagado
  (FK de `Recomendacao` histórica), só desativado.
- CRUD admin-only em `app/routers/planos.py`: criar, editar, listar,
  ativar/desativar.
- **Bug real encontrado e corrigido durante o teste:** o seed inicial
  (`app/core/seed.py`) insere os 12 planos com `id` explícito
  (`bulk_insert_mappings`), o que não avança a sequence do Postgres. O
  primeiro `INSERT` feito pela API (id automático) colidia com o id=1
  (`UniqueViolation`). Corrigido com um `setval` na migração
  (`app/core/migrar_fase4.py`).
- Página `pages/admin/PlanosContingencia.jsx`: tabela + dialog de
  criar/editar + toggle de ativo/inativo.
- Página `pages/admin/Riscos.jsx`: visão somente-leitura cross-projeto, com
  filtro por projeto e export CSV.
- **Limitação conhecida (não é bug):** um plano novo só passa a ser
  recomendado pelo modelo depois que pelo menos uma recomendação com esse
  plano for aceita por um gerente — o feedback real vira exemplo de treino
  (mesmo mecanismo incremental que já existia). Um plano recém-criado ainda
  não aparece nas previsões do modelo até isso acontecer.
