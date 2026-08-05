"""Treina e avalia comparativamente KNN, Decision Tree e Random Forest sobre o
dataset semissintético (ml/dataset.csv), prevendo o plano de contingência mais
adequado a partir de (categoria, probabilidade, impacto).

Uso: a partir de backend/, com o venv ativo:
    python -m ml.train
"""

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier

from ml.features import COLUNA_ALVO, COLUNAS_FEATURES, construir_preprocessador

DIR_ML = Path(__file__).parent
CAMINHO_DATASET = DIR_ML / "dataset.csv"
DIR_MODELOS = DIR_ML / "modelos"
CAMINHO_RESULTADOS = DIR_ML / "resultados_avaliacao.json"

ALGORITMOS = {
    "knn": lambda: KNeighborsClassifier(n_neighbors=3),
    "decision_tree": lambda: DecisionTreeClassifier(random_state=42),
    "random_forest": lambda: RandomForestClassifier(n_estimators=200, random_state=42),
}


def carregar_dataset() -> pd.DataFrame:
    return pd.read_csv(CAMINHO_DATASET)


def _montar_pipeline(classificador) -> Pipeline:
    return Pipeline(
        steps=[("preprocessador", construir_preprocessador()), ("classificador", classificador)]
    )


def avaliar_algoritmos(df: pd.DataFrame) -> dict:
    X = df[COLUNAS_FEATURES]
    y = df[COLUNA_ALVO]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    resultados = {}
    for nome, construtor in ALGORITMOS.items():
        pipeline = _montar_pipeline(construtor())
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        resultados[nome] = {
            "acuracia": accuracy_score(y_test, y_pred),
            "precisao": precision_score(y_test, y_pred, average="weighted", zero_division=0),
            "recall": recall_score(y_test, y_pred, average="weighted", zero_division=0),
            "n_treino": len(y_train),
            "n_teste": len(y_test),
        }

    return resultados


def treinar_modelos_finais(df: pd.DataFrame) -> None:
    """Retreina cada algoritmo com 100% do dataset e persiste em ml/modelos/."""
    DIR_MODELOS.mkdir(exist_ok=True)
    X = df[COLUNAS_FEATURES]
    y = df[COLUNA_ALVO]

    for nome, construtor in ALGORITMOS.items():
        pipeline = _montar_pipeline(construtor())
        pipeline.fit(X, y)
        joblib.dump(pipeline, DIR_MODELOS / f"{nome}.joblib")


def main() -> None:
    df = carregar_dataset()

    resultados = avaliar_algoritmos(df)
    CAMINHO_RESULTADOS.write_text(
        json.dumps(resultados, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print("Avaliação comparativa dos algoritmos (holdout 75/25):")
    for nome, metricas in resultados.items():
        print(
            f"  {nome:15s} acurácia={metricas['acuracia']:.2f}  "
            f"precisão={metricas['precisao']:.2f}  recall={metricas['recall']:.2f}  "
            f"(treino={metricas['n_treino']}, teste={metricas['n_teste']})"
        )

    treinar_modelos_finais(df)
    print(f"\nModelos finais treinados com 100% do dataset e salvos em {DIR_MODELOS}/")


if __name__ == "__main__":
    main()
