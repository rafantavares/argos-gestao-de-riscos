# Registro de riscos no formato PMBOK / MR-MPS-SW (fase 6)

A orientadora sugeriu alinhar o cadastro de riscos, além do PMBOK, ao processo
de **Gerência de Riscos (GRI)** do MR-MPS-SW (MPS.BR), que é o modelo de
qualidade de software auditado nas empresas certificadas. O registro passou a
ter os mesmos atributos usados na prática dela.

## Base normativa (conferida no Guia Geral MPS de Software:2016, seção 9.5.3)

Processo **Gerência de Riscos (GRI)**, nível **C – Definido** do MR-MPS-SW.
Propósito: "identificar, analisar, tratar, monitorar e reduzir continuamente os
riscos em nível organizacional e de projeto". Resultados esperados e onde o
sistema os atende:

| Resultado | Texto (resumido) | No sistema |
|---|---|---|
| GRI 1 | Escopo da gerência de riscos determinado | Riscos cadastrados por projeto |
| GRI 2 | Origens, categorias e parâmetros de análise definidos | Áreas afetadas, escalas 1–5 e faixas de exposição |
| GRI 3 | Estratégias de gerência de riscos definidas e implementadas | Ciclo de vida do risco e recomendação de plano |
| GRI 4 | Riscos identificados e documentados, com contexto, condições e consequências | Registro completo, descrição do impacto |
| GRI 5 | Riscos priorizados, estimados e classificados conforme categorias e parâmetros | Exposição (impacto × probabilidade) e ordenação por criticidade |
| GRI 6 | Planos de mitigação desenvolvidos | Campo mitigação e sugestão por IA |
| GRI 7 | Prioridade de recursos para o monitoramento determinada | Ordenação por exposição, matriz de risco 5×5 |
| GRI 8 | Riscos avaliados e monitorados quanto a mudanças de situação | Status do risco e histórico |
| GRI 9 | Ações executadas para corrigir/evitar o impacto | Contingência e gatilho; plano aceito |

O processo Gerência de Projetos (GPR, nível G) também exige (GPR 6 e GPR 15)
que os riscos sejam identificados com impacto, probabilidade e prioridade de
tratamento, e monitorados em relação ao planejado.

Ressalva: o texto acima é da edição 2016 do guia. Desde março de 2023 vale o
Guia Geral MPS de Software:2023 (https://softex.br/download/guia-geral-mps-de-software2023/),
que não pude ler; antes de citar a numeração exata dos resultados no TCC,
confira nessa edição.

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
| Análise preditiva de exposição (notas iniciais) | Parcial | O ML recomenda o *plano* a partir das notas; sugerir as notas a partir de histórico real de projetos exige dados que o sistema ainda não tem. Trabalho futuro. |
| Recalcular exposição conforme o andamento do projeto | Trabalho futuro | Depende de dados de progresso do projeto. |
| Monitoramento ativo de gatilhos (ClickUp/GitLab) | Trabalho futuro | Exige integração com APIs externas. O campo `gatilho` já guarda o indicador a monitorar. |

## Como aparece na interface

* **Novo risco**: formulário com os campos acima; um painel de IA reage
  enquanto o gerente digita (área sugerida, risco parecido, alertas de
  coerência com botão "Aplicar nota") e o botão "Sugerir com IA" preenche
  mitigação, contingência e gatilho.
* **Detalhe do risco**: cartão "Registro do risco" editável
  (`PATCH /riscos/{id}/tratamento`).
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
assistente). Suíte total: 162 testes.
