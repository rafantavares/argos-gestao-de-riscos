"""Schemas Pydantic da associação ProjetoGerente (vínculo gerente <-> projeto)."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.usuario import UsuarioResposta


class VincularGerenteRequisicao(BaseModel):
    id_gerente: int


class ProjetoGerenteResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_projeto: int
    id_gerente: int
    vinculado_em: datetime
    gerente: UsuarioResposta
