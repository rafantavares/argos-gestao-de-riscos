"""Classificação da área afetada e detecção de riscos duplicados.

Ambos usam TF-IDF (scikit-learn, já dependência do módulo de ML):
- área afetada: TF-IDF de n-gramas de caracteres + regressão logística treinada
  no pequeno corpus de app/assistente/corpus.py (sugere a área e devolve a
  confiança via predict_proba);
- duplicados: similaridade do cosseno entre o texto digitado e os riscos já
  cadastrados no projeto, para padronizar nomes e evitar registros repetidos.
"""
from functools import lru_cache
from typing import List, Optional

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.pipeline import make_pipeline

from app.assistente.corpus import CORPUS_AREAS
from app.assistente.texto import normalizar
from app.models.enums import AREA_PARA_CATEGORIA, AreaAfetada

LIMIAR_DUPLICADO = 0.45
MAXIMO_SIMILARES = 3
CONFIANCA_MINIMA_AREA = 0.25


@lru_cache(maxsize=1)
def _modelo_area():
    frases, areas = [], []
    for area, exemplos in CORPUS_AREAS.items():
        for exemplo in exemplos:
            frases.append(normalizar(exemplo))
            areas.append(area)
    modelo = make_pipeline(
        TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True),
        LogisticRegression(max_iter=1000, C=10.0),
    )
    modelo.fit(frases, areas)
    return modelo


def sugerir_area(titulo: str, descricao: str) -> Optional[dict]:
    texto = normalizar(f"{titulo} {descricao}")
    if len(texto) < 4:
        return None
    modelo = _modelo_area()
    probabilidades = modelo.predict_proba([texto])[0]
    indice = int(probabilidades.argmax())
    confianca = float(probabilidades[indice])
    if confianca < CONFIANCA_MINIMA_AREA:
        return None
    area = AreaAfetada(modelo.classes_[indice])
    return {
        "area_afetada": area,
        "categoria": AREA_PARA_CATEGORIA[area],
        "confianca": confianca,
    }


def encontrar_similares(titulo: str, descricao: str, existentes: List[dict]) -> List[dict]:
    """`existentes`: dicts com id, indice, titulo, descricao_impacto."""
    texto = normalizar(f"{titulo} {descricao}")
    if len(texto) < 4 or not existentes:
        return []
    documentos = [normalizar(f"{e['titulo']} {e['descricao_impacto']}") for e in existentes]
    vetorizador = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True)
    matriz = vetorizador.fit_transform([texto, *documentos])
    similaridades = cosine_similarity(matriz[0], matriz[1:])[0]

    candidatos = [
        {
            "id": existente["id"],
            "indice": existente["indice"],
            "titulo": existente["titulo"],
            "similaridade": float(similaridade),
        }
        for existente, similaridade in zip(existentes, similaridades)
        if similaridade >= LIMIAR_DUPLICADO
    ]
    candidatos.sort(key=lambda c: c["similaridade"], reverse=True)
    return candidatos[:MAXIMO_SIMILARES]
