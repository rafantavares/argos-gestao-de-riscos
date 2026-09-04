"""Router de autenticação: login (emissão de JWT), dados do usuário logado e
cadastro/listagem de gerentes (ação exclusiva do admin)."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    criar_hash_senha,
    criar_token_acesso,
    exigir_perfil,
    obter_usuario_atual,
    verificar_senha,
)
from app.database import obter_sessao
from app.models.enums import PerfilUsuario
from app.models.usuario import Usuario
from app.schemas.auth import LoginRequisicao, TokenResposta
from app.schemas.usuario import UsuarioCriar, UsuarioResposta

roteador = APIRouter(prefix="/auth", tags=["Autenticação"])


@roteador.post("/login", response_model=TokenResposta)
def login(credenciais: LoginRequisicao, sessao: Session = Depends(obter_sessao)):
    usuario = sessao.query(Usuario).filter(Usuario.email == credenciais.email).first()

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


@roteador.post(
    "/gerentes",
    response_model=UsuarioResposta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.ADMIN))],
)
def cadastrar_gerente(dados: UsuarioCriar, sessao: Session = Depends(obter_sessao)):
    if dados.perfil != PerfilUsuario.GERENTE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este endpoint cadastra apenas usuários com perfil gerente",
        )

    email_em_uso = sessao.query(Usuario).filter(Usuario.email == dados.email).first()
    if email_em_uso is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um usuário cadastrado com este email",
        )

    novo_gerente = Usuario(
        nome=dados.nome,
        email=dados.email,
        senha_hash=criar_hash_senha(dados.senha),
        perfil=PerfilUsuario.GERENTE,
    )
    sessao.add(novo_gerente)
    sessao.commit()
    sessao.refresh(novo_gerente)
    return novo_gerente


@roteador.get(
    "/gerentes",
    response_model=List[UsuarioResposta],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.ADMIN))],
)
def listar_gerentes(sessao: Session = Depends(obter_sessao)):
    return sessao.query(Usuario).filter(Usuario.perfil == PerfilUsuario.GERENTE).all()
