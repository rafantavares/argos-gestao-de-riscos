"""Model ORM da entidade ReavaliacaoRisco: cada revisão das notas de impacto e
probabilidade de um Risco ao longo do projeto (evolução da exposição)."""
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, SmallInteger, Text, func
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.enums import FaseProjeto, valores_enum


class ReavaliacaoRisco(Base):
    __tablename__ = "reavaliacoes_riscos"

    id = Column(Integer, primary_key=True, index=True)
    id_risco = Column(Integer, ForeignKey("riscos.id"), nullable=False, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    # Notas antes da revisão: a primeira reavaliação guarda a avaliação inicial.
    probabilidade_anterior = Column(SmallInteger, nullable=False)
    impacto_anterior = Column(SmallInteger, nullable=False)
    fase_projeto_anterior = Column(
        Enum(FaseProjeto, name="fase_projeto", values_callable=valores_enum), nullable=False
    )
    probabilidade = Column(SmallInteger, nullable=False)
    impacto = Column(SmallInteger, nullable=False)
    fase_projeto = Column(
        Enum(FaseProjeto, name="fase_projeto", values_callable=valores_enum), nullable=False
    )
    justificativa = Column(Text, nullable=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    risco = relationship("Risco", back_populates="reavaliacoes")
    usuario = relationship("Usuario")
