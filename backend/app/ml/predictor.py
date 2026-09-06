"""Predição do plano de contingência recomendado para um risco, usando o
algoritmo com melhor acurácia média (validação cruzada) entre os três treinados."""
import json
from typing import Optional

import joblib
import pandas as pd

from app.ml.preprocessor import COLUNAS_FEATURES
from app.ml.trainer import CAMINHO_METRICAS, DIRETORIO_MODELOS, treinar_e_avaliar

ALGORITMO_PADRAO = "random_forest"


def _carregar_metricas() -> dict:
    if not CAMINHO_METRICAS.exists():
        treinar_e_avaliar()
    with open(CAMINHO_METRICAS, encoding="utf-8") as arquivo:
        return json.load(arquivo)


def _escolher_melhor_algoritmo(metricas: dict) -> str:
    if not metricas:
        return ALGORITMO_PADRAO
    return max(metricas, key=lambda nome: metricas[nome]["acuracia"])


def _carregar_modelo(nome_algoritmo: str):
    caminho = DIRETORIO_MODELOS / f"{nome_algoritmo}.joblib"
    if not caminho.exists():
        treinar_e_avaliar()
    return joblib.load(caminho)


def prever_plano_contingencia(
    categoria: str,
    probabilidade: str,
    impacto: str,
    orcamento_impacto: str,
    urgencia: str,
    nome_algoritmo: Optional[str] = None,
) -> dict:
    """Retorna o id do plano de contingência recomendado, o algoritmo usado e a
    acurácia média (k-fold) desse algoritmo no momento da recomendação."""
    metricas = _carregar_metricas()
    algoritmo_escolhido = nome_algoritmo or _escolher_melhor_algoritmo(metricas)

    modelo = _carregar_modelo(algoritmo_escolhido)
    entrada = pd.DataFrame(
        [
            {
                "categoria": categoria,
                "probabilidade": probabilidade,
                "impacto": impacto,
                "orcamento_impacto": orcamento_impacto,
                "urgencia": urgencia,
            }
        ],
        columns=COLUNAS_FEATURES,
    )

    id_plano_previsto = int(modelo.predict(entrada)[0])
    acuracia_momento = metricas.get(algoritmo_escolhido, {}).get("acuracia", 0.0)

    return {
        "id_plano_contingencia": id_plano_previsto,
        "algoritmo_usado": algoritmo_escolhido,
        "acuracia_momento": acuracia_momento,
    }
