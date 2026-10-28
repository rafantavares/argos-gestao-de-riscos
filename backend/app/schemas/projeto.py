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
    apetite_exposicao: Optional[int] = Field(default=None, ge=1, le=25)
    prazo_reavaliacao_muito_grave: Optional[int] = Field(default=None, ge=1, le=365)
    prazo_reavaliacao_grave: Optional[int] = Field(default=None, ge=1, le=365)
    prazo_reavaliacao_demais: Optional[int] = Field(default=None, ge=1, le=365)


class ProjetoResposta(ProjetoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_criador: int
    criado_em: datetime
    apetite_exposicao: int = 15
    prazo_reavaliacao_muito_grave: int = 7
    prazo_reavaliacao_grave: int = 15
    prazo_reavaliacao_demais: int = 30
    arquivado: bool = False


class ProjetoArquivar(BaseModel):
    arquivado: bool
