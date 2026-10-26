"""Funções de segurança: hash de senha, JWT e dependências de autenticação/autorização."""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import configuracoes
from app.database import obter_sessao
from app.models.enums import PerfilUsuario
from app.models.usuario import Usuario

contexto_senha = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_esquema = OAuth2PasswordBearer(tokenUrl="/auth/login")


def criar_hash_senha(senha: str) -> str:
    return contexto_senha.hash(senha)


def verificar_senha(senha_texto: str, senha_hash: str) -> bool:
    return contexto_senha.verify(senha_texto, senha_hash)


def criar_token_acesso(dados: dict, expira_em: Optional[timedelta] = None) -> str:
    dados_token = dados.copy()
    expiracao = datetime.now(timezone.utc) + (
        expira_em or timedelta(minutes=configuracoes.jwt_expiracao_minutos)
    )
    dados_token.update({"exp": expiracao})
    return jwt.encode(dados_token, configuracoes.jwt_chave_secreta, algorithm=configuracoes.jwt_algoritmo)


def decodificar_token_acesso(token: str) -> Optional[dict]:
    try:
        return jwt.decode(
            token, configuracoes.jwt_chave_secreta, algorithms=[configuracoes.jwt_algoritmo]
        )
    except JWTError:
        return None


def obter_usuario_atual(
    token: str = Depends(oauth2_esquema), sessao: Session = Depends(obter_sessao)
) -> Usuario:
    excecao_credenciais = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )

    dados_token = decodificar_token_acesso(token)
    if dados_token is None or dados_token.get("sub") is None:
        raise excecao_credenciais

    usuario = sessao.query(Usuario).filter(Usuario.email == dados_token["sub"]).first()
    if usuario is None:
        raise excecao_credenciais

    return usuario


def exigir_perfil(*perfis_permitidos: PerfilUsuario):
    """Dependência que restringe uma rota a um ou mais perfis (hoje só existe o gerente)."""

    def verificador(usuario: Usuario = Depends(obter_usuario_atual)) -> Usuario:
        if usuario.perfil not in perfis_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário não tem permissão para executar esta ação",
            )
        return usuario

    return verificador
