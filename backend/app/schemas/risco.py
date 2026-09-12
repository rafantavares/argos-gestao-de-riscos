"""Schemas Pydantic da entidade Risco."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    CategoriaRisco,
    FaseProjeto,
    ImpactoRisco,
    OrcamentoImpacto,
    ProbabilidadeRisco,
    StatusRisco,
    Urgencia,
)


class RiscoBase(BaseModel):
    titulo: str = Field(min_length=3, max_length=200)
    categoria: CategoriaRisco
    probabilidade: ProbabilidadeRisco
    impacto: ImpactoRisco
    orcamento_impacto: OrcamentoImpacto
    urgencia: Urgencia
    fase_projeto: FaseProjeto


class RiscoCriar(RiscoBase):
    id_projeto: int


class RiscoResposta(RiscoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_projeto: int
    id_gerente: int
    status: StatusRisco
    criado_em: datetime
    atualizado_em: datetime


class RiscoStatusAtualizar(BaseModel):
    status: StatusRisco
    comentario: Optional[str] = Field(default=None, max_length=1000)


class HistoricoRiscoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_risco: int
    id_usuario: int
    status_anterior: Optional[StatusRisco]
    status_novo: StatusRisco
    comentario: Optional[str]
    criado_em: datetime
