# Registro de riscos no formato PMBOK / MR-MPS-SW (fase 6)

A orientadora sugeriu alinhar o cadastro de riscos, além do PMBOK, à gerência
de riscos do MR-MPS-SW (MPS.BR), o modelo de qualidade de software auditado nas
empresas certificadas. Na edição 2023 isso corresponde aos resultados GPR 10,
10+, 17 e 17+ (Gerência de Projetos) e GPC 7 (Gerência de Processos). O registro passou a
ter os mesmos atributos usados na prática dela.

## Base normativa (Guia Geral MPS de Software:2023, vigente desde 1º/03/2023)

**Atenção para o texto do TCC:** na edição 2023 **não existe mais o processo
Gerência de Riscos (GRI)**. Ele saiu do modelo na reestruturação do Guia
Geral:2020, que levou a gestão de riscos para dentro de outros processos (o
histórico de versões do guia registra que a edição 2020 "incluiu no Processo de
Gerência de Processos a gestão de riscos", p. 41). Hoje a gerência de riscos
está distribuída em dois processos:

| Resultado (2023) | Texto (resumido) | Página | No sistema |
|---|---|---|---|
| **GPR 10** (até nível E) | Riscos ou oportunidades do projeto identificados, com impacto, probabilidade de ocorrência e prioridade de tratamento determinados e documentados | p. 19 | Registro do risco (índice, área, descrição do impacto), notas 1–5, exposição com faixas e ordenação por criticidade; previsão das notas pelo histórico |
| **GPR 10+** (a partir do D) | Tratamento dos riscos conforme a estratégia de riscos da organização. NOTA 1: tratamento inclui planos de **mitigação e contingência** | p. 19 | Campos mitigação/contingência/gatilho, sugestão por IA e plano de contingência recomendado pelo ML |
| **GPR 17** (até nível E) | Riscos ou oportunidades monitorados e resultados comunicados às partes interessadas | p. 20 | Status e histórico do risco; reavaliações com a evolução da exposição, tendência e aviso de reavaliação pendente; dashboards e exportação CSV |
| **GPR 17+** (a partir do D) | Monitoramento em relação às estratégias definidas | p. 20 | Sugestão de recálculo quando o risco muda de situação (ex.: mitigado) |
| **GPC 7** (a partir do nível E) | Estratégias de gerência de riscos com **parâmetros, categorias** e atividades; riscos organizacionais identificados, analisados, priorizados, tratados, documentados, monitorados e comunicados. NOTA 1: análise = priorização, impacto e probabilidade | p. 36 | Parâmetros e categorias padronizados para toda a organização (10 áreas afetadas, escalas 1–5, faixas de exposição), catálogo de planos mantido pelo admin, visão cross-projeto do admin |

Processos: Gerência de Projetos – GPR (seção 9.1.1, p. 18; implementação a
partir do nível G) e Gerência de Processos – GPC (seção 9.2.6, p. 35).
Referência: SOFTEX. *MPS.BR – Guia Geral MPS de Software:2023*. Março/2023.

### Edição 2016 (histórico)

Na edição 2016 (seção 9.5.3) havia o processo próprio **Gerência de Riscos
(GRI)**, nível C, com propósito "identificar, analisar, tratar, monitorar e
reduzir continuamente os riscos em nível organizacional e de projeto" e nove
resultados (GRI 1–9). A correspondência abaixo só serve para comparar as
edições; **no texto do TCC, citar a edição 2023 (GPR/GPC)**.

| Resultado 2016 | Texto (resumido) | Equivalente em 2023 |
|---|---|---|
| GRI 1–3 | Escopo, origens/categorias/parâmetros e estratégias definidos | GPC 7 |
| GRI 4–5 | Riscos identificados, documentados, priorizados e classificados | GPR 10 |
| GRI 6 | Planos de mitigação desenvolvidos | GPR 10+ |
| GRI 7–8 | Recursos para monitoramento priorizados; riscos monitorados | GPR 17 / 17+ |
| GRI 9 | Ações executadas para corrigir/evitar o impacto | GPR 10+ / GPR 18 |

## Atributos do registro

| Atributo | Como ficou no sistema |
|---|---|
| **Índice** | `R01`, `R02`... gerado automaticamente, sequência por projeto (`riscos.indice`). |
| **Categoria** | *Área afetada* (Cronograma, Custo, Escopo, Qualidade, Segurança da informação, Infraestrutura, Usabilidade, Equipe, Fornecedores, Legal e regulatório). Cada área mapeia para um dos 4 grupos PMBOK (`AREA_PARA_CATEGORIA`), que segue alimentando o ML e o catálogo de planos. |
| **Risco** | `titulo`. |
| **Descrição do impacto** | `descricao_impacto` (obrigatório). |
| **Impacto** | Nota 1–5: 1 Limitado, 2 Baixo, 3 Moderado, 4 Elevado, 5 Alto. |
| **Probabilidade** | Nota 1–5: 1 Quase nula, 2 Não provável, 3 Provável, 4 Muito provável, 5 Esperado. |
| **Exposição** | Impacto × probabilidade (1–25), calculada e exibida ao vivo com a avaliação: Muito Leve (1–3), Leve (4–10), Moderado (11–15), Grave (16–20), Muito Grave (21–25). Implementação em `app/core/exposicao.py` (backend) e `constants.js` (frontend). |
| **Mitigação** | `mitigacao` (ação preventiva). |
| **Contingência** | `contingencia` (ação reativa). |
| **Gatilho** | `gatilho` (evento/indicador que aciona a contingência). |

Os atributos extras do ML (impacto no orçamento, urgência, fase do projeto)
foram mantidos. O modelo agora recebe probabilidade e impacto como notas
ordinais 1–5; o alvo continua sendo o nível de severidade (baixo/médio/alto),
derivado das faixas da exposição (Muito Leve/Leve → baixo, Moderado → médio,
Grave/Muito Grave → alto). Com o dataset regenerado (300 registros, mesma
semente) as acurácias em validação cruzada de 10 partições ficaram em: Árvore
de Decisão 89,0%, Random Forest 87,3%, KNN 80,7%.

## Sugestões de IA da orientadora

| Sugestão | Situação | Implementação |
|---|---|---|
| Classificação inteligente + duplicados | **Implementado** | `app/assistente/classificador.py`: TF-IDF (n-gramas de caracteres) + regressão logística sugere a área afetada (com confiança); similaridade do cosseno contra os riscos do projeto avisa de possíveis duplicados. |
| Auditoria de coerência (descrição × notas) | **Implementado** | `app/assistente/coerencia.py`: léxico de termos (ex.: "vazamento", "multa") exige impacto mínimo; termos triviais com nota alta e "já ocorreu" com probabilidade baixa também geram alerta, sempre citando os termos. |
| Geração de mitigação e contingência | **Implementado (por modelos)** | `app/assistente/sugestoes.py`: rascunho de mitigação/contingência/gatilho por área e nível de exposição. Ao aceitar o plano do ML, a contingência vira o plano aceito e os campos vazios são pré-preenchidos; o gerente revisa. Não usa LLM. |
| Análise preditiva de exposição (notas iniciais) | **Implementado** | `app/assistente/predicao.py`: a base histórica é o conjunto de riscos de todos os projetos do mesmo administrador (a organização). Para o texto digitado, busca os até 5 riscos mais parecidos (TF-IDF de n-gramas de caracteres + cosseno, similaridade ≥ 0,2) e sugere probabilidade e impacto pela média ponderada pela similaridade (k-NN). O painel mostra as notas previstas e os riscos de referência (índice, projeto, notas), com botão "Aplicar". A base cresce à medida que a organização registra riscos. |
| Recalcular exposição conforme o andamento do projeto | **Implementado (reavaliação assistida)** | Tabela `reavaliacoes_riscos` e `POST /riscos/{id}/reavaliacao`: o gerente revisa as notas e a fase atual do projeto, com justificativa obrigatória; o risco é atualizado e a revisão entra na série. `GET /riscos/{id}/evolucao` (`app/assistente/monitoramento.py`) devolve a série da exposição (avaliação inicial + reavaliações), a tendência (subindo/caindo/estável), um aviso de reavaliação pendente (30 dias sem revisão, exceto riscos encerrados) e uma sugestão de recálculo quando o status mudou depois da última avaliação (ex.: mitigado → probabilidade −1). O recálculo *automático* a partir de dados de progresso (percentual concluído, velocidade da equipe) segue como trabalho futuro. |
| Monitoramento ativo de gatilhos (ClickUp/GitLab) | Trabalho futuro | Exige integração com APIs externas. O campo `gatilho` já guarda o indicador a monitorar. |

## Como aparece na interface

* **Novo risco**: formulário com os campos acima; um painel de IA reage
  enquanto o gerente digita (área sugerida, risco parecido, alertas de
  coerência com botão "Aplicar nota") e o botão "Sugerir com IA" preenche
  mitigação, contingência e gatilho.
* **Detalhe do risco**: cartão "Registro do risco" editável
  (`PATCH /riscos/{id}/tratamento`) e cartão "Evolução da exposição" (gráfico
  da série, tendência, aviso de reavaliação pendente, sugestão de recálculo e
  formulário de reavaliação).
* **Novo risco**: o painel de IA também mostra as notas previstas pelo
  histórico da organização.
* **Matriz de risco** 5×5 colorida pelas faixas da exposição; CSVs com todos
  os atributos.

## Migração do banco

`backend/migracoes/fase6_registro_riscos_mpsbr.sql` (ou
`python -m app.core.migrar_fase6`), idempotente. Riscos antigos são
convertidos: baixa/baixo → 2, média/médio → 3, alta/alto → 4. Os enums
`probabilidade_risco`/`impacto_risco` continuam existindo porque os planos de
contingência do catálogo seguem com a escala de 3 níveis.

## Testes

`backend/tests/test_registro_riscos.py` (faixas de exposição, índice
sequencial, validação 1–5, edição do tratamento, pré-preenchimento ao aceitar
o plano, classificação, duplicados, coerência, sugestões e o endpoint do
assistente). `backend/tests/test_monitoramento_riscos.py` (previsão das notas,
série de evolução, tendência, reavaliação pendente, sugestão de recálculo e os
endpoints de reavaliação). Suíte total: 174 testes.

A tabela `reavaliacoes_riscos` é nova (não altera tabelas existentes), então é
criada pelo `create_all()` no startup da API; não há script de migração.
