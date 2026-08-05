from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class ProjetoBase(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    descricao: str | None = None
    data_inicio: date
    status: str = Field(default="planejado", max_length=30)


class ProjetoCreate(ProjetoBase):
    id_usuario: int


class ProjetoUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=150)
    descricao: str | None = None
    data_inicio: date | None = None
    status: str | None = Field(default=None, max_length=30)
    id_usuario: int | None = None


class ProjetoRead(ProjetoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_usuario: int
