"""Model ORM da entidade Risco."""
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.enums import (
    CategoriaRisco,
    FaseProjeto,
    OrcamentoImpacto,
    StatusRisco,
    Urgencia,
    valores_enum,
)


class Risco(Base):
    __tablename__ = "riscos"
    __table_args__ = (
        CheckConstraint("probabilidade BETWEEN 1 AND 5", name="ck_riscos_probabilidade"),
        CheckConstraint("impacto BETWEEN 1 AND 5", name="ck_riscos_impacto"),
    )

    id = Column(Integer, primary_key=True, index=True)
    # Identificador do risco dentro do projeto ("R01", "R02", ...).
    indice = Column(String(10), nullable=False, default="R01", server_default="R01")
    titulo = Column(String(200), nullable=False)
    # Grupo PMBOK (feature do ML); derivado da área afetada quando não informado.
    categoria = Column(
        Enum(CategoriaRisco, name="categoria_risco", values_callable=valores_enum), nullable=False
    )
    # Categoria de negócio (área do projeto afetada): valores de AreaAfetada.
    area_afetada = Column(
        String(40), nullable=False, default="cronograma", server_default="cronograma"
    )
    descricao_impacto = Column(Text, nullable=False, default="", server_default="")
    # Escalas de 1 a 5 (rótulos em app/core/exposicao.py).
    probabilidade = Column(SmallInteger, nullable=False)
    impacto = Column(SmallInteger, nullable=False)
    orcamento_impacto = Column(
        Enum(OrcamentoImpacto, name="orcamento_impacto", values_callable=valores_enum),
        nullable=False,
    )
    urgencia = Column(
        Enum(Urgencia, name="urgencia", values_callable=valores_enum), nullable=False
    )
    fase_projeto = Column(
        Enum(FaseProjeto, name="fase_projeto", values_callable=valores_enum),
        nullable=False,
        default=FaseProjeto.PLANEJAMENTO,
        server_default=FaseProjeto.PLANEJAMENTO.value,
    )
    mitigacao = Column(Text, nullable=True)
    contingencia = Column(Text, nullable=True)
    gatilho = Column(Text, nullable=True)
    status = Column(
        Enum(StatusRisco, name="status_risco", values_callable=valores_enum),
        nullable=False,
        default=StatusRisco.IDENTIFICADO,
        server_default=StatusRisco.IDENTIFICADO.value,
    )
    # Arquivado = some das listas, painéis, ML e assistente (sem apagar o histórico).
    arquivado = Column(Boolean, nullable=False, default=False, server_default="false")
    id_projeto = Column(Integer, ForeignKey("projetos.id"), nullable=False)
    id_gerente = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    projeto = relationship("Projeto", back_populates="riscos")
    gerente = relationship(
        "Usuario", back_populates="riscos_gerenciados", foreign_keys=[id_gerente]
    )
    recomendacoes = relationship("Recomendacao", back_populates="risco")
    historico = relationship(
        "HistoricoRisco", back_populates="risco", order_by="HistoricoRisco.criado_em"
    )
    reavaliacoes = relationship(
        "ReavaliacaoRisco", back_populates="risco", order_by="ReavaliacaoRisco.criado_em"
    )

    @property
    def ultima_avaliacao_em(self):
        """Data da última reavaliação (ou do cadastro, se nunca foi reavaliado)."""
        return self.reavaliacoes[-1].criado_em if self.reavaliacoes else self.criado_em
