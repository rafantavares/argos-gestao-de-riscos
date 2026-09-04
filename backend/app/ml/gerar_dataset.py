"""Gerador do dataset sintético usado para treinar o módulo de ML.

Regra determinística: cada risco tem um "plano canônico", definido pelo
nível de severidade (baixo/médio/alto) calculado a partir de probabilidade
e impacto -- a mesma fórmula usada na matriz de risco do frontend
(frontend/src/constants.js -> nivelSeveridade). Para cada categoria existem
3 planos de contingência (um por nível de severidade), na mesma
correspondência definida em app/core/seed.py (ex.: categoria "tecnico" ->
plano 1 = baixo, plano 2 = médio, plano 3 = alto).

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
from pathlib import Path

SEMENTE = 42
EXEMPLOS_POR_COMBINACAO = 12
TAXA_RUIDO = 0.15

CAMINHO_SAIDA = Path(__file__).parent / "dataset.csv"

CATEGORIAS = ["tecnico", "organizacional", "externo", "pessoal"]
PROBABILIDADES = ["baixa", "media", "alta"]
IMPACTOS = ["baixo", "medio", "alto"]

ESCALA_PROBABILIDADE = {"baixa": 1, "media": 2, "alta": 3}
ESCALA_IMPACTO = {"baixo": 1, "medio": 2, "alto": 3}

# Id do plano de nível "baixo" de cada categoria (mesma ordem de app/core/seed.py).
# O plano "médio" é PLANO_BASE + 1 e o "alto" é PLANO_BASE + 2.
PLANO_BASE_POR_CATEGORIA = {
    "tecnico": 1,
    "organizacional": 4,
    "externo": 7,
    "pessoal": 10,
}


def nivel_severidade(probabilidade: str, impacto: str) -> int:
    """0 = baixo, 1 = médio, 2 = alto -- mesma fórmula de nivelSeveridade no frontend."""
    pontuacao = ESCALA_PROBABILIDADE[probabilidade] + ESCALA_IMPACTO[impacto]
    if pontuacao <= 3:
        return 0
    if pontuacao == 4:
        return 1
    return 2


def plano_canonico(categoria: str, tier: int) -> int:
    return PLANO_BASE_POR_CATEGORIA[categoria] + tier


def gerar_linhas() -> list[dict]:
    aleatorio = random.Random(SEMENTE)
    linhas = []

    for categoria in CATEGORIAS:
        for probabilidade in PROBABILIDADES:
            for impacto in IMPACTOS:
                tier = nivel_severidade(probabilidade, impacto)
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
                            "id_plano_contingencia": plano_canonico(categoria, tier_escolhido),
                        }
                    )

    aleatorio.shuffle(linhas)
    return linhas


def main() -> None:
    linhas = gerar_linhas()
    with open(CAMINHO_SAIDA, "w", newline="", encoding="utf-8") as arquivo:
        escritor = csv.DictWriter(
            arquivo, fieldnames=["categoria", "probabilidade", "impacto", "id_plano_contingencia"]
        )
        escritor.writeheader()
        escritor.writerows(linhas)
    print(f"{len(linhas)} exemplos gerados em {CAMINHO_SAIDA}")


if __name__ == "__main__":
    main()
