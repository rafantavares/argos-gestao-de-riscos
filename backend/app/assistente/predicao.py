"""Análise preditiva das notas iniciais de impacto e probabilidade.

Aprende com o histórico da própria organização: os riscos já registrados nos
projetos da organização formam a base. Para o texto digitado, busca os
riscos mais parecidos (TF-IDF de n-gramas de caracteres + similaridade do
cosseno, como na detecção de duplicados) e sugere as notas pela média
ponderada pela similaridade (k vizinhos mais próximos). Cada sugestão cita os
riscos que a motivaram, para o gerente conferir antes de aplicar."""
from typing import List, Optional

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.assistente.texto import normalizar

SIMILARIDADE_MINIMA = 0.2
MAXIMO_VIZINHOS = 5


def sugerir_notas(titulo: str, descricao: str, historico: List[dict]) -> Optional[dict]:
    """`historico`: dicts com indice, titulo, descricao_impacto, probabilidade,
    impacto e projeto (nome). Devolve None se não houver base suficiente."""
    texto = normalizar(f"{titulo} {descricao}")
    if len(texto) < 4 or not historico:
        return None
    documentos = [normalizar(f"{h['titulo']} {h['descricao_impacto']}") for h in historico]
    vetorizador = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True)
    matriz = vetorizador.fit_transform([texto, *documentos])
    similaridades = cosine_similarity(matriz[0], matriz[1:])[0]

    vizinhos = sorted(
        (
            (float(similaridade), registro)
            for registro, similaridade in zip(historico, similaridades)
            if similaridade >= SIMILARIDADE_MINIMA
        ),
        key=lambda par: par[0],
        reverse=True,
    )[:MAXIMO_VIZINHOS]
    if not vizinhos:
        return None

    peso_total = sum(peso for peso, _ in vizinhos)

    def media(campo: str) -> int:
        valor = sum(peso * registro[campo] for peso, registro in vizinhos) / peso_total
        return min(5, max(1, round(valor)))

    return {
        "probabilidade": media("probabilidade"),
        "impacto": media("impacto"),
        # Confiança: similaridade média dos vizinhos usados.
        "confianca": peso_total / len(vizinhos),
        "referencias": [
            {
                "indice": registro["indice"],
                "titulo": registro["titulo"],
                "projeto": registro["projeto"],
                "probabilidade": registro["probabilidade"],
                "impacto": registro["impacto"],
                "similaridade": peso,
            }
            for peso, registro in vizinhos
        ],
    }
