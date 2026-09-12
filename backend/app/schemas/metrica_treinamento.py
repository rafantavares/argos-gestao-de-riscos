"""Schema Pydantic da entidade MetricaTreinamento."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class MetricaTreinamentoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    algoritmo: str
    acuracia: float
    precisao: float
    recall: float
    f1: Optional[float] = None
    criado_em: datetime
