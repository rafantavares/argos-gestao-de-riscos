"""Reúne todos os models para que Base.metadata os reconheça (criação de tabelas)."""
from app.models.usuario import Usuario
from app.models.acesso_usuario import AcessoUsuario
from app.models.evento_risco import EventoRisco
from app.models.projeto import Projeto
from app.models.projeto_gerente import ProjetoGerente
from app.models.risco import Risco
from app.models.historico_risco import HistoricoRisco
from app.models.reavaliacao_risco import ReavaliacaoRisco
from app.models.anexo_risco import AnexoRisco
from app.models.conversa_chat import ConversaChat, MensagemChat
from app.models.plano_contingencia import PlanoContingencia
from app.models.recomendacao import Recomendacao
from app.models.metrica_treinamento import MetricaTreinamento

__all__ = [
    "Usuario",
    "AcessoUsuario",
    "EventoRisco",
    "Projeto",
    "ProjetoGerente",
    "Risco",
    "HistoricoRisco",
    "ReavaliacaoRisco",
    "AnexoRisco",
    "ConversaChat",
    "MensagemChat",
    "PlanoContingencia",
    "Recomendacao",
    "MetricaTreinamento",
]
