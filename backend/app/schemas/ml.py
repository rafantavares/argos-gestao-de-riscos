"""Schemas Pydantic do módulo de ML (respostas do router /ml)."""
from typing import List

from pydantic import BaseModel


class ImportanciaFeature(BaseModel):
    feature: str
    rotulo: str
    importancia: float


class ImportanciaFeaturesResposta(BaseModel):
    algoritmo: str
    features: List[ImportanciaFeature]
