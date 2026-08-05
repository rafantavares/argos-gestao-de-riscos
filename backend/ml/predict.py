"""Prevê o plano de contingência mais adequado para um novo risco, usando os
modelos treinados por ml/train.py (ver ml/modelos/*.joblib).
"""

from pathlib import Path

import joblib
import pandas as pd

DIR_MODELOS = Path(__file__).parent / "modelos"

ALGORITMOS_VALIDOS = {"knn", "decision_tree", "random_forest"}


def prever_plano(categoria: str, probabilidade: str, impacto: str, algoritmo: str = "knn") -> dict:
    if algoritmo not in ALGORITMOS_VALIDOS:
        raise ValueError(f"Algoritmo desconhecido: {algoritmo}")

    caminho_modelo = DIR_MODELOS / f"{algoritmo}.joblib"
    if not caminho_modelo.exists():
        raise FileNotFoundError(
            f"Modelo '{algoritmo}' não encontrado em {caminho_modelo}. "
            "Execute `python -m ml.train` a partir de backend/ antes de solicitar recomendações."
        )

    pipeline = joblib.load(caminho_modelo)
    entrada = pd.DataFrame(
        [{"categoria": categoria, "probabilidade": probabilidade, "impacto": impacto}]
    )

    plano_previsto = pipeline.predict(entrada)[0]
    probabilidades = pipeline.predict_proba(entrada)[0]
    score = float(probabilidades.max())

    return {"plano_contingencia": plano_previsto, "score": score, "algoritmo": algoritmo}
