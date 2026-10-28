"""Schemas Pydantic da entidade Recomendacao."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.plano_contingencia import PlanoContingenciaResposta


class RecomendacaoBase(BaseModel):
    id_risco: int
    id_plano: int
    algoritmo_usado: str
    acuracia_momento: float


class RecomendacaoResposta(RecomendacaoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    confianca: Optional[float] = None
    aceita: Optional[bool] = None
    decidida_em: Optional[datetime] = None
    motivo_rejeicao: Optional[str] = None
    criado_em: datetime
    plano: PlanoContingenciaResposta


class RecomendacaoAtualizar(BaseModel):
    aceita: bool
    # Só vale para rejeição; ignorado quando o plano é aceito.
    motivo_rejeicao: Optional[str] = Field(default=None, max_length=500)
