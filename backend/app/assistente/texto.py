"""Utilidades de texto compartilhadas pelo assistente."""
import unicodedata


def normalizar(texto: str) -> str:
    """Minúsculas e sem acentos, para comparar termos em português."""
    sem_acento = unicodedata.normalize("NFKD", texto or "")
    return "".join(c for c in sem_acento if not unicodedata.combining(c)).lower().strip()
