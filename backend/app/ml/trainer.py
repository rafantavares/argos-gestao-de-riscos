"""Treinamento e avaliação comparativa dos três algoritmos (KNN, Árvore de
Decisão e Random Forest) via validação cruzada k-fold."""
import json
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import make_scorer, precision_score, recall_score
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_validate
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier

from app.ml.preprocessor import carregar_dataset, criar_pre_processador, separar_features_alvo

DIRETORIO_MODELOS = Path(__file__).parent / "modelos"
CAMINHO_METRICAS = DIRETORIO_MODELOS / "metricas.json"

CONSTRUTORES_ALGORITMOS = {
    "knn": lambda: KNeighborsClassifier(),
    "arvore_decisao": lambda: DecisionTreeClassifier(random_state=42),
    "random_forest": lambda: RandomForestClassifier(random_state=42),
}

# Grades de hiperparâmetros testadas via GridSearchCV (prefixo "classificador__"
# porque o estimador fica dentro do Pipeline sob esse nome de etapa).
GRADES_HIPERPARAMETROS = {
    "knn": {
        "classificador__n_neighbors": [3, 5, 7, 9, 11],
        "classificador__weights": ["uniform", "distance"],
    },
    "arvore_decisao": {
        "classificador__max_depth": [None, 3, 5, 7, 10],
        "classificador__min_samples_leaf": [1, 2, 5, 10],
    },
    "random_forest": {
        "classificador__n_estimators": [50, 100, 200],
        "classificador__max_depth": [None, 5, 10],
        "classificador__min_samples_leaf": [1, 2, 5],
    },
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


def ajustar_hiperparametros(
    nome_algoritmo: str, features: pd.DataFrame, alvo: pd.Series, n_divisoes: int
) -> Pipeline:
    """Busca em grade (GridSearchCV) dos melhores hiperparâmetros para o algoritmo,
    usando a mesma validação k-fold estratificada da avaliação final. Retorna o
    pipeline (não treinado) já configurado com os melhores parâmetros encontrados."""
    validador = StratifiedKFold(n_splits=n_divisoes, shuffle=True, random_state=42)
    busca = GridSearchCV(
        construir_pipeline(nome_algoritmo),
        GRADES_HIPERPARAMETROS[nome_algoritmo],
        cv=validador,
        scoring="accuracy",
        refit=False,
    )
    busca.fit(features, alvo)

    pipeline = construir_pipeline(nome_algoritmo)
    pipeline.set_params(**busca.best_params_)
    return pipeline, busca.best_params_


def treinar_e_avaliar(df: Optional[pd.DataFrame] = None) -> dict:
    """Para cada algoritmo: busca os melhores hiperparâmetros (GridSearchCV), avalia
    o resultado via k-fold (acurácia, precisão, recall), treina com o dataset
    completo e persiste o modelo (.joblib) e as métricas (metricas.json) em disco."""
    df = df if df is not None else carregar_dataset()
    features, alvo = separar_features_alvo(df)
    n_divisoes = max(2, min(5, int(alvo.value_counts().min())))

    DIRETORIO_MODELOS.mkdir(parents=True, exist_ok=True)
    metricas = {}

    for nome_algoritmo in CONSTRUTORES_ALGORITMOS:
        pipeline, melhores_parametros = ajustar_hiperparametros(nome_algoritmo, features, alvo, n_divisoes)

        metricas[nome_algoritmo] = avaliar_algoritmo(pipeline, features, alvo, n_divisoes)
        metricas[nome_algoritmo]["melhores_parametros"] = melhores_parametros

        pipeline.fit(features, alvo)
        joblib.dump(pipeline, DIRETORIO_MODELOS / f"{nome_algoritmo}.joblib")

    with open(CAMINHO_METRICAS, "w", encoding="utf-8") as arquivo:
        json.dump(metricas, arquivo, ensure_ascii=False, indent=2)

    return metricas


if __name__ == "__main__":
    resultado = treinar_e_avaliar()
    for algoritmo, valores in resultado.items():
        print(f"{algoritmo}: {valores}")
