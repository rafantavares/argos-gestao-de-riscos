"""Model ORM dos acessos (logins) de cada usuário, para a tela de Segurança."""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func

from app.database import Base


class AcessoUsuario(Base):
    __tablename__ = "acessos_usuarios"

    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    ip = Column(String(64), nullable=True)
    navegador = Column(String(300), nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
