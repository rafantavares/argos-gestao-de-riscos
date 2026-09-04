"""Schemas Pydantic da entidade Projeto."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ProjetoBase(BaseModel):
    nome: str = Field(min_length=2, max_length=150)
    descricao: Optional[str] = None


class ProjetoCriar(ProjetoBase):
    pass


class ProjetoAtualizar(BaseModel):
    nome: Optional[str] = Field(default=None, min_length=2, max_length=150)
    descricao: Optional[str] = None


class ProjetoResposta(ProjetoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_admin: int
    criado_em: datetime
