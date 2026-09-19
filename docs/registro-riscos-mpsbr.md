# Registro de riscos no formato PMBOK / MR-MPS-SW (fase 6)

A orientadora sugeriu alinhar o cadastro de riscos, além do PMBOK, ao processo
de **Gerência de Riscos (GRI)** do MR-MPS-SW (MPS.BR), que é o modelo de
qualidade de software auditado nas empresas certificadas. O registro passou a
ter os mesmos atributos usados na prática dela. (Conferir o nível e os
resultados esperados do GRI no Guia Geral MPS.BR de Software antes de citar no
texto do TCC.)

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
