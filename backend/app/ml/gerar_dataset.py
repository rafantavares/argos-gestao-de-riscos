"""Gerador do dataset sintético usado para treinar o módulo de ML.

Regra determinística: cada risco tem um "plano canônico", definido pelo
nível de severidade (baixo/médio/alto) calculado a partir de 4 dimensões --
probabilidade, impacto, orcamento_impacto (exposição financeira) e urgencia
(proximidade temporal). Para cada categoria existem 3 planos de contingência
(um por nível de severidade), na mesma correspondência definida em
app/core/seed.py (ex.: categoria "tecnico" -> plano 1 = baixo, plano 2 =
médio, plano 3 = alto).

Nota: essa fórmula de severidade é só do gerador de dataset (dimensão
ampliada de propósito, pra dar mais espaço combinatório ao ML). A matriz de
risco visual do frontend (frontend/src/constants.js -> nivelSeveridade)
continua 2D (só probabilidade x impacto) -- é o padrão PMBOK e não deve
mudar.

Ruído controlado: TAXA_RUIDO (15%) dos exemplos recebem, de propósito, o
plano de um nível de severidade vizinho em vez do canônico -- simulando que
gerentes reais nem sempre escolheriam o plano "de livro". Sem esse ruído o
problema seria trivial (qualquer algoritmo acertaria ~100%) e não haveria
motivo para comparar KNN, Árvore de Decisão e Random Forest.

Reprodutibilidade: random.Random(SEMENTE) com semente fixa -- rodar este
script sempre gera o mesmo dataset.csv, byte a byte.

Uso:
    python -m app.ml.gerar_dataset
"""
import csv
import random
from itertools import product
from pathlib import Path

SEMENTE = 42
EXEMPLOS_POR_COMBINACAO = 4
TAXA_RUIDO = 0.15

CAMINHO_SAIDA = Path(__file__).parent / "dataset.csv"

CATEGORIAS = ["tecnico", "organizacional", "externo", "pessoal"]
PROBABILIDADES = ["baixa", "media", "alta"]
IMPACTOS = ["baixo", "medio", "alto"]
ORCAMENTOS = ["baixo", "medio", "alto"]
URGENCIAS = ["baixa", "media", "alta"]

ESCALA_PROBABILIDADE = {"baixa": 1, "media": 2, "alta": 3}
ESCALA_IMPACTO = {"baixo": 1, "medio": 2, "alto": 3}
ESCALA_ORCAMENTO = {"baixo": 1, "medio": 2, "alto": 3}
ESCALA_URGENCIA = {"baixa": 1, "media": 2, "alta": 3}

# Id do plano de nível "baixo" de cada categoria (mesma ordem de app/core/seed.py).
# O plano "médio" é PLANO_BASE + 1 e o "alto" é PLANO_BASE + 2.
PLANO_BASE_POR_CATEGORIA = {
    "tecnico": 1,
    "organizacional": 4,
    "externo": 7,
    "pessoal": 10,
}


def nivel_severidade(probabilidade: str, impacto: str, orcamento: str, urgencia: str) -> int:
    """0 = baixo, 1 = médio, 2 = alto. Soma as 4 escalas (range 4-12) -- os
    limiares dividem a distribuição em 3 faixas com a mesma lógica da versão
    original de 2 dimensões (moda no meio da distribuição)."""
    pontuacao = (
        ESCALA_PROBABILIDADE[probabilidade]
        + ESCALA_IMPACTO[impacto]
        + ESCALA_ORCAMENTO[orcamento]
        + ESCALA_URGENCIA[urgencia]
    )
    if pontuacao <= 6:
        return 0
    if pontuacao <= 9:
        return 1
    return 2


def plano_canonico(categoria: str, tier: int) -> int:
    return PLANO_BASE_POR_CATEGORIA[categoria] + tier


CAMPOS_CSV = [
    "categoria",
    "probabilidade",
    "impacto",
    "orcamento_impacto",
    "urgencia",
    "id_plano_contingencia",
]


def gerar_linhas() -> list[dict]:
    aleatorio = random.Random(SEMENTE)
    linhas = []

    combinacoes = product(CATEGORIAS, PROBABILIDADES, IMPACTOS, ORCAMENTOS, URGENCIAS)
    for categoria, probabilidade, impacto, orcamento, urgencia in combinacoes:
        tier = nivel_severidade(probabilidade, impacto, orcamento, urgencia)
        vizinhos_validos = [t for t in (tier - 1, tier + 1) if 0 <= t <= 2]

        for _ in range(EXEMPLOS_POR_COMBINACAO):
            if aleatorio.random() < TAXA_RUIDO:
                tier_escolhido = aleatorio.choice(vizinhos_validos)
            else:
                tier_escolhido = tier

            linhas.append(
                {
                    "categoria": categoria,
                    "probabilidade": probabilidade,
                    "impacto": impacto,
                    "orcamento_impacto": orcamento,
                    "urgencia": urgencia,
                    "id_plano_contingencia": plano_canonico(categoria, tier_escolhido),
                }
            )

    aleatorio.shuffle(linhas)
    return linhas


def main() -> None:
    linhas = gerar_linhas()
    with open(CAMINHO_SAIDA, "w", newline="", encoding="utf-8") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=CAMPOS_CSV)
        escritor.writeheader()
        escritor.writerows(linhas)
    print(f"{len(linhas)} exemplos gerados em {CAMINHO_SAIDA}")


if __name__ == "__main__":
    main()
