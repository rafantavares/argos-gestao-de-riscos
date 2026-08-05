from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
from models import Projeto, Usuario
from models.enums import PerfilUsuario
from security import decodificar_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    credenciais_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decodificar_access_token(token)
    except ValueError:
        raise credenciais_invalidas

    user_id = payload.get("sub")
    if user_id is None:
        raise credenciais_invalidas

    usuario = db.get(Usuario, int(user_id))
    if usuario is None:
        raise credenciais_invalidas

    return usuario


def require_perfil(*perfis: PerfilUsuario):
    def verificador(usuario: Usuario = Depends(get_current_user)) -> Usuario:
        if usuario.perfil not in perfis:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para acessar este recurso.",
            )
        return usuario

    return verificador


require_admin = require_perfil(PerfilUsuario.ADMIN)


def verificar_acesso_projeto(projeto: Projeto, usuario: Usuario) -> None:
    if usuario.perfil == PerfilUsuario.ADMIN:
        return
    if projeto.id_usuario != usuario.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado a este projeto")
