# Funcionalidades avançadas — Argos

Documenta as 4 frentes de expansão funcional do sistema (além do MVP
inicial), pensadas para aprofundar a avaliação técnica do TCC II (DSR).

> **Fim do perfil admin (2026-10-26).** O Argos passou a ter um perfil só, o
> gerente de projetos. O que era do admin foi removido ou herdado:
> - **Contas:** cadastro aberto no login (`POST /auth/cadastro`); saíram
>   `POST/GET /auth/gerentes`. Ao iniciar, a API converte contas `admin` em
>   `gerente` (`app/core/migrar_fase12.py`, idempotente).
> - **Projetos:** o gerente cria os seus e já fica vinculado; a coluna
>   `projetos.id_admin` continua no banco, mas significa "quem criou"
>   (`Projeto.id_criador` no código). Saíram a listagem geral e o vínculo de
>   gerentes pelo admin.
> - **Herdado pelo gerente:** o painel do modelo (`/ml/feature-importance`,
>   `/recomendacoes/metricas-historico`, aba "Desempenho da IA" em Configurações).
> - **Catálogo de planos só para consulta:** o modelo só recomenda os 12 planos
>   fixos (grupo PMBOK × nível), então criar, editar e desativar planos saiu.
>   `GET /planos` lista os 12, mostrados em Configurações > Sobre o Argos. Ao
>   iniciar, a API alinha os textos com `app/core/seed.py` (corrigiu acentos).
> - **Removidos:** visão cross-projeto (`/riscos/admin/todos`,
>   `/recomendacoes/admin/todas`) e o relatório CSV do admin (`/relatorio/riscos`);
>   o gerente exporta CSV e PDF pela página Riscos.
> - **Base histórica** do assistente e da previsão de notas: todos os projetos
>   (uma organização só).
>
> As seções abaixo que citam o admin descrevem o sistema como era em cada fase.

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

## Fase 13 — Critérios de risco, decisões datadas e calibração

- **Critérios de risco por projeto (ISO 31000: os critérios são da
  organização).** `projetos` ganhou `apetite_exposicao` (padrão 15) e os prazos
  de reavaliação por faixa: `prazo_reavaliacao_muito_grave` (7 dias),
  `prazo_reavaliacao_grave` (15) e `prazo_reavaliacao_demais` (30). Editáveis
  em Projetos › Editar. O risco devolve `prazo_reavaliacao_dias` e
  `fora_do_apetite` (exposição acima do apetite), calculados a partir do
  projeto (`Risco.projeto` é carregado junto).
- **Reavaliação pelo prazo do projeto (GPR 17).** O aviso "Reavaliar" e o
  `reavaliacao_pendente` da evolução usam o prazo da faixa do risco, não mais
  30 dias fixos.
- **Acima do limite de tolerância** (na tela, o apetite a risco da ISO 31000 se
  chama "limite de tolerância"). Chip "Acima do limite" na lista, no quadro e na ficha; motivo no quadro
  "Precisam de atenção" da Visão geral; item no sino quando o risco ainda está
  "identificado" (sem tratamento); contagem no cartão do projeto.
- **Decisão datada e com motivo.** `recomendacoes` ganhou `decidida_em` e
  `motivo_rejeicao` (opcional, até 500 caracteres, só na rejeição). Rejeitar
  abre um diálogo com motivos rápidos (`DialogoRejeicao.jsx`); a ficha mostra a
  data e o motivo, e a atividade do Perfil registra "Plano aceito/rejeitado".
- **Tendência de avaliação (calibração).** `GET /riscos/painel/calibracao`
  compara as notas do cadastro com as atuais nos riscos reavaliados: variação
  média de probabilidade, impacto e exposição, no geral e por área afetada. O
  Perfil só interpreta a partir de 3 riscos reavaliados e avisa que a variação
  também reflete mudanças reais do risco.
- **Migração:** `app/core/migrar_fase13.py` (idempotente, roda na subida da API
  em Postgres ou SQLite) e `backend/migracoes/fase13_criterios_risco.sql`.

## Fase 14 — Conta, segurança, privacidade e auditoria

- **Perfil:** "Editar perfil" (nome, cargo, organização). Cargo e organização
  saem como responsável no relatório e na ficha em PDF.
- **Preferências na conta:** tema, modo daltônico, tamanho do texto e reduzir
  animações ficam em `usuarios.preferencias` (JSON) e valem em qualquer
  computador (`useSincronizarPreferencias`: aplica ao entrar e grava cada
  mudança). O navegador continua guardando uma cópia para o primeiro desenho.
- **Notificações (Configurações):** escolher o que aparece no sino (fora do
  apetite, decisões, reavaliações) e ligar o **resumo semanal por e-mail**, com
  prévia (`GET /auth/me/resumo`). O envio é `POST /tarefas/resumo-semanal`
  (cabeçalho `X-Tarefa-Token`), disparado toda segunda pelo workflow
  `.github/workflows/resumo-semanal.yml`; usa a API do Resend. Variáveis no
  Render: `TAREFAS_TOKEN`, `RESEND_API_KEY`, `RESUMO_REMETENTE`; segredo
  `TAREFAS_TOKEN` no GitHub. Sem elas, nada é enviado e a prévia avisa.
- **Segurança:** últimos 10 acessos (data, navegador, IP; tabela
  `acessos_usuarios`, guarda os 20 mais recentes) e "Sair de todas as outras
  sessões": o token leva a versão da sessão (`ver`) e `usuarios.versao_token`
  sobe 1, invalidando os tokens antigos. Trocar a senha faz o mesmo e devolve
  um token novo para a sessão atual.
- **Privacidade (LGPD):** exportar todos os dados em JSON (`GET /auth/me/dados`)
  e excluir a conta com confirmação de senha (`POST /auth/me/excluir`): nome,
  e-mail, cargo, organização, preferências e acessos são apagados ou
  anonimizados e o login deixa de funcionar; riscos e projetos ficam, sem o
  nome do titular (histórico dos projetos e treino do modelo).
- **Trilha de auditoria do risco** (aba Histórico da ficha,
  `GET /riscos/{id}/auditoria`): junta cadastro, status, reavaliações,
  recomendações e decisões (tabelas já existentes) com os eventos novos da
  tabela `eventos_riscos`: edição do registro com o valor antes e depois de
  cada campo, arquivamento/restauração e anexos. Salvar sem mudar nada não
  gera evento.
- **Migração:** `app/core/migrar_fase14.py` (colunas de `usuarios`; as tabelas
  novas saem do `create_all`) e `backend/migracoes/fase14_conta_auditoria.sql`.

## Testes automatizados (evidência da avaliação técnica)

217 testes em `backend/tests/` (contagem atual; a tabela abaixo é da fase 4 e
não foi atualizada arquivo a arquivo), executados com `python -m pytest`:

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
