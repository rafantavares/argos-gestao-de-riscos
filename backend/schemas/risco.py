from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from models.enums import CategoriaRisco, ImpactoRisco, ProbabilidadeRisco


class RiscoBase(BaseModel):
    titulo: str = Field(min_length=1, max_length=150)
    descricao: str | None = None
    categoria: CategoriaRisco
    probabilidade: ProbabilidadeRisco
    impacto: ImpactoRisco
    status: str = Field(default="identificado", max_length=30)


class RiscoCreate(RiscoBase):
    id_projeto: int


class RiscoUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=1, max_length=150)
    descricao: str | None = None
    categoria: CategoriaRisco | None = None
    probabilidade: ProbabilidadeRisco | None = None
    impacto: ImpactoRisco | None = None
    status: str | None = Field(default=None, max_length=30)


class RiscoRead(RiscoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    data: date
    id_projeto: int
