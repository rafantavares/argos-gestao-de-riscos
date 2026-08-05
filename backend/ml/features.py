from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder

PROBABILIDADE_ORDEM = ["baixa", "media", "alta"]
IMPACTO_ORDEM = ["baixo", "medio", "alto"]

COLUNAS_FEATURES = ["categoria", "probabilidade", "impacto"]
COLUNA_ALVO = "plano_contingencia"


def construir_preprocessador() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("categoria", OneHotEncoder(handle_unknown="ignore", sparse_output=False), ["categoria"]),
            (
                "ordinal",
                OrdinalEncoder(categories=[PROBABILIDADE_ORDEM, IMPACTO_ORDEM]),
                ["probabilidade", "impacto"],
            ),
        ]
    )
