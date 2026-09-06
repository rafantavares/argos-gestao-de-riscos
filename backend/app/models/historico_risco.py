"""Model ORM da entidade HistoricoRisco: timeline de mudanças de status de um Risco."""
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, Text, func
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.enums import StatusRisco, valores_enum


class HistoricoRisco(Base):
    __tablename__ = "historico_riscos"

    id = Column(Integer, primary_key=True, index=True)
    id_risco = Column(Integer, ForeignKey("riscos.id"), nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    status_anterior = Column(
        Enum(StatusRisco, name="status_risco", values_callable=valores_enum), nullable=True
    )
    status_novo = Column(
        Enum(StatusRisco, name="status_risco", values_callable=valores_enum), nullable=False
    )
    comentario = Column(Text, nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    risco = relationship("Risco", back_populates="historico")
    usuario = relationship("Usuario")
