"""Reúne os schemas Pydantic para facilitar a importação nos routers."""
from app.schemas.usuario import UsuarioBase, UsuarioCriar, UsuarioResposta
from app.schemas.projeto import ProjetoBase, ProjetoCriar, ProjetoAtualizar, ProjetoResposta
from app.schemas.risco import RiscoBase, RiscoCriar, RiscoResposta
from app.schemas.plano_contingencia import (
    PlanoContingenciaBase,
    PlanoContingenciaCriar,
    PlanoContingenciaResposta,
)
from app.schemas.recomendacao import RecomendacaoBase, RecomendacaoResposta, RecomendacaoAtualizar
from app.schemas.projeto_gerente import VincularGerenteRequisicao, ProjetoGerenteResposta
from app.schemas.auth import LoginRequisicao, TokenResposta

__all__ = [
    "UsuarioBase",
    "UsuarioCriar",
    "UsuarioResposta",
    "ProjetoBase",
    "ProjetoCriar",
    "ProjetoAtualizar",
    "ProjetoResposta",
    "RiscoBase",
    "RiscoCriar",
    "RiscoResposta",
    "PlanoContingenciaBase",
    "PlanoContingenciaCriar",
    "PlanoContingenciaResposta",
    "RecomendacaoBase",
    "RecomendacaoResposta",
    "RecomendacaoAtualizar",
    "VincularGerenteRequisicao",
    "ProjetoGerenteResposta",
    "LoginRequisicao",
    "TokenResposta",
]
