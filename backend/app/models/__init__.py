"""Reúne todos os models para que Base.metadata os reconheça (criação de tabelas)."""
from app.models.usuario import Usuario
from app.models.projeto import Projeto
from app.models.projeto_gerente import ProjetoGerente
from app.models.risco import Risco
from app.models.plano_contingencia import PlanoContingencia
from app.models.recomendacao import Recomendacao

__all__ = [
    "Usuario",
    "Projeto",
    "ProjetoGerente",
    "Risco",
    "PlanoContingencia",
    "Recomendacao",
]
