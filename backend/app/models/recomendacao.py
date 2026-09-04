"""Model ORM da entidade Recomendacao (saída do módulo de ML para um Risco)."""
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.database import Base


class Recomendacao(Base):
    __tablename__ = "recomendacoes"

    id = Column(Integer, primary_key=True, index=True)
    id_risco = Column(Integer, ForeignKey("riscos.id"), nullable=False)
    id_plano = Column(Integer, ForeignKey("planos_contingencia.id"), nullable=False)
    algoritmo_usado = Column(String(50), nullable=False)
    acuracia_momento = Column(Float, nullable=False)
    aceita = Column(Boolean, nullable=True, default=None)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    risco = relationship("Risco", back_populates="recomendacoes")
    plano = relationship("PlanoContingencia", back_populates="recomendacoes")
