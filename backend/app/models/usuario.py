"""Model ORM da entidade Usuario (gerente de projetos)."""
from sqlalchemy import JSON, Column, DateTime, Enum, Integer, String, func
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.enums import PerfilUsuario, valores_enum


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(120), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    senha_hash = Column(String(255), nullable=False)
    perfil = Column(
        Enum(PerfilUsuario, name="perfil_usuario", values_callable=valores_enum), nullable=False
    )
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    # Aparecem como responsável nos relatórios em PDF.
    cargo = Column(String(120), nullable=True)
    organizacao = Column(String(150), nullable=True)
    # Preferências da interface e das notificações (Configurações), salvas na
    # conta para valer em qualquer computador.
    preferencias = Column(JSON, nullable=True)
    # Vai no token (claim "ver"); somar 1 encerra todas as outras sessões.
    versao_token = Column(Integer, nullable=False, default=0, server_default="0")
    # Conta excluída a pedido do titular (LGPD): dados pessoais anonimizados.
    excluido_em = Column(DateTime(timezone=True), nullable=True)

    projetos_criados = relationship("Projeto", back_populates="criador", foreign_keys="Projeto.id_criador")
    riscos_gerenciados = relationship(
        "Risco", back_populates="gerente", foreign_keys="Risco.id_gerente"
    )
    vinculos_projetos = relationship("ProjetoGerente", back_populates="gerente")
