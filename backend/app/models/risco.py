"""Model ORM da entidade Risco."""
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.enums import (
    CategoriaRisco,
    FaseProjeto,
    ImpactoRisco,
    OrcamentoImpacto,
    ProbabilidadeRisco,
    StatusRisco,
    Urgencia,
    valores_enum,
)


class Risco(Base):
    __tablename__ = "riscos"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    categoria = Column(
        Enum(CategoriaRisco, name="categoria_risco", values_callable=valores_enum), nullable=False
    )
    probabilidade = Column(
        Enum(ProbabilidadeRisco, name="probabilidade_risco", values_callable=valores_enum),
        nullable=False,
    )
    impacto = Column(
        Enum(ImpactoRisco, name="impacto_risco", values_callable=valores_enum), nullable=False
    )
    orcamento_impacto = Column(
        Enum(OrcamentoImpacto, name="orcamento_impacto", values_callable=valores_enum),
        nullable=False,
    )
    urgencia = Column(
        Enum(Urgencia, name="urgencia", values_callable=valores_enum), nullable=False
    )
    fase_projeto = Column(
        Enum(FaseProjeto, name="fase_projeto", values_callable=valores_enum),
        nullable=False,
        default=FaseProjeto.PLANEJAMENTO,
        server_default=FaseProjeto.PLANEJAMENTO.value,
    )
    status = Column(
        Enum(StatusRisco, name="status_risco", values_callable=valores_enum),
        nullable=False,
        default=StatusRisco.IDENTIFICADO,
        server_default=StatusRisco.IDENTIFICADO.value,
    )
    id_projeto = Column(Integer, ForeignKey("projetos.id"), nullable=False)
    id_gerente = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    projeto = relationship("Projeto", back_populates="riscos")
    gerente = relationship(
        "Usuario", back_populates="riscos_gerenciados", foreign_keys=[id_gerente]
    )
    recomendacoes = relationship("Recomendacao", back_populates="risco")
    historico = relationship(
        "HistoricoRisco", back_populates="risco", order_by="HistoricoRisco.criado_em"
    )
