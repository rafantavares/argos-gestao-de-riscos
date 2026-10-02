# Chat com o assistente de IA (fase 8)

Pedido da orientadora (2026-10-01): uma aba na barra lateral que abre um chat em
que o gerente descreve um problema e a IA sugere como registrar e tratar o risco.

## Como funciona

* **Frontend** (`frontend/src/pages/gerente/Assistente.jsx`, rota
  `/gerente/assistente`): página própria "Assistente IA" na barra lateral do
  gerente, no mesmo padrão das outras (título, seletor de projeto e "Nova
  conversa"). A conversa ocupa a área principal numa coluna de leitura, com
  sugestões de pergunta, Enter para enviar e aviso de que as sugestões são
  geradas por IA. A conversa fica no `sessionStorage` (uma por projeto), então
  não se perde ao trocar de página. (A primeira versão era um painel lateral
  sobreposto; virou página em 2026-10-01 a pedido do Rafael.)
* **Backend** (`POST /chat`, `app/routers/chat.py`): recebe a conversa inteira
  (o servidor não guarda histórico) e responde com a sugestão. Exige gerente
  vinculado ao projeto.
* **Contexto** (`app/assistente/chat.py`): as instruções do modelo incluem o
  projeto, os riscos já registrados (até 40, mais expostos primeiro, com notas,
  exposição, status, mitigação e contingência), as escalas 1–5, as faixas de
  exposição, as 10 áreas afetadas e o catálogo de planos ativos. Assim o modelo
  sugere no vocabulário do sistema e aponta riscos parecidos (ex.: "reavalie o
  R03 em vez de cadastrar outro").
* **Provedor** (`app/assistente/llm.py`): Google Gemini via SDK `google-genai`.
  Todo o acesso ao provedor fica nesse arquivo; trocar de provedor (ex.: Claude)
  muda só ele. Sem `GEMINI_API_KEY` o endpoint responde 503 com mensagem clara;
  falhas do provedor (limite de uso, rede) viram 502.
* **Plano B entre modelos:** se o modelo principal estiver sobrecarregado (503),
  no limite (429), com erro interno ou passar de 30 s, a mesma pergunta vai na
  hora para o próximo modelo de `GEMINI_MODELOS_RESERVA`. Nos testes reais de
  2026-10-01 isso aconteceu: `gemini-flash-latest` deu 503, `gemini-2.5-flash`
  deu 504 e o terceiro respondeu — o gerente recebeu a resposta (≈49 s) em vez
  de um erro. Respostas normais levaram de 6 a 20 s.

## Configuração

| Variável | Onde | Observação |
|---|---|---|
| `GEMINI_API_KEY` | `backend/.env` e variáveis de ambiente do Render | Chave do Google AI Studio (nível gratuito) ou de um projeto com créditos do Google Cloud. Nunca versionar. |
| `GEMINI_MODEL` | opcional | Padrão `gemini-flash-latest`. |
| `GEMINI_MODELOS_RESERVA` | opcional | Padrão `gemini-2.5-flash,gemini-flash-lite-latest` (tentados em ordem). |

No nível gratuito do Gemini o Google pode usar o conteúdo enviado para melhorar
seus produtos; o sistema só tem dados de teste, mas numa empresa real seria
preciso o nível pago.

## Relação com o restante do sistema

O chat **complementa** o modelo de ML (Árvore de Decisão / Random Forest / KNN),
que continua recomendando o plano de contingência de forma mensurável. O chat é
apoio conversacional para descrever e refinar o risco; ele não grava nada — o
registro continua no formulário "Novo risco", revisado pelo gerente (apoio à
decisão, não substituição). Atende ao MR-MPS-SW:2023 GPR 10 (identificar e
documentar) e GPR 10+ (tratamento com mitigação e contingência).

## Testes

`backend/tests/test_chat.py` (13 testes, provedor simulado — sem rede nem
chave): contexto com os riscos do projeto, envio da conversa inteira, validação
da última mensagem, permissões, 503 sem chave, 502 em falha do provedor e o
plano B entre modelos (troca em 503/429, não troca em erro 400, lista sem
repetidos).

## Avaliação com o modelo real (2026-10-01, dados do "Projeto Teste")

| Cenário | Resultado |
|---|---|
| Problema novo ("servidor de homologação vive caindo") | Proposta completa no vocabulário do sistema: área Infraestrutura, P4 × I3 = 12 (Moderado), mitigação, contingência e gatilho; verificou que não havia risco igual. |
| Problema parecido com risco existente ("stakeholders não respondem") | Apontou o **R01** ("Falha de comunicação com stakeholders") e sugeriu reavaliá-lo; usou um plano do catálogo na contingência. |
| Continuação ("o servidor é do cliente e não temos acesso") | Manteve o contexto e reclassificou para Fornecedores, P4 × I4 = 16 (Grave). |

Ao adicionar o SDK foi preciso subir `pydantic` para 2.13.5 e, nos testes,
`httpx` para 0.28.1 (exigência do `google-genai`); a suíte inteira continua
passando.
