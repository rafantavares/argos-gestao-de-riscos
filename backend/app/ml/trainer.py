"""Treinamento e avaliação comparativa dos três algoritmos (KNN, Árvore de
Decisão e Random Forest) via validação cruzada k-fold."""
import json
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import make_scorer, precision_score, recall_score
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier

from app.ml.preprocessor import carregar_dataset, criar_pre_processador, separar_features_alvo

DIRETORIO_MODELOS = Path(__file__).parent / "modelos"
CAMINHO_METRICAS = DIRETORIO_MODELOS / "metricas.json"

CONSTRUTORES_ALGORITMOS = {
    "knn": lambda: KNeighborsClassifier(n_neighbors=5),
    "arvore_decisao": lambda: DecisionTreeClassifier(random_state=42),
    "random_forest": lambda: RandomForestClassifier(n_estimators=100, random_state=42),
}


def construir_pipeline(nome_algoritmo: str) -> Pipeline:
    return Pipeline(
        [
            ("pre_processador", criar_pre_processador()),
            ("classificador", CONSTRUTORES_ALGORITMOS[nome_algoritmo]()),
        ]
    )


def avaliar_algoritmo(pipeline: Pipeline, features: pd.DataFrame, alvo: pd.Series, n_divisoes: int = 5) -> dict:
    """Validação cruzada k-fold estratificada com métricas de acurácia, precisão e recall."""
    menor_classe = alvo.value_counts().min()
    n_divisoes_efetivo = max(2, min(n_divisoes, int(menor_classe)))
    validador = StratifiedKFold(n_splits=n_divisoes_efetivo, shuffle=True, random_state=42)

    metricas_customizadas = {
        "accuracy": "accuracy",
        "precision_macro": make_scorer(precision_score, average="macro", zero_division=0),
        "recall_macro": make_scorer(recall_score, average="macro", zero_division=0),
    }
    resultados = cross_validate(
        pipeline,
        features,
        alvo,
        cv=validador,
        scoring=metricas_customizadas,
    )

    return {
        "acuracia": float(resultados["test_accuracy"].mean()),
        "precisao": float(resultados["test_precision_macro"].mean()),
        "recall": float(resultados["test_recall_macro"].mean()),
        "n_divisoes": n_divisoes_efetivo,
    }


def treinar_e_avaliar(df: Optional[pd.DataFrame] = None) -> dict:
    """Avalia os três algoritmos via k-fold, treina cada um com o dataset completo
    e persiste os modelos (.joblib) e as métricas (metricas.json) em disco."""
    df = df if df is not None else carregar_dataset()
    features, alvo = separar_features_alvo(df)

    DIRETORIO_MODELOS.mkdir(parents=True, exist_ok=True)
    metricas = {}

    for nome_algoritmo in CONSTRUTORES_ALGORITMOS:
        pipeline = construir_pipeline(nome_algoritmo)
        metricas[nome_algoritmo] = avaliar_algoritmo(pipeline, features, alvo)

        pipeline.fit(features, alvo)
        joblib.dump(pipeline, DIRETORIO_MODELOS / f"{nome_algoritmo}.joblib")

    with open(CAMINHO_METRICAS, "w", encoding="utf-8") as arquivo:
        json.dump(metricas, arquivo, ensure_ascii=False, indent=2)

    return metricas


if __name__ == "__main__":
    resultado = treinar_e_avaliar()
    for algoritmo, valores in resultado.items():
        print(f"{algoritmo}: {valores}")
