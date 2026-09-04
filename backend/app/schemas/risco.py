"""Schemas Pydantic da entidade Risco."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CategoriaRisco, ImpactoRisco, ProbabilidadeRisco


class RiscoBase(BaseModel):
    titulo: str = Field(min_length=3, max_length=200)
    categoria: CategoriaRisco
    probabilidade: ProbabilidadeRisco
    impacto: ImpactoRisco


class RiscoCriar(RiscoBase):
    id_projeto: int


class RiscoResposta(RiscoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_projeto: int
    id_gerente: int
    criado_em: datetime
