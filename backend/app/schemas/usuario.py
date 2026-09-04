"""Schemas Pydantic da entidade Usuario."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import PerfilUsuario


class UsuarioBase(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: EmailStr
    perfil: PerfilUsuario


class UsuarioCriar(UsuarioBase):
    senha: str = Field(min_length=8, max_length=100)


class UsuarioResposta(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    criado_em: datetime
