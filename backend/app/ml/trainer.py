"""Treinamento e avaliação comparativa dos três algoritmos (KNN, Árvore de
Decisão e Random Forest) via validação cruzada k-fold estratificada (10 divisões)."""
import json
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix, f1_score, make_scorer, precision_score, recall_score
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_val_predict, cross_validate
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier

from app.ml.preprocessor import (
    COLUNA_CATEGORIA,
    COLUNAS_FEATURES,
    carregar_dataset,
    criar_pre_processador,
    separar_features_alvo,
)

DIRETORIO_MODELOS = Path(__file__).parent / "modelos"
CAMINHO_METRICAS = DIRETORIO_MODELOS / "metricas.json"

N_DIVISOES_KFOLD = 10

CONSTRUTORES_ALGORITMOS = {
    "knn": lambda: KNeighborsClassifier(),
    "arvore_decisao": lambda: DecisionTreeClassifier(random_state=42),
    # class_weight="balanced" compensa eventual desbalanceamento entre os níveis
    # de severidade (o dataset é balanceado por categoria, não por nível).
    "random_forest": lambda: RandomForestClassifier(random_state=42, class_weight="balanced"),
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


def _n_divisoes_efetivo(alvo: pd.Series, n_divisoes: int = N_DIVISOES_KFOLD) -> int:
    """StratifiedKFold exige que cada classe tenha ao menos n_splits exemplos."""
    menor_classe = alvo.value_counts().min()
    return max(2, min(n_divisoes, int(menor_classe)))


def avaliar_algoritmo(
    pipeline: Pipeline, features: pd.DataFrame, alvo: pd.Series, n_divisoes: int = N_DIVISOES_KFOLD
) -> dict:
    """Validação cruzada k-fold estratificada com acurácia, precisão, recall e F1 (macro)."""
    n_divisoes_efetivo = _n_divisoes_efetivo(alvo, n_divisoes)
    validador = StratifiedKFold(n_splits=n_divisoes_efetivo, shuffle=True, random_state=42)

    metricas_customizadas = {
        "accuracy": "accuracy",
        "precision_macro": make_scorer(precision_score, average="macro", zero_division=0),
        "recall_macro": make_scorer(recall_score, average="macro", zero_division=0),
        "f1_macro": make_scorer(f1_score, average="macro", zero_division=0),
    }
    resultados = cross_validate(
        pipeline,
        features,
        alvo,
        cv=validador,
        scoring=metricas_customizadas,
    )

    # Matriz de confusão das previsões fora da amostra (cada exemplo previsto pela
    # partição em que ficou de fora): linhas = classe real, colunas = prevista.
    previsto = cross_val_predict(pipeline, features, alvo, cv=validador)
    ordem = sorted(set(alvo))  # 0 = baixo, 1 = médio, 2 = alto
    matriz = confusion_matrix(alvo, previsto, labels=ordem)
    nomes = {0: "Baixo", 1: "Médio", 2: "Alto"}

    return {
        "matriz_confusao": {
            "classes": [nomes.get(int(c), str(c)) for c in ordem],
            "valores": matriz.tolist(),
        },
        "acuracia": float(resultados["test_accuracy"].mean()),
        "precisao": float(resultados["test_precision_macro"].mean()),
        "recall": float(resultados["test_recall_macro"].mean()),
        "f1": float(resultados["test_f1_macro"].mean()),
        "desvio_padrao_acuracia": float(resultados["test_accuracy"].std()),
        "n_divisoes": n_divisoes_efetivo,
    }


def ajustar_hiperparametros(
    nome_algoritmo: str, features: pd.DataFrame, alvo: pd.Series, n_divisoes: int
):
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


def extrair_importancia_features(pipeline: Pipeline) -> Optional[dict]:
    """Importância relativa de cada feature original (soma 1.0), a partir do
    estimador já treinado. As colunas one-hot da categoria são agregadas numa
    única entrada, para que o gráfico fale a língua do formulário de risco.
    Retorna None para algoritmos sem feature_importances_ (ex.: KNN)."""
    classificador = pipeline.named_steps["classificador"]
    if not hasattr(classificador, "feature_importances_"):
        return None

    pre_processador = pipeline.named_steps["pre_processador"]
    nomes_colunas = pre_processador.get_feature_names_out()
    importancias = classificador.feature_importances_

    agregado = {feature: 0.0 for feature in COLUNAS_FEATURES}
    for nome_coluna, importancia in zip(nomes_colunas, importancias):
        # Formato "<transformador>__<coluna>" (one-hot vira "<coluna>_<valor>").
        _, coluna = nome_coluna.split("__", 1)
        feature = COLUNA_CATEGORIA if coluna.startswith(f"{COLUNA_CATEGORIA}_") else coluna
        agregado[feature] += float(importancia)

    return agregado


def treinar_e_avaliar(df: Optional[pd.DataFrame] = None) -> dict:
    """Para cada algoritmo: busca os melhores hiperparâmetros (GridSearchCV), avalia
    o resultado via k-fold (acurácia, precisão, recall, F1), treina com o dataset
    completo e persiste o modelo (.joblib) e as métricas (metricas.json) em disco.
    Para os algoritmos baseados em árvore, grava também a importância das features."""
    df = df if df is not None else carregar_dataset()
    features, alvo = separar_features_alvo(df)
    n_divisoes = _n_divisoes_efetivo(alvo)

    DIRETORIO_MODELOS.mkdir(parents=True, exist_ok=True)
    metricas = {}

    for nome_algoritmo in CONSTRUTORES_ALGORITMOS:
        pipeline, melhores_parametros = ajustar_hiperparametros(nome_algoritmo, features, alvo, n_divisoes)

        metricas[nome_algoritmo] = avaliar_algoritmo(pipeline, features, alvo, n_divisoes)
        metricas[nome_algoritmo]["melhores_parametros"] = melhores_parametros

        pipeline.fit(features, alvo)
        joblib.dump(pipeline, DIRETORIO_MODELOS / f"{nome_algoritmo}.joblib")

        importancia = extrair_importancia_features(pipeline)
        if importancia is not None:
            metricas[nome_algoritmo]["importancia_features"] = importancia

    metricas["_dataset"] = {
        "n_exemplos": int(len(df)),
        "n_features": len(COLUNAS_FEATURES),
        "features": COLUNAS_FEATURES,
    }

    with open(CAMINHO_METRICAS, "w", encoding="utf-8") as arquivo:
        json.dump(metricas, arquivo, ensure_ascii=False, indent=2)

    return metricas


if __name__ == "__main__":
    resultado = treinar_e_avaliar()
    for algoritmo, valores in resultado.items():
        print(f"{algoritmo}: {valores}")
