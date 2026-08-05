from sqlalchemy import Boolean, Column, Enum, Float, ForeignKey, Integer
from sqlalchemy.orm import relationship

from database import Base
from models.enums import AlgoritmoML


class Recomendacao(Base):
    __tablename__ = "recomendacoes"

    id = Column(Integer, primary_key=True, index=True)
    id_risco_novo = Column(Integer, ForeignKey("riscos.id"), nullable=False)
    id_risco_similar = Column(Integer, ForeignKey("riscos.id"), nullable=False)
    algoritmo = Column(Enum(AlgoritmoML), nullable=False)
    score = Column(Float, nullable=False)
    aceita = Column(Boolean, nullable=True, default=None)

    risco_novo = relationship(
        "Risco", foreign_keys=[id_risco_novo], back_populates="recomendacoes_recebidas"
    )
    risco_similar = relationship(
        "Risco", foreign_keys=[id_risco_similar], back_populates="recomendacoes_como_similar"
    )
