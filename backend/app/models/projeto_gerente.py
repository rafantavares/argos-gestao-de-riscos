"""Model ORM da entidade de associação ProjetoGerente (vínculo N:N gerente <-> projeto).

Um gerente só pode cadastrar riscos em projetos aos quais está vinculado pelo
admin; um projeto pode ter mais de um gerente vinculado.
"""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import relationship

from app.database import Base


class ProjetoGerente(Base):
    __tablename__ = "projetos_gerentes"

    id_projeto = Column(Integer, ForeignKey("projetos.id"), primary_key=True)
    id_gerente = Column(Integer, ForeignKey("usuarios.id"), primary_key=True)
    vinculado_em = Column(DateTime(timezone=True), server_default=func.now())

    projeto = relationship("Projeto", back_populates="vinculos_gerentes")
    gerente = relationship("Usuario", back_populates="vinculos_projetos")
