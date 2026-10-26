"""Model ORM da entidade Projeto."""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class Projeto(Base):
    __tablename__ = "projetos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), nullable=False)
    descricao = Column(Text, nullable=True)
    # Quem criou o projeto. A coluna no banco continua "id_admin" (nome da época
    # em que havia o perfil admin), para não exigir migração.
    id_criador = Column("id_admin", Integer, ForeignKey("usuarios.id"), nullable=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    criador = relationship("Usuario", back_populates="projetos_criados", foreign_keys=[id_criador])
    riscos = relationship("Risco", back_populates="projeto")
    vinculos_gerentes = relationship("ProjetoGerente", back_populates="projeto")
