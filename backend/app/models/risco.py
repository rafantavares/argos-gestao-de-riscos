"""Model ORM da entidade Risco."""
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.enums import CategoriaRisco, ImpactoRisco, ProbabilidadeRisco, valores_enum


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
    id_projeto = Column(Integer, ForeignKey("projetos.id"), nullable=False)
    id_gerente = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    projeto = relationship("Projeto", back_populates="riscos")
    gerente = relationship(
        "Usuario", back_populates="riscos_gerenciados", foreign_keys=[id_gerente]
    )
    recomendacoes = relationship("Recomendacao", back_populates="risco")
