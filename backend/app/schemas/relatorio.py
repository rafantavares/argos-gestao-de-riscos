"""Schemas Pydantic do relatório de riscos (exportação)."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.models.enums import (
    CategoriaRisco,
    FaseProjeto,
    OrcamentoImpacto,
    StatusRisco,
    Urgencia,
)


class RecomendacaoRelatorio(BaseModel):
    id: int
    id_plano: int
    descricao_plano: str
    algoritmo_usado: str
    acuracia_momento: float
    confianca: Optional[float] = None
    aceita: Optional[bool] = None
    criado_em: datetime


class RiscoRelatorio(BaseModel):
    id: int
    titulo: str
    projeto: str
    id_projeto: int
    gerente: str
    indice: str
    categoria: CategoriaRisco
    area_afetada: str
    descricao_impacto: str
    probabilidade: int
    impacto: int
    exposicao: int
    avaliacao_exposicao: str
    mitigacao: Optional[str] = None
    contingencia: Optional[str] = None
    gatilho: Optional[str] = None
    orcamento_impacto: OrcamentoImpacto
    urgencia: Urgencia
    fase_projeto: FaseProjeto
    status: StatusRisco
    criado_em: datetime
    recomendacoes: List[RecomendacaoRelatorio]


class RelatorioRiscosResposta(BaseModel):
    id_projeto: Optional[int]
    total_riscos: int
    total_recomendacoes: int
    riscos: List[RiscoRelatorio]
