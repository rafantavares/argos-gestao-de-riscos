"""Reúne todos os models para que Base.metadata os reconheça (criação de tabelas)."""
from app.models.usuario import Usuario
from app.models.projeto import Projeto
from app.models.projeto_gerente import ProjetoGerente
from app.models.risco import Risco
from app.models.historico_risco import HistoricoRisco
from app.models.plano_contingencia import PlanoContingencia
from app.models.recomendacao import Recomendacao
from app.models.metrica_treinamento import MetricaTreinamento

__all__ = [
    "Usuario",
    "Projeto",
    "ProjetoGerente",
    "Risco",
    "HistoricoRisco",
    "PlanoContingencia",
    "Recomendacao",
    "MetricaTreinamento",
]
