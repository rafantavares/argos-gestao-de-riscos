"""Router de autenticação: cadastro aberto, login (emissão de JWT), dados do
usuário logado e troca de senha."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import (
    criar_hash_senha,
    criar_token_acesso,
    obter_usuario_atual,
    verificar_senha,
)
from app.database import obter_sessao
from app.models.enums import PerfilUsuario
from app.models.usuario import Usuario
from app.schemas.auth import CadastroRequisicao, LoginRequisicao, TokenResposta, TrocaSenha
from app.schemas.usuario import UsuarioResposta

roteador = APIRouter(prefix="/auth", tags=["Autenticação"])


@roteador.post("/cadastro", response_model=TokenResposta, status_code=status.HTTP_201_CREATED)
def cadastrar(dados: CadastroRequisicao, sessao: Session = Depends(obter_sessao)):
    """Cria a conta (perfil gerente) e já devolve o token, como no login."""
    email = dados.email.lower()
    if sessao.query(Usuario).filter(Usuario.email == email).first() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma conta com este e-mail",
        )
    usuario = Usuario(
        nome=dados.nome.strip(),
        email=email,
        senha_hash=criar_hash_senha(dados.senha),
        perfil=PerfilUsuario.GERENTE,
    )
    sessao.add(usuario)
    sessao.commit()
    return TokenResposta(access_token=criar_token_acesso({"sub": usuario.email}))


@roteador.post("/login", response_model=TokenResposta)
def login(credenciais: LoginRequisicao, sessao: Session = Depends(obter_sessao)):
    # E-mail sem diferenciar maiúsculas (o cadastro grava em minúsculas).
    usuario = sessao.query(Usuario).filter(func.lower(Usuario.email) == credenciais.email.lower()).first()

    if usuario is None or not verificar_senha(credenciais.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
        )

    token_acesso = criar_token_acesso({"sub": usuario.email})
    return TokenResposta(access_token=token_acesso)


@roteador.get("/me", response_model=UsuarioResposta)
def obter_usuario_logado(usuario_atual: Usuario = Depends(obter_usuario_atual)):
    return usuario_atual


@roteador.patch("/me/senha", status_code=status.HTTP_204_NO_CONTENT)
def trocar_senha(
    dados: TrocaSenha,
    sessao: Session = Depends(obter_sessao),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """O próprio usuário troca a senha, confirmando a senha atual."""
    if not verificar_senha(dados.senha_atual, usuario_atual.senha_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A senha atual está incorreta")
    if dados.senha_nova == dados.senha_atual:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A nova senha deve ser diferente da atual")
    usuario = sessao.get(Usuario, usuario_atual.id)
    usuario.senha_hash = criar_hash_senha(dados.senha_nova)
    sessao.commit()
