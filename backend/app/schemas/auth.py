"""Schemas Pydantic de autenticação (login e token JWT)."""
from pydantic import BaseModel, EmailStr


class LoginRequisicao(BaseModel):
    email: EmailStr
    senha: str


class TokenResposta(BaseModel):
    access_token: str
    token_type: str = "bearer"
