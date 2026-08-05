from sqlalchemy import Column, Enum, Integer, String
from sqlalchemy.orm import relationship

from database import Base
from models.enums import PerfilUsuario


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    senha_hash = Column(String(255), nullable=False)
    perfil = Column(Enum(PerfilUsuario), nullable=False, default=PerfilUsuario.GERENTE)

    projetos = relationship("Projeto", back_populates="usuario", cascade="all, delete-orphan")
