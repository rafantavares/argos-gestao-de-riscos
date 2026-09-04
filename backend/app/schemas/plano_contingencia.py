"""Schemas Pydantic da entidade PlanoContingencia."""
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CategoriaRisco, ImpactoRisco, ProbabilidadeRisco


class PlanoContingenciaBase(BaseModel):
    descricao: str = Field(min_length=5)
    categoria: CategoriaRisco
    probabilidade: ProbabilidadeRisco
    impacto: ImpactoRisco


class PlanoContingenciaCriar(PlanoContingenciaBase):
    pass


class PlanoContingenciaResposta(PlanoContingenciaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
