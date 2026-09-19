"""Predição do plano de contingência recomendado para um risco, usando o
algoritmo com melhor acurácia média (validação cruzada) entre os três treinados.

O modelo prevê o nível de severidade da resposta (0 = baixo, 1 = médio,
2 = alto); o plano recomendado é o plano desse nível dentro da categoria do
risco (mesma correspondência de app/core/seed.py)."""
import json
from typing import Optional

import joblib
import numpy as np
import pandas as pd

from app.ml.gerar_dataset import NIVEIS_SEVERIDADE, plano_canonico
from app.ml.preprocessor import COLUNAS_FEATURES, ROTULOS_FEATURES
from app.ml.trainer import CAMINHO_METRICAS, DIRETORIO_MODELOS, treinar_e_avaliar

ALGORITMO_PADRAO = "random_forest"


def _carregar_metricas() -> dict:
    if not CAMINHO_METRICAS.exists():
        treinar_e_avaliar()
    with open(CAMINHO_METRICAS, encoding="utf-8") as arquivo:
        return json.load(arquivo)


def metricas_por_algoritmo(metricas: dict) -> dict:
    """Filtra as chaves de metadados (prefixo "_"), deixando só os algoritmos."""
    return {nome: valores for nome, valores in metricas.items() if not nome.startswith("_")}


def _escolher_melhor_algoritmo(metricas: dict) -> str:
    algoritmos = metricas_por_algoritmo(metricas)
    if not algoritmos:
        return ALGORITMO_PADRAO
    return max(algoritmos, key=lambda nome: algoritmos[nome]["acuracia"])


def _carregar_modelo(nome_algoritmo: str):
    caminho = DIRETORIO_MODELOS / f"{nome_algoritmo}.joblib"
    if not caminho.exists():
        treinar_e_avaliar()
    return joblib.load(caminho)


def prever_plano_contingencia(
    categoria: str,
    probabilidade: int,
    impacto: int,
    orcamento_impacto: str,
    urgencia: str,
    fase_projeto: str,
    nome_algoritmo: Optional[str] = None,
) -> dict:
    """Retorna o id do plano de contingência recomendado, o nível de severidade
    previsto, a confiança da predição (probabilidade da classe prevista, via
    predict_proba), o algoritmo usado e a acurácia média (k-fold) desse
    algoritmo no momento da recomendação."""
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
                "fase_projeto": fase_projeto,
            }
        ],
        columns=COLUNAS_FEATURES,
    )

    probabilidades_classes = modelo.predict_proba(entrada)[0]
    indice_previsto = int(np.argmax(probabilidades_classes))
    nivel_previsto = int(modelo.classes_[indice_previsto])
    confianca = float(probabilidades_classes[indice_previsto])

    acuracia_momento = metricas.get(algoritmo_escolhido, {}).get("acuracia", 0.0)

    return {
        "id_plano_contingencia": plano_canonico(categoria, nivel_previsto),
        "nivel_severidade": NIVEIS_SEVERIDADE[nivel_previsto],
        "confianca": confianca,
        "algoritmo_usado": algoritmo_escolhido,
        "acuracia_momento": acuracia_momento,
    }


def obter_metricas_atuais() -> dict:
    """Conteúdo de metricas.json (treina na primeira vez se ainda não existir)."""
    return _carregar_metricas()


def obter_importancia_features(nome_algoritmo: str = ALGORITMO_PADRAO) -> dict:
    """Importância relativa de cada feature, ordenada da maior para a menor,
    conforme salva em metricas.json pelo treinamento."""
    metricas = _carregar_metricas()
    importancia = metricas.get(nome_algoritmo, {}).get("importancia_features", {})
    itens = sorted(importancia.items(), key=lambda item: item[1], reverse=True)
    return {
        "algoritmo": nome_algoritmo,
        "features": [
            {"feature": feature, "rotulo": ROTULOS_FEATURES.get(feature, feature), "importancia": valor}
            for feature, valor in itens
        ],
    }
