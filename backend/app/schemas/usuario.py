"""Schemas Pydantic da entidade Usuario."""
from datetime import datetime
from typing import Optional

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
    cargo: Optional[str] = None
    organizacao: Optional[str] = None
    preferencias: Optional[dict] = None


class UsuarioAtualizar(BaseModel):
    nome: Optional[str] = Field(default=None, min_length=2, max_length=120)
    cargo: Optional[str] = Field(default=None, max_length=120)
    organizacao: Optional[str] = Field(default=None, max_length=150)


class NotificacoesPreferidas(BaseModel):
    apetite: bool = True
    decidir: bool = True
    reavaliar: bool = True


class PreferenciasUsuario(BaseModel):
    """Só as chaves conhecidas são guardadas (o resto é descartado)."""

    tema: Optional[str] = Field(default=None, pattern="^(dark|light)$")
    escala: Optional[str] = Field(default=None, pattern="^(padrao|daltonico)$")
    tamanho_texto: Optional[str] = Field(default=None, pattern="^(padrao|grande|maior)$")
    reduzir_animacoes: Optional[bool] = None
    notificacoes: Optional[NotificacoesPreferidas] = None
    resumo_semanal: Optional[bool] = None


class AcessoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    criado_em: datetime
    ip: Optional[str] = None
    navegador: Optional[str] = None


class ExclusaoConta(BaseModel):
    senha: str
