from sqlalchemy import Column, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class Projeto(Base):
    __tablename__ = "projetos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), nullable=False)
    descricao = Column(Text, nullable=True)
    data_inicio = Column(Date, nullable=False)
    status = Column(String(30), nullable=False, default="planejado")
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=False)

    usuario = relationship("Usuario", back_populates="projetos")
    riscos = relationship("Risco", back_populates="projeto", cascade="all, delete-orphan")
