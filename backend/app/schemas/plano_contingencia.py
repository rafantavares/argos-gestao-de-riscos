"""Schemas Pydantic da entidade PlanoContingencia."""
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CategoriaRisco, ImpactoRisco, ProbabilidadeRisco


class PlanoContingenciaBase(BaseModel):
    descricao: str = Field(min_length=10, max_length=2000)
    categoria: CategoriaRisco
    probabilidade: ProbabilidadeRisco
    impacto: ImpactoRisco


class PlanoContingenciaCriar(PlanoContingenciaBase):
    pass


class PlanoContingenciaAtualizar(BaseModel):
    descricao: str | None = Field(default=None, min_length=10, max_length=2000)
    categoria: CategoriaRisco | None = None
    probabilidade: ProbabilidadeRisco | None = None
    impacto: ImpactoRisco | None = None


class PlanoContingenciaResposta(PlanoContingenciaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ativo: bool
