"""Schemas Pydantic da entidade Risco."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator

from app.core.exposicao import avaliacao_exposicao, pontuacao_exposicao
from app.models.enums import (
    AREA_PARA_CATEGORIA,
    AreaAfetada,
    CategoriaRisco,
    FaseProjeto,
    OrcamentoImpacto,
    StatusRisco,
    Urgencia,
)


class RiscoBase(BaseModel):
    titulo: str = Field(min_length=3, max_length=200)
    area_afetada: AreaAfetada
    descricao_impacto: str = Field(min_length=5, max_length=2000)
    probabilidade: int = Field(ge=1, le=5)
    impacto: int = Field(ge=1, le=5)
    orcamento_impacto: OrcamentoImpacto
    urgencia: Urgencia
    fase_projeto: FaseProjeto
    mitigacao: Optional[str] = Field(default=None, max_length=2000)
    contingencia: Optional[str] = Field(default=None, max_length=2000)
    gatilho: Optional[str] = Field(default=None, max_length=1000)


class RiscoCriar(RiscoBase):
    id_projeto: int
    # Conversa do Assistente IA de onde veio a sugestão (opcional).
    id_conversa_origem: Optional[int] = None
    # Grupo PMBOK; se omitido, é derivado da área afetada.
    categoria: Optional[CategoriaRisco] = None

    @model_validator(mode="after")
    def derivar_categoria(self):
        if self.categoria is None:
            self.categoria = AREA_PARA_CATEGORIA[self.area_afetada]
        return self


class RiscoResposta(RiscoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    indice: str
    categoria: CategoriaRisco
    id_projeto: int
    id_gerente: int
    status: StatusRisco
    arquivado: bool = False
    id_conversa_origem: Optional[int] = None
    criado_em: datetime
    atualizado_em: datetime
    ultima_avaliacao_em: Optional[datetime] = None

    @computed_field
    @property
    def exposicao(self) -> int:
        return pontuacao_exposicao(self.probabilidade, self.impacto)

    @computed_field
    @property
    def avaliacao_exposicao(self) -> str:
        return avaliacao_exposicao(self.exposicao)


class RiscoPlanoAtualizar(BaseModel):
    """Edição do registro (identificação e tratamento). As notas de impacto e
    probabilidade mudam pela reavaliação, que guarda o histórico."""

    titulo: Optional[str] = Field(default=None, min_length=3, max_length=200)
    area_afetada: Optional[AreaAfetada] = None
    orcamento_impacto: Optional[OrcamentoImpacto] = None
    urgencia: Optional[Urgencia] = None

    descricao_impacto: Optional[str] = Field(default=None, min_length=5, max_length=2000)
    mitigacao: Optional[str] = Field(default=None, max_length=2000)
    contingencia: Optional[str] = Field(default=None, max_length=2000)
    gatilho: Optional[str] = Field(default=None, max_length=1000)


class RiscoStatusAtualizar(BaseModel):
    status: StatusRisco
    comentario: Optional[str] = Field(default=None, max_length=1000)


class RiscoReavaliar(BaseModel):
    """Revisão das notas conforme o andamento do projeto (MR-MPS-SW:2023, GPR 17)."""

    probabilidade: int = Field(ge=1, le=5)
    impacto: int = Field(ge=1, le=5)
    # Fase atual do projeto; se omitida, mantém a fase registrada no risco.
    fase_projeto: Optional[FaseProjeto] = None
    justificativa: str = Field(min_length=5, max_length=1000)


class PontoEvolucao(BaseModel):
    data: datetime
    probabilidade: int
    impacto: int
    exposicao: int
    avaliacao: str
    fase_projeto: FaseProjeto
    justificativa: Optional[str]


class SugestaoReavaliacao(BaseModel):
    probabilidade: int
    impacto: int
    motivo: str


class EvolucaoExposicao(BaseModel):
    pontos: List[PontoEvolucao]
    tendencia: str  # "subindo" | "caindo" | "estavel"
    dias_desde_ultima_avaliacao: int
    reavaliacao_pendente: bool
    sugestao: Optional[SugestaoReavaliacao]


class HistoricoRiscoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_risco: int
    id_usuario: int
    status_anterior: Optional[StatusRisco]
    status_novo: StatusRisco
    comentario: Optional[str]
    criado_em: datetime


# --- Assistente de IA (classificação, duplicados, coerência, sugestões) ---


class AssistenteEntrada(BaseModel):
    id_projeto: int
    titulo: str = Field(default="", max_length=200)
    descricao_impacto: str = Field(default="", max_length=2000)
    area_afetada: Optional[AreaAfetada] = None
    probabilidade: Optional[int] = Field(default=None, ge=1, le=5)
    impacto: Optional[int] = Field(default=None, ge=1, le=5)


class AreaSugerida(BaseModel):
    area_afetada: AreaAfetada
    categoria: CategoriaRisco
    confianca: float


class RiscoSimilar(BaseModel):
    id: int
    indice: str
    titulo: str
    similaridade: float


class AlertaCoerencia(BaseModel):
    tipo: str  # "impacto_subestimado" | "impacto_superestimado" | "probabilidade_subestimada"
    mensagem: str
    valor_sugerido: int
    termos: List[str]


class SugestaoPlano(BaseModel):
    mitigacao: str
    contingencia: str
    gatilho: str


class ReferenciaNotas(BaseModel):
    indice: str
    titulo: str
    projeto: str
    probabilidade: int
    impacto: int
    similaridade: float


class NotasSugeridas(BaseModel):
    probabilidade: int
    impacto: int
    confianca: float
    referencias: List[ReferenciaNotas]


class AssistenteResposta(BaseModel):
    area_sugerida: Optional[AreaSugerida]
    notas_sugeridas: Optional[NotasSugeridas] = None
    similares: List[RiscoSimilar]
    alertas_coerencia: List[AlertaCoerencia]
    sugestao_plano: Optional[SugestaoPlano]


class RiscoArquivar(BaseModel):
    arquivado: bool


class AnexoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_risco: int
    nome_arquivo: str
    tipo_conteudo: str
    tamanho: int
    criado_em: datetime
