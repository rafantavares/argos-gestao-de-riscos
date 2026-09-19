"""Gerador do dataset sintético usado para treinar o módulo de ML.

Alvo do modelo: o **nível de severidade** da resposta (0 = baixo, 1 = médio,
2 = alto). O plano de contingência recomendado é derivado desse nível junto
com a categoria do risco (cada categoria tem 3 planos, um por nível, na mesma
correspondência de app/core/seed.py -- ex.: "tecnico" -> plano 1 = baixo,
plano 2 = médio, plano 3 = alto). O CSV guarda as duas colunas: o alvo
(nivel_severidade) e o plano derivado (id_plano_contingencia), para
rastreabilidade.

Por que o alvo é o nível e não o id do plano: com 12 classes (uma por plano)
o modelo precisaria aprender a mesma regra de negócio 4 vezes (uma por
categoria) com apenas 75 exemplos cada, o que limita a acurácia a ~80% com
300 registros. Com 3 classes a regra é compartilhada entre as categorias, e a
categoria continua sendo uma feature (regras específicas por categoria são
aprendidas normalmente).

Regras de negócio que definem o nível canônico:

1. Exposição base (registro MR-MPS-SW/PMBOK): probabilidade x impacto (escalas
   de 1 a 5, produto de 1 a 25) define o nível inicial: Muito Leve/Leve
   (1-10) = baixo, Moderado (11-15) = médio, Grave/Muito Grave (16-25) = alto
   -- é a mesma leitura da matriz de risco visual do frontend.
2. Agravante temporal: urgência alta em risco descoberto tarde (execução ou
   encerramento) sobe um nível -- há pouco tempo de reação.
3. Atenuante: risco de baixa exposição financeira identificado ainda na
   iniciação desce um nível -- o replanejamento é barato nesse momento.
4. Regras específicas por categoria:
   - técnico com probabilidade >= 4 e impacto >= 4 -> nível alto (substituir
     a tecnologia/arquitetura);
   - externo com impacto >= 4 e urgência alta -> nível alto (resposta
     emergencial contratual).

Amostragem: o espaço tem 4 x 5^2 x 3^2 x 4 = 3600 combinações; o dataset sorteia
EXEMPLOS_POR_CATEGORIA combinações distintas por categoria (distribuição
balanceada entre as 4 categorias do PMBOK), totalizando 300 registros.

Ruído controlado: TAXA_RUIDO dos exemplos recebem, de propósito, o nível
vizinho ao canônico -- simulando que gerentes reais nem sempre escolheriam o
plano "de livro". Sem esse ruído o problema seria trivial (~100% de acerto) e
não haveria motivo para comparar KNN, Árvore de Decisão e Random Forest.

Reprodutibilidade: random.Random(SEMENTE) com semente fixa -- rodar este
script sempre gera o mesmo dataset.csv, byte a byte.

Uso:
    python -m app.ml.gerar_dataset
"""
import csv
import random
from itertools import product
from pathlib import Path

from app.core.exposicao import nivel_exposicao, pontuacao_exposicao

SEMENTE = 42
EXEMPLOS_POR_CATEGORIA = 75
TAXA_RUIDO = 0.08

CAMINHO_SAIDA = Path(__file__).parent / "dataset.csv"

CATEGORIAS = ["tecnico", "organizacional", "externo", "pessoal"]
PROBABILIDADES = [1, 2, 3, 4, 5]
IMPACTOS = [1, 2, 3, 4, 5]
ORCAMENTOS = ["baixo", "medio", "alto"]
URGENCIAS = ["baixa", "media", "alta"]
FASES = ["iniciacao", "planejamento", "execucao", "encerramento"]

NIVEIS_SEVERIDADE = ("baixo", "medio", "alto")

# Id do plano de nível "baixo" de cada categoria (mesma ordem de app/core/seed.py).
# O plano "médio" é PLANO_BASE + 1 e o "alto" é PLANO_BASE + 2.
PLANO_BASE_POR_CATEGORIA = {
    "tecnico": 1,
    "organizacional": 4,
    "externo": 7,
    "pessoal": 10,
}


def exposicao_base(probabilidade: int, impacto: int) -> int:
    """Exposição (probabilidade x impacto, 1-25) em 3 níveis: 1-10 baixo,
    11-15 médio, 16-25 alto (mesmas faixas de app/core/exposicao.py)."""
    return nivel_exposicao(pontuacao_exposicao(probabilidade, impacto))


def nivel_severidade(
    categoria: str,
    probabilidade: int,
    impacto: int,
    orcamento: str,
    urgencia: str,
    fase: str,
) -> int:
    """0 = baixo, 1 = médio, 2 = alto -- aplica as regras de negócio descritas
    no cabeçalho do módulo."""
    nivel = exposicao_base(probabilidade, impacto)

    # Agravante temporal: urgência alta com o projeto já em execução/encerramento.
    if fase in ("execucao", "encerramento") and urgencia == "alta":
        nivel += 1
    # Atenuante: baixo custo e ainda na iniciação, quando replanejar é barato.
    if fase == "iniciacao" and orcamento == "baixo":
        nivel -= 1
    nivel = max(0, min(2, nivel))

    # Regras específicas por categoria.
    if categoria == "tecnico" and probabilidade >= 4 and impacto >= 4:
        # Falha técnica quase certa e grave: substituir a tecnologia/arquitetura.
        nivel = 2
    if categoria == "externo" and impacto >= 4 and urgencia == "alta":
        # Fornecedor/mercado prestes a falhar com impacto alto: resposta emergencial.
        nivel = 2

    return nivel


def plano_canonico(categoria: str, tier: int) -> int:
    return PLANO_BASE_POR_CATEGORIA[categoria] + tier


def nivel_do_plano(categoria: str, id_plano: int):
    """Inverso de plano_canonico: devolve o nível (0-2) de um plano do catálogo
    base, ou None se o plano não pertence ao catálogo dessa categoria."""
    tier = id_plano - PLANO_BASE_POR_CATEGORIA[categoria]
    return tier if 0 <= tier <= 2 else None


CAMPOS_CSV = [
    "categoria",
    "probabilidade",
    "impacto",
    "orcamento_impacto",
    "urgencia",
    "fase_projeto",
    "nivel_severidade",
    "id_plano_contingencia",
]


def gerar_linhas() -> list[dict]:
    aleatorio = random.Random(SEMENTE)
    linhas = []

    for categoria in CATEGORIAS:
        combinacoes = list(product(PROBABILIDADES, IMPACTOS, ORCAMENTOS, URGENCIAS, FASES))
        amostra = aleatorio.sample(combinacoes, EXEMPLOS_POR_CATEGORIA)

        for probabilidade, impacto, orcamento, urgencia, fase in amostra:
            tier = nivel_severidade(categoria, probabilidade, impacto, orcamento, urgencia, fase)
            vizinhos_validos = [t for t in (tier - 1, tier + 1) if 0 <= t <= 2]

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
                    "fase_projeto": fase,
                    "nivel_severidade": tier_escolhido,
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
