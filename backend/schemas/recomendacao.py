from pydantic import BaseModel, ConfigDict, Field

from models.enums import AlgoritmoML


class RecomendacaoBase(BaseModel):
    algoritmo: AlgoritmoML
    score: float = Field(ge=0.0, le=1.0)


class RecomendacaoCreate(RecomendacaoBase):
    id_risco_novo: int
    id_risco_similar: int


class RecomendacaoDecisao(BaseModel):
    aceita: bool


class RecomendacaoRead(RecomendacaoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_risco_novo: int
    id_risco_similar: int
    aceita: bool | None
