"""Pré-processamento dos dados usados pelo módulo de ML.

categoria é nominal (sem ordem) -> one-hot encoding.
probabilidade, impacto, orcamento_impacto e urgencia são ordinais
(baixa/baixo < média/médio < alta/alto) -> encoding ordinal, preservando a
ordem natural das categorias do PMBOK.
"""
from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder

CAMINHO_DATASET_PADRAO = Path(__file__).parent / "dataset.csv"

COLUNA_CATEGORIA = "categoria"
COLUNA_PROBABILIDADE = "probabilidade"
COLUNA_IMPACTO = "impacto"
COLUNA_ORCAMENTO = "orcamento_impacto"
COLUNA_URGENCIA = "urgencia"
COLUNA_ALVO = "id_plano_contingencia"

COLUNAS_FEATURES = [
    COLUNA_CATEGORIA,
    COLUNA_PROBABILIDADE,
    COLUNA_IMPACTO,
    COLUNA_ORCAMENTO,
    COLUNA_URGENCIA,
]

ORDEM_PROBABILIDADE = ["baixa", "media", "alta"]
ORDEM_IMPACTO = ["baixo", "medio", "alto"]
ORDEM_ORCAMENTO = ["baixo", "medio", "alto"]
ORDEM_URGENCIA = ["baixa", "media", "alta"]


def carregar_dataset(caminho: Path = CAMINHO_DATASET_PADRAO) -> pd.DataFrame:
    return pd.read_csv(caminho)


def separar_features_alvo(df: pd.DataFrame):
    features = df[COLUNAS_FEATURES]
    alvo = df[COLUNA_ALVO]
    return features, alvo


def criar_pre_processador() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("categoria", OneHotEncoder(handle_unknown="ignore"), [COLUNA_CATEGORIA]),
            (
                "ordinais",
                OrdinalEncoder(
                    categories=[
                        ORDEM_PROBABILIDADE,
                        ORDEM_IMPACTO,
                        ORDEM_ORCAMENTO,
                        ORDEM_URGENCIA,
                    ]
                ),
                [COLUNA_PROBABILIDADE, COLUNA_IMPACTO, COLUNA_ORCAMENTO, COLUNA_URGENCIA],
            ),
        ]
    )
