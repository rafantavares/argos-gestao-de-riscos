"""Model ORM da entidade AnexoRisco: evidências anexadas a um risco (atas,
prints, e-mails, relatórios). O conteúdo fica no próprio banco (bytea), sem
serviço de arquivos à parte; o tamanho é limitado no endpoint de upload."""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, LargeBinary, String, func
from sqlalchemy.orm import deferred, relationship

from app.database import Base


class AnexoRisco(Base):
    __tablename__ = "anexos_riscos"

    id = Column(Integer, primary_key=True, index=True)
    id_risco = Column(Integer, ForeignKey("riscos.id"), nullable=False, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    nome_arquivo = Column(String(255), nullable=False)
    tipo_conteudo = Column(String(120), nullable=False)
    tamanho = Column(Integer, nullable=False)
    # Só é carregado no download, nunca na listagem.
    conteudo = deferred(Column(LargeBinary, nullable=False))
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    risco = relationship("Risco")
