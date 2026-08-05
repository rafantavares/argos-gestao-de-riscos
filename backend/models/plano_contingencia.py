from sqlalchemy import Column, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class PlanoContingencia(Base):
    __tablename__ = "planos_contingencia"

    id = Column(Integer, primary_key=True, index=True)
    descricao = Column(Text, nullable=False)
    acao = Column(Text, nullable=False)
    responsavel = Column(String(120), nullable=True)
    prazo = Column(Date, nullable=True)
    id_risco = Column(Integer, ForeignKey("riscos.id"), nullable=False)

    risco = relationship("Risco", back_populates="planos_contingencia")
