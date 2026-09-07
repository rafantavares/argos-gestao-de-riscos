"""Testes do módulo de ML: geração do dataset sintético e pré-processamento.

Não treinam modelo (GridSearchCV levaria ~1 minuto). O foco é garantir as
propriedades que a avaliação técnica do TCC afirma sobre o dataset:
reprodutibilidade, cobertura do espaço de combinações e consistência entre o
rótulo gerado e o catálogo de planos semeado no banco.
"""
import pandas as pd
import pytest

from app.core.seed import PLANOS_INICIAIS
from app.ml.gerar_dataset import (
    CATEGORIAS,
    EXEMPLOS_POR_COMBINACAO,
    IMPACTOS,
    ORCAMENTOS,
    PROBABILIDADES,
    URGENCIAS,
    gerar_linhas,
    nivel_severidade,
    plano_canonico,
)
from app.ml.preprocessor import COLUNAS_FEATURES, criar_pre_processador, separar_features_alvo


@pytest.mark.parametrize(
    "probabilidade, impacto, orcamento, urgencia, esperado",
    [
        ("baixa", "baixo", "baixo", "baixa", 0),  # soma 4 -- mínimo
        ("media", "medio", "baixo", "baixa", 0),  # soma 6 -- limite superior de "baixo"
        ("media", "medio", "medio", "baixa", 1),  # soma 7 -- primeiro "médio"
        ("alta", "alto", "medio", "baixa", 1),  # soma 9 -- limite superior de "médio"
        ("alta", "alto", "alto", "baixa", 2),  # soma 10 -- primeiro "alto"
        ("alta", "alto", "alto", "alta", 2),  # soma 12 -- máximo
    ],
)
def test_nivel_severidade_nos_limiares(probabilidade, impacto, orcamento, urgencia, esperado):
    assert nivel_severidade(probabilidade, impacto, orcamento, urgencia) == esperado


def test_dataset_cobre_todas_as_combinacoes_de_features():
    """324 combinações únicas (4 categorias x 3^4 níveis), conforme a fase 2."""
    linhas = gerar_linhas()

    combinacoes = {
        (l["categoria"], l["probabilidade"], l["impacto"], l["orcamento_impacto"], l["urgencia"])
        for l in linhas
    }

    assert len(combinacoes) == 324
    assert len(linhas) == 324 * EXEMPLOS_POR_COMBINACAO


def test_geracao_do_dataset_e_reprodutivel():
    """Semente fixa: rodar duas vezes produz exatamente o mesmo dataset."""
    assert gerar_linhas() == gerar_linhas()


def test_rotulos_do_dataset_respeitam_a_categoria_do_risco():
    """O plano rotulado deve sempre pertencer à categoria do risco -- mesmo nos
    exemplos com ruído, que trocam o nível de severidade, nunca a categoria."""
    categoria_do_plano = {p["id"]: p["categoria"].value for p in PLANOS_INICIAIS}

    for linha in gerar_linhas():
        assert categoria_do_plano[linha["id_plano_contingencia"]] == linha["categoria"]


def test_plano_canonico_bate_com_o_catalogo_semeado():
    """Guarda contra um risco real: se app/core/seed.py mudar de ordem, os
    rótulos do dataset passariam a apontar para planos de outra categoria."""
    categoria_do_plano = {p["id"]: p["categoria"].value for p in PLANOS_INICIAIS}

    for categoria in CATEGORIAS:
        for nivel in (0, 1, 2):
            id_plano = plano_canonico(categoria, nivel)
            assert categoria_do_plano[id_plano] == categoria


def test_dataset_tem_ruido_controlado():
    """~15% dos exemplos devem divergir do plano canônico -- sem esse ruído o
    problema seria trivial e não haveria o que comparar entre os algoritmos."""
    linhas = gerar_linhas()

    divergentes = [
        l
        for l in linhas
        if l["id_plano_contingencia"]
        != plano_canonico(
            l["categoria"],
            nivel_severidade(
                l["probabilidade"], l["impacto"], l["orcamento_impacto"], l["urgencia"]
            ),
        )
    ]

    proporcao = len(divergentes) / len(linhas)
    assert 0.10 < proporcao < 0.20


def test_separar_features_alvo_usa_as_cinco_features():
    df = pd.DataFrame(gerar_linhas())

    features, alvo = separar_features_alvo(df)

    assert list(features.columns) == COLUNAS_FEATURES
    assert len(COLUNAS_FEATURES) == 5
    assert alvo.name == "id_plano_contingencia"


def test_pre_processador_preserva_a_ordem_das_variaveis_ordinais():
    """baixa < média < alta precisa virar 0 < 1 < 2: a ordem carrega o
    significado de severidade e não pode ser tratada como categoria nominal."""
    df = pd.DataFrame(
        [
            {
                "categoria": "tecnico",
                "probabilidade": "baixa",
                "impacto": "baixo",
                "orcamento_impacto": "baixo",
                "urgencia": "baixa",
            },
            {
                "categoria": "tecnico",
                "probabilidade": "alta",
                "impacto": "alto",
                "orcamento_impacto": "alto",
                "urgencia": "alta",
            },
        ]
    )

    transformado = criar_pre_processador().fit_transform(df[COLUNAS_FEATURES])

    # As 4 últimas colunas são as ordinais (as primeiras são o one-hot da categoria).
    ordinais_baixas = transformado[0][-4:]
    ordinais_altas = transformado[1][-4:]
    assert list(ordinais_baixas) == [0.0, 0.0, 0.0, 0.0]
    assert list(ordinais_altas) == [2.0, 2.0, 2.0, 2.0]


def test_categoria_desconhecida_nao_quebra_o_pre_processador():
    """handle_unknown='ignore': categoria nova não derruba a predição."""
    treino = pd.DataFrame(gerar_linhas())[COLUNAS_FEATURES]
    pre_processador = criar_pre_processador().fit(treino)

    entrada_nova = pd.DataFrame(
        [
            {
                "categoria": "categoria-inexistente",
                "probabilidade": "media",
                "impacto": "medio",
                "orcamento_impacto": "medio",
                "urgencia": "media",
            }
        ]
    )

    assert pre_processador.transform(entrada_nova).shape[0] == 1


def test_niveis_declarados_no_gerador_sao_os_tres_esperados():
    assert PROBABILIDADES == ["baixa", "media", "alta"]
    assert IMPACTOS == ["baixo", "medio", "alto"]
    assert ORCAMENTOS == ["baixo", "medio", "alto"]
    assert URGENCIAS == ["baixa", "media", "alta"]
