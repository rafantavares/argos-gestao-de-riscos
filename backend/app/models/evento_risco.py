"""Model ORM da trilha de auditoria do risco (rastreabilidade, MR-MPS-SW).

Guarda o que não fica registrado em outra tabela: edição do registro (com os
valores antes e depois), arquivamento/restauração e anexos. Cadastro, mudanças
de status, reavaliações e decisões sobre recomendações já têm tabela própria e
entram na trilha montada por GET /riscos/{id}/auditoria."""
from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text, func

from app.database import Base


class EventoRisco(Base):
    __tablename__ = "eventos_riscos"

    id = Column(Integer, primary_key=True, index=True)
    id_risco = Column(Integer, ForeignKey("riscos.id"), nullable=False, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    tipo = Column(String(40), nullable=False)
    descricao = Column(Text, nullable=False)
    # Ex.: {"mitigacao": {"antes": "...", "depois": "..."}}
    detalhes = Column(JSON, nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
