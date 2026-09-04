"""Model ORM da entidade Projeto."""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class Projeto(Base):
    __tablename__ = "projetos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), nullable=False)
    descricao = Column(Text, nullable=True)
    id_admin = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    administrador = relationship(
        "Usuario", back_populates="projetos_administrados", foreign_keys=[id_admin]
    )
    riscos = relationship("Risco", back_populates="projeto")
    vinculos_gerentes = relationship("ProjetoGerente", back_populates="projeto")
