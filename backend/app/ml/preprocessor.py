"""Pré-processamento dos dados usados pelo módulo de ML.

categoria é nominal (sem ordem) -> one-hot encoding.
probabilidade e impacto são notas ordinais de 1 a 5; orcamento_impacto,
urgencia e fase_projeto também são ordinais (baixo < médio < alto; iniciação <
planejamento < execução < encerramento) -> encoding ordinal, preservando a
ordem natural das categorias do PMBOK.

Alvo: nivel_severidade (0 = baixo, 1 = médio, 2 = alto) -- ver
app/ml/gerar_dataset.py para a justificativa.
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
COLUNA_FASE = "fase_projeto"
COLUNA_ALVO = "nivel_severidade"

COLUNAS_ORDINAIS = [
    COLUNA_PROBABILIDADE,
    COLUNA_IMPACTO,
    COLUNA_ORCAMENTO,
    COLUNA_URGENCIA,
    COLUNA_FASE,
]

COLUNAS_FEATURES = [COLUNA_CATEGORIA, *COLUNAS_ORDINAIS]

ORDEM_PROBABILIDADE = [1, 2, 3, 4, 5]
ORDEM_IMPACTO = [1, 2, 3, 4, 5]
ORDEM_ORCAMENTO = ["baixo", "medio", "alto"]
ORDEM_URGENCIA = ["baixa", "media", "alta"]
ORDEM_FASE = ["iniciacao", "planejamento", "execucao", "encerramento"]

# Rótulos legíveis das features, na ordem de COLUNAS_FEATURES (usados no
# gráfico de importância do painel "Modelo de IA").
ROTULOS_FEATURES = {
    COLUNA_CATEGORIA: "Categoria",
    COLUNA_PROBABILIDADE: "Probabilidade",
    COLUNA_IMPACTO: "Impacto",
    COLUNA_ORCAMENTO: "Orçamento impactado",
    COLUNA_URGENCIA: "Urgência",
    COLUNA_FASE: "Fase do projeto",
}


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
                        ORDEM_FASE,
                    ]
                ),
                COLUNAS_ORDINAIS,
            ),
        ]
    )
