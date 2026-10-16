"""Schemas Pydantic de autenticação (login e token JWT)."""
from pydantic import BaseModel, EmailStr, Field


class LoginRequisicao(BaseModel):
    email: EmailStr
    senha: str


class TokenResposta(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TrocaSenha(BaseModel):
    senha_atual: str
    senha_nova: str = Field(min_length=8, max_length=100)
