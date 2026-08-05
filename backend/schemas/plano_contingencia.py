from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class PlanoContingenciaBase(BaseModel):
    descricao: str = Field(min_length=1)
    acao: str = Field(min_length=1)
    responsavel: str | None = Field(default=None, max_length=120)
    prazo: date | None = None


class PlanoContingenciaCreate(PlanoContingenciaBase):
    id_risco: int


class PlanoContingenciaUpdate(BaseModel):
    descricao: str | None = None
    acao: str | None = None
    responsavel: str | None = Field(default=None, max_length=120)
    prazo: date | None = None


class PlanoContingenciaRead(PlanoContingenciaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_risco: int
