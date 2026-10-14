"""Histórico do chat com o assistente de IA: conversas (por gerente e projeto) e
suas mensagens. Guarda também qual modelo respondeu, para auditoria das
sugestões, e permite rastrear de qual conversa nasceu um risco."""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class ConversaChat(Base):
    __tablename__ = "conversas_chat"

    id = Column(Integer, primary_key=True, index=True)
    id_projeto = Column(Integer, ForeignKey("projetos.id"), nullable=False, index=True)
    id_gerente = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    titulo = Column(String(120), nullable=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    mensagens = relationship(
        "MensagemChat",
        back_populates="conversa",
        order_by="MensagemChat.id",
        cascade="all, delete-orphan",
    )


class MensagemChat(Base):
    __tablename__ = "mensagens_chat"

    id = Column(Integer, primary_key=True, index=True)
    id_conversa = Column(Integer, ForeignKey("conversas_chat.id"), nullable=False, index=True)
    papel = Column(String(12), nullable=False)  # "usuario" | "assistente"
    texto = Column(Text, nullable=False)
    modelo = Column(String(60), nullable=True)  # modelo de IA que respondeu
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    conversa = relationship("ConversaChat", back_populates="mensagens")
