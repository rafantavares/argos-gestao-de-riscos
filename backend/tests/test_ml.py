"""Testes do módulo de ML: geração do dataset sintético e pré-processamento.

Não treinam modelo (GridSearchCV levaria ~1 minuto). O foco é garantir as
propriedades que a avaliação técnica do TCC afirma sobre o dataset:
reprodutibilidade, balanceamento por categoria, consistência entre o rótulo
gerado e o catálogo de planos semeado no banco, e as regras de negócio que
definem o nível de severidade.
"""
import pandas as pd
import pytest

from app.core.seed import PLANOS_INICIAIS
from app.ml.gerar_dataset import (
    CATEGORIAS,
    EXEMPLOS_POR_CATEGORIA,
    FASES,
    IMPACTOS,
    ORCAMENTOS,
    PROBABILIDADES,
    TAXA_RUIDO,
    URGENCIAS,
    gerar_linhas,
    nivel_do_plano,
    nivel_severidade,
    plano_canonico,
)
from app.ml.preprocessor import (
    COLUNA_ALVO,
    COLUNAS_FEATURES,
    criar_pre_processador,
    separar_features_alvo,
)


@pytest.mark.parametrize(
    "categoria, probabilidade, impacto, orcamento, urgencia, fase, esperado",
    [
        # Exposição base (probabilidade x impacto, 1-25), sem modificadores.
        ("pessoal", 1, 2, "medio", "media", "planejamento", 0),
        ("pessoal", 2, 5, "medio", "media", "planejamento", 0),  # 10: limite do Leve
        ("pessoal", 3, 4, "medio", "media", "planejamento", 1),  # 12: Moderado
        ("pessoal", 3, 5, "medio", "media", "planejamento", 1),  # 15: limite do Moderado
        ("pessoal", 4, 4, "medio", "media", "planejamento", 2),  # 16: Grave
        ("pessoal", 5, 5, "medio", "media", "planejamento", 2),  # 25: Muito Grave
        # Agravante temporal: urgência alta em execução sobe um nível.
        ("pessoal", 3, 4, "medio", "alta", "execucao", 2),
        # Atenuante: baixo custo ainda na iniciação desce um nível.
        ("pessoal", 3, 4, "baixo", "media", "iniciacao", 0),
        # Regra técnica: probabilidade e impacto >= 4 é sempre nível alto.
        ("tecnico", 4, 4, "baixo", "baixa", "iniciacao", 2),
        # Regra externa: impacto >= 4 + urgência alta é resposta emergencial.
        ("externo", 2, 4, "baixo", "alta", "iniciacao", 2),
    ],
)
def test_regras_de_negocio_do_nivel_de_severidade(
    categoria, probabilidade, impacto, orcamento, urgencia, fase, esperado
):
    assert nivel_severidade(categoria, probabilidade, impacto, orcamento, urgencia, fase) == esperado


def test_dataset_tem_300_registros_balanceados_por_categoria():
    linhas = gerar_linhas()
    df = pd.DataFrame(linhas)

    assert len(linhas) == 300
    assert df["categoria"].value_counts().to_dict() == {
        categoria: EXEMPLOS_POR_CATEGORIA for categoria in CATEGORIAS
    }


def test_dataset_nao_repete_combinacoes_dentro_da_categoria():
    linhas = gerar_linhas()

    combinacoes = {
        (l["categoria"], l["probabilidade"], l["impacto"], l["orcamento_impacto"], l["urgencia"], l["fase_projeto"])
        for l in linhas
    }

    assert len(combinacoes) == len(linhas)


def test_geracao_do_dataset_e_reprodutivel():
    """Semente fixa: rodar duas vezes produz exatamente o mesmo dataset."""
    assert gerar_linhas() == gerar_linhas()


def test_rotulos_do_dataset_respeitam_a_categoria_do_risco():
    """O plano rotulado deve sempre pertencer à categoria do risco -- mesmo nos
    exemplos com ruído, que trocam o nível de severidade, nunca a categoria."""
    categoria_do_plano = {p["id"]: p["categoria"].value for p in PLANOS_INICIAIS}

    for linha in gerar_linhas():
        assert categoria_do_plano[linha["id_plano_contingencia"]] == linha["categoria"]


def test_nivel_e_plano_sao_consistentes_em_todas_as_linhas():
    for linha in gerar_linhas():
        assert plano_canonico(linha["categoria"], linha["nivel_severidade"]) == linha["id_plano_contingencia"]
        assert nivel_do_plano(linha["categoria"], linha["id_plano_contingencia"]) == linha["nivel_severidade"]


def test_plano_canonico_bate_com_o_catalogo_semeado():
    """Guarda contra um risco real: se app/core/seed.py mudar de ordem, os
    rótulos do dataset passariam a apontar para planos de outra categoria."""
    categoria_do_plano = {p["id"]: p["categoria"].value for p in PLANOS_INICIAIS}

    for categoria in CATEGORIAS:
        for nivel in (0, 1, 2):
            id_plano = plano_canonico(categoria, nivel)
            assert categoria_do_plano[id_plano] == categoria


def test_nivel_do_plano_fora_do_catalogo_e_none():
    """Planos cadastrados depois pelo admin (id > 12) não viram exemplo de treino."""
    assert nivel_do_plano("tecnico", 99) is None
    assert nivel_do_plano("tecnico", 4) is None  # plano organizacional


def test_dataset_tem_ruido_controlado():
    """~TAXA_RUIDO dos exemplos devem divergir do nível canônico -- sem esse
    ruído o problema seria trivial e não haveria o que comparar entre os algoritmos."""
    linhas = gerar_linhas()

    divergentes = [
        l
        for l in linhas
        if l["nivel_severidade"]
        != nivel_severidade(
            l["categoria"],
            l["probabilidade"],
            l["impacto"],
            l["orcamento_impacto"],
            l["urgencia"],
            l["fase_projeto"],
        )
    ]

    proporcao = len(divergentes) / len(linhas)
    assert TAXA_RUIDO - 0.04 < proporcao < TAXA_RUIDO + 0.04


def test_separar_features_alvo_usa_as_seis_features():
    df = pd.DataFrame(gerar_linhas())

    features, alvo = separar_features_alvo(df)

    assert list(features.columns) == COLUNAS_FEATURES
    assert len(COLUNAS_FEATURES) == 6
    assert "fase_projeto" in COLUNAS_FEATURES
    assert alvo.name == COLUNA_ALVO == "nivel_severidade"


def test_pre_processador_preserva_a_ordem_das_variaveis_ordinais():
    """Notas 1 < ... < 5, baixo < médio < alto (e iniciação < ... < encerramento)
    precisam virar 0 < 1 < ...: a ordem carrega o significado de severidade/tempo
    e não pode ser tratada como categoria nominal."""
    df = pd.DataFrame(
        [
            {
                "categoria": "tecnico",
                "probabilidade": 1,
                "impacto": 1,
                "orcamento_impacto": "baixo",
                "urgencia": "baixa",
                "fase_projeto": "iniciacao",
            },
            {
                "categoria": "tecnico",
                "probabilidade": 5,
                "impacto": 5,
                "orcamento_impacto": "alto",
                "urgencia": "alta",
                "fase_projeto": "encerramento",
            },
        ]
    )

    transformado = criar_pre_processador().fit_transform(df[COLUNAS_FEATURES])

    # As 5 últimas colunas são as ordinais (as primeiras são o one-hot da categoria).
    assert list(transformado[0][-5:]) == [0.0, 0.0, 0.0, 0.0, 0.0]
    assert list(transformado[1][-5:]) == [4.0, 4.0, 2.0, 2.0, 3.0]


def test_categoria_desconhecida_nao_quebra_o_pre_processador():
    """handle_unknown='ignore': categoria nova não derruba a predição."""
    treino = pd.DataFrame(gerar_linhas())[COLUNAS_FEATURES]
    pre_processador = criar_pre_processador().fit(treino)

    entrada_nova = pd.DataFrame(
        [
            {
                "categoria": "categoria-inexistente",
                "probabilidade": 3,
                "impacto": 3,
                "orcamento_impacto": "medio",
                "urgencia": "media",
                "fase_projeto": "execucao",
            }
        ]
    )

    assert pre_processador.transform(entrada_nova).shape[0] == 1


def test_niveis_declarados_no_gerador_sao_os_esperados():
    assert PROBABILIDADES == [1, 2, 3, 4, 5]
    assert IMPACTOS == [1, 2, 3, 4, 5]
    assert ORCAMENTOS == ["baixo", "medio", "alto"]
    assert URGENCIAS == ["baixa", "media", "alta"]
    assert FASES == ["iniciacao", "planejamento", "execucao", "encerramento"]
