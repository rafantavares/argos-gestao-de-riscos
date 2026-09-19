"""Escalas do registro de riscos (MR-MPS-SW / PMBOK): impacto e probabilidade
de 1 a 5 e exposição = impacto x probabilidade (1 a 25), com cinco faixas."""

ROTULOS_IMPACTO = {1: "Limitado", 2: "Baixo", 3: "Moderado", 4: "Elevado", 5: "Alto"}
ROTULOS_PROBABILIDADE = {
    1: "Quase nula",
    2: "Não provável",
    3: "Provável",
    4: "Muito provável",
    5: "Esperado",
}

# (limite superior da faixa, rótulo da avaliação)
FAIXAS_EXPOSICAO = [
    (3, "Muito Leve"),
    (10, "Leve"),
    (15, "Moderado"),
    (20, "Grave"),
    (25, "Muito Grave"),
]


def pontuacao_exposicao(probabilidade: int, impacto: int) -> int:
    return probabilidade * impacto


def avaliacao_exposicao(pontuacao: int) -> str:
    for limite, rotulo in FAIXAS_EXPOSICAO:
        if pontuacao <= limite:
            return rotulo
    return FAIXAS_EXPOSICAO[-1][1]


def nivel_exposicao(pontuacao: int) -> int:
    """Nível de 3 classes (0 = baixo, 1 = médio, 2 = alto) usado pelo ML e
    pelo catálogo de planos: Muito Leve/Leve -> 0, Moderado -> 1, Grave/Muito
    Grave -> 2."""
    if pontuacao <= 10:
        return 0
    if pontuacao <= 15:
        return 1
    return 2
