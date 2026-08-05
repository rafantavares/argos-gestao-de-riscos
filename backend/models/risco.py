from sqlalchemy import Column, Date, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base
from models.enums import CategoriaRisco, ImpactoRisco, ProbabilidadeRisco


class Risco(Base):
    __tablename__ = "riscos"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(150), nullable=False)
    descricao = Column(Text, nullable=True)
    categoria = Column(Enum(CategoriaRisco), nullable=False)
    probabilidade = Column(Enum(ProbabilidadeRisco), nullable=False)
    impacto = Column(Enum(ImpactoRisco), nullable=False)
    status = Column(String(30), nullable=False, default="identificado")
    data = Column(Date, nullable=False, server_default=func.current_date())
    id_projeto = Column(Integer, ForeignKey("projetos.id"), nullable=False)

    projeto = relationship("Projeto", back_populates="riscos")
    planos_contingencia = relationship(
        "PlanoContingencia", back_populates="risco", cascade="all, delete-orphan"
    )
    recomendacoes_recebidas = relationship(
        "Recomendacao",
        foreign_keys="Recomendacao.id_risco_novo",
        back_populates="risco_novo",
        cascade="all, delete-orphan",
    )
    recomendacoes_como_similar = relationship(
        "Recomendacao",
        foreign_keys="Recomendacao.id_risco_similar",
        back_populates="risco_similar",
    )
