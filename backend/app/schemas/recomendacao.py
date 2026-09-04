"""Schemas Pydantic da entidade Recomendacao."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.plano_contingencia import PlanoContingenciaResposta


class RecomendacaoBase(BaseModel):
    id_risco: int
    id_plano: int
    algoritmo_usado: str
    acuracia_momento: float


class RecomendacaoResposta(RecomendacaoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    aceita: Optional[bool] = None
    criado_em: datetime
    plano: PlanoContingenciaResposta


class RecomendacaoAtualizar(BaseModel):
    aceita: bool
