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

## Testes automatizados (evidência da avaliação técnica)

76 testes em `backend/tests/`, executados com `python -m pytest`:

| Arquivo | Testes | O que cobre |
|---|---|---|
| `test_auth.py` | 12 | Login, JWT, restrição de rotas por perfil |
| `test_projetos.py` | 12 | CRUD de projetos, vínculo de gerentes, isolamento entre admins |
| `test_riscos.py` | 15 | Cadastro, isolamento entre gerentes, ciclo de vida (status/histórico) |
| `test_recomendacoes.py` | 14 | Fluxo de recomendação, aceite/rejeição, retroalimentação do modelo |
| `test_planos.py` | 8 | Catálogo de planos, ativação/desativação |
| `test_ml.py` | 15 | Dataset sintético (reprodutibilidade, cobertura, ruído) e pré-processamento |

**Isolamento:** cada teste roda contra um SQLite em memória criado do zero e
descartado ao final — não toca no Supabase nem depende de rede. A dependência
`obter_sessao` é sobrescrita via `app.dependency_overrides`, e o `TestClient`
é usado *sem* context manager de propósito, para não disparar o evento de
startup (que criaria tabelas e semearia dados no banco real).

**ML simulado nos testes de integração:** treinar de verdade levaria ~1 minuto
por chamada (GridSearchCV) e dependeria dos `.joblib` em disco, que não são
versionados. Nos testes de recomendação, predição e retreino são substituídos
por versões instantâneas que registram o que foi chamado — o que se verifica
ali é a integração (se as 5 features do risco chegam ao preditor, se o aceite
dispara o retreino e se o dataset enviado inclui o feedback). As propriedades
do modelo em si ficam em `test_ml.py`, que testa funções puras.

**Testes com "dentes" (verificado por mutação):** para conferir que a suíte
realmente pega regressões — e não só passa —, três defeitos foram injetados
de propósito no código e todos foram detectados pelos testes esperados:
remover a regra de "encerrado é terminal" (1 falha), remover o filtro por
gerente nas consultas de risco (3 falhas, vazamento entre gerentes), e
dessincronizar `PLANO_BASE_POR_CATEGORIA` do `seed.py` (2 falhas). O código
foi restaurado depois de cada injeção.

Esse último caso é o mais relevante para o TCC: o mapeamento entre categoria
de risco e id de plano existe duplicado em `app/ml/gerar_dataset.py` e
`app/core/seed.py`. Se um mudar sem o outro, o dataset passa a rotular riscos
com planos da categoria errada — silenciosamente, sem erro em tempo de
execução. `test_plano_canonico_bate_com_o_catalogo_semeado` trava essa
regressão.
