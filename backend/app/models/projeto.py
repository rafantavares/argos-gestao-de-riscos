"""Model ORM da entidade Projeto."""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, SmallInteger, String, Text, func
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
    # Critérios de risco do projeto (ISO 31000: definidos pela organização, não
    # pelo sistema). Apetite = maior exposição aceitável sem tratamento; acima
    # dela o risco aparece como "fora do apetite".
    apetite_exposicao = Column(SmallInteger, nullable=False, default=15, server_default="15")
    # Prazo máximo, em dias, entre reavaliações (monitoramento contínuo, GPR 17),
    # por faixa de exposição: Muito Grave (21-25), Grave (16-20) e as demais.
    prazo_reavaliacao_muito_grave = Column(SmallInteger, nullable=False, default=7, server_default="7")
    prazo_reavaliacao_grave = Column(SmallInteger, nullable=False, default=15, server_default="15")
    prazo_reavaliacao_demais = Column(SmallInteger, nullable=False, default=30, server_default="30")
    # Projeto arquivado: some das listas junto com os riscos, mas nada é apagado.
    arquivado = Column(Boolean, nullable=False, default=False, server_default="false")

    criador = relationship("Usuario", back_populates="projetos_criados", foreign_keys=[id_criador])
    riscos = relationship("Risco", back_populates="projeto")

    def prazo_reavaliacao(self, exposicao: int) -> int:
        if exposicao >= 21:
            return self.prazo_reavaliacao_muito_grave
        if exposicao >= 16:
            return self.prazo_reavaliacao_grave
        return self.prazo_reavaliacao_demais
    vinculos_gerentes = relationship("ProjetoGerente", back_populates="projeto")
