"""Model ORM da entidade PlanoContingencia.

Os atributos categoria, probabilidade e impacto são os mesmos usados pelo
módulo de ML como features para recomendar o plano mais adequado a um risco.
"""
from sqlalchemy import Boolean, Column, Enum, Integer, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.enums import CategoriaRisco, ImpactoRisco, ProbabilidadeRisco, valores_enum


class PlanoContingencia(Base):
    __tablename__ = "planos_contingencia"

    id = Column(Integer, primary_key=True, index=True)
    descricao = Column(Text, nullable=False)
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
    # Plano não é apagado (Recomendacao histórica referencia por FK), só desativado.
    ativo = Column(Boolean, nullable=False, default=True, server_default="true")

    recomendacoes = relationship("Recomendacao", back_populates="plano")
