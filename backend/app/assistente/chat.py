"""Instruções e contexto do chat do assistente de riscos.

O modelo de linguagem recebe, além da conversa, o contexto do projeto: os
riscos já registrados (com notas, exposição e tratamento), as escalas e faixas
usadas no registro e o catálogo de planos de contingência. Assim ele sugere
dentro do mesmo vocabulário do sistema (MR-MPS-SW:2023 / PMBOK) e consegue
apontar riscos parecidos. O assistente só sugere; quem registra é o gerente."""
from typing import List

from app.core.exposicao import (
    FAIXAS_EXPOSICAO,
    ROTULOS_IMPACTO,
    ROTULOS_PROBABILIDADE,
    avaliacao_exposicao,
    pontuacao_exposicao,
)
from app.models.enums import AreaAfetada

ROTULOS_AREA = {
    AreaAfetada.CRONOGRAMA: "Cronograma",
    AreaAfetada.CUSTO: "Custo",
    AreaAfetada.ESCOPO: "Escopo",
    AreaAfetada.QUALIDADE: "Qualidade",
    AreaAfetada.SEGURANCA_INFORMACAO: "Segurança da informação",
    AreaAfetada.INFRAESTRUTURA: "Infraestrutura",
    AreaAfetada.USABILIDADE: "Usabilidade",
    AreaAfetada.EQUIPE: "Equipe",
    AreaAfetada.FORNECEDORES: "Fornecedores",
    AreaAfetada.LEGAL_REGULATORIO: "Legal e regulatório",
}
MAXIMO_RISCOS_NO_CONTEXTO = 40
LIMITE_TEXTO = 240

INSTRUCOES_BASE = """Você é o assistente de gestão de riscos de um sistema usado por gerentes de projetos de TI.
O gerente descreve um problema ou uma preocupação do projeto e você ajuda a transformá-lo num risco bem
registrado e a pensar no tratamento, seguindo o PMBOK e o MR-MPS-SW:2023 (resultados GPR 10, 10+ e 17).

Como responder:
- Escreva em português do Brasil, de forma direta e prática, como um colega experiente em gestão de riscos.
- Quando o gerente descrever um problema, proponha: um título curto para o risco; a área afetada (uma das
  áreas listadas abaixo); a descrição do impacto; notas de impacto e de probabilidade de 1 a 5, com a
  exposição resultante e uma justificativa curta; uma ação de mitigação (preventiva); uma de contingência
  (reativa, se o risco ocorrer); e um gatilho (sinal que indica a hora de acionar a contingência).
- Se faltar informação para avaliar, faça no máximo duas perguntas objetivas antes de propor.
- Se o problema se parecer com um risco já registrado no projeto, diga qual (pelo índice, ex.: R03) e sugira
  reavaliar esse risco em vez de cadastrar outro.
- Quando um plano do catálogo servir, cite-o.
- Deixe claro que são sugestões: a decisão e o cadastro são do gerente, no formulário "Novo risco" do sistema.
- Use listas curtas com "- " e destaque com **negrito** apenas os rótulos. Não use tabelas nem títulos com #.
- Não invente dados do projeto que não estejam no contexto. Se a pergunta fugir de gestão de projetos e
  riscos, responda brevemente e retome o assunto."""


def _resumir(texto: str) -> str:
    texto = " ".join((texto or "").split())
    return texto if len(texto) <= LIMITE_TEXTO else texto[: LIMITE_TEXTO - 1] + "…"


def montar_instrucoes(projeto, riscos: List, planos: List) -> str:
    escalas = "\n".join(
        [
            "Impacto: " + "; ".join(f"{n} = {r}" for n, r in ROTULOS_IMPACTO.items()),
            "Probabilidade: " + "; ".join(f"{n} = {r}" for n, r in ROTULOS_PROBABILIDADE.items()),
            "Exposição = impacto × probabilidade (1 a 25), faixas: "
            + "; ".join(
                f"{rotulo} até {limite}" for limite, rotulo in FAIXAS_EXPOSICAO
            ),
            "Áreas afetadas: " + ", ".join(ROTULOS_AREA.values()),
        ]
    )

    ordenados = sorted(
        riscos, key=lambda r: pontuacao_exposicao(r.probabilidade, r.impacto), reverse=True
    )[:MAXIMO_RISCOS_NO_CONTEXTO]
    linhas_riscos = []
    for r in ordenados:
        exposicao = pontuacao_exposicao(r.probabilidade, r.impacto)
        linha = (
            f"- {r.indice} | {r.titulo} | área: {ROTULOS_AREA.get(AreaAfetada(r.area_afetada), r.area_afetada)}"
            f" | P{r.probabilidade} × I{r.impacto} = {exposicao} ({avaliacao_exposicao(exposicao)})"
            f" | status: {r.status.value} | impacto: {_resumir(r.descricao_impacto)}"
        )
        if r.mitigacao:
            linha += f" | mitigação: {_resumir(r.mitigacao)}"
        if r.contingencia:
            linha += f" | contingência: {_resumir(r.contingencia)}"
        linhas_riscos.append(linha)

    linhas_planos = [
        f"- [{p.categoria.value}, probabilidade {p.probabilidade.value}, impacto {p.impacto.value}] "
        f"{_resumir(p.descricao)}"
        for p in planos
    ]

    return "\n\n".join(
        [
            INSTRUCOES_BASE,
            f"PROJETO: {projeto.nome}" + (f" — {_resumir(projeto.descricao)}" if projeto.descricao else ""),
            "ESCALAS DO REGISTRO DE RISCOS:\n" + escalas,
            "RISCOS JÁ REGISTRADOS NO PROJETO (mais expostos primeiro):\n"
            + ("\n".join(linhas_riscos) if linhas_riscos else "- nenhum risco registrado ainda"),
            "CATÁLOGO DE PLANOS DE CONTINGÊNCIA (grupo PMBOK, situação típica, plano):\n"
            + ("\n".join(linhas_planos) if linhas_planos else "- catálogo vazio"),
        ]
    )
