"""Router de projetos: CRUD do admin e vínculo de gerentes a projetos."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import exigir_perfil, obter_usuario_atual
from app.database import obter_sessao
from app.models.enums import PerfilUsuario
from app.models.projeto import Projeto
from app.models.projeto_gerente import ProjetoGerente
from app.models.usuario import Usuario
from app.schemas.projeto import ProjetoAtualizar, ProjetoCriar, ProjetoResposta
from app.schemas.projeto_gerente import ProjetoGerenteResposta, VincularGerenteRequisicao

roteador = APIRouter(prefix="/projetos", tags=["Projetos"])


def _obter_projeto_do_admin(id_projeto: int, admin: Usuario, sessao: Session) -> Projeto:
    projeto = (
        sessao.query(Projeto)
        .filter(Projeto.id == id_projeto, Projeto.id_admin == admin.id)
        .first()
    )
    if projeto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado"
        )
    return projeto


def _obter_projeto_acessivel(id_projeto: int, usuario: Usuario, sessao: Session) -> Projeto:
    """Projeto que o usuário autenticado pode ver/editar: para admin, os que ele
    administra; para gerente, os que ele criou ou aos quais foi vinculado."""
    if usuario.perfil == PerfilUsuario.ADMIN:
        return _obter_projeto_do_admin(id_projeto, usuario, sessao)

    projeto = (
        sessao.query(Projeto)
        .join(ProjetoGerente, ProjetoGerente.id_projeto == Projeto.id)
        .filter(Projeto.id == id_projeto, ProjetoGerente.id_gerente == usuario.id)
        .first()
    )
    if projeto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado"
        )
    return projeto


@roteador.post(
    "",
    response_model=ProjetoResposta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.ADMIN, PerfilUsuario.GERENTE))],
)
def criar_projeto(
    dados: ProjetoCriar,
    sessao: Session = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_atual),
):
    if usuario.perfil == PerfilUsuario.ADMIN:
        id_admin = usuario.id
    else:
        admin = sessao.query(Usuario).filter(Usuario.perfil == PerfilUsuario.ADMIN).first()
        if admin is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Nenhum administrador cadastrado no sistema",
            )
        id_admin = admin.id

    novo_projeto = Projeto(nome=dados.nome, descricao=dados.descricao, id_admin=id_admin)
    sessao.add(novo_projeto)
    sessao.commit()
    sessao.refresh(novo_projeto)

    if usuario.perfil == PerfilUsuario.GERENTE:
        sessao.add(ProjetoGerente(id_projeto=novo_projeto.id, id_gerente=usuario.id))
        sessao.commit()

    return novo_projeto


@roteador.get(
    "",
    response_model=List[ProjetoResposta],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.ADMIN))],
)
def listar_projetos(
    sessao: Session = Depends(obter_sessao), admin: Usuario = Depends(obter_usuario_atual)
):
    return sessao.query(Projeto).filter(Projeto.id_admin == admin.id).all()


@roteador.get("/meus", response_model=List[ProjetoResposta])
def listar_projetos_do_gerente(
    sessao: Session = Depends(obter_sessao), gerente: Usuario = Depends(obter_usuario_atual)
):
    """Projetos vinculados ao gerente autenticado (usado para escolher o projeto ao cadastrar risco)."""
    if gerente.perfil != PerfilUsuario.GERENTE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas gerentes possuem projetos vinculados",
        )

    return (
        sessao.query(Projeto)
        .join(ProjetoGerente, ProjetoGerente.id_projeto == Projeto.id)
        .filter(ProjetoGerente.id_gerente == gerente.id)
        .all()
    )


@roteador.put(
    "/{id_projeto}",
    response_model=ProjetoResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.ADMIN, PerfilUsuario.GERENTE))],
)
def editar_projeto(
    id_projeto: int,
    dados: ProjetoAtualizar,
    sessao: Session = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_atual),
):
    projeto = _obter_projeto_acessivel(id_projeto, usuario, sessao)

    if dados.nome is not None:
        projeto.nome = dados.nome
    if dados.descricao is not None:
        projeto.descricao = dados.descricao

    sessao.commit()
    sessao.refresh(projeto)
    return projeto


@roteador.post(
    "/{id_projeto}/gerentes",
    response_model=ProjetoGerenteResposta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.ADMIN))],
)
def vincular_gerente(
    id_projeto: int,
    dados: VincularGerenteRequisicao,
    sessao: Session = Depends(obter_sessao),
    admin: Usuario = Depends(obter_usuario_atual),
):
    _obter_projeto_do_admin(id_projeto, admin, sessao)

    gerente = (
        sessao.query(Usuario)
        .filter(Usuario.id == dados.id_gerente, Usuario.perfil == PerfilUsuario.GERENTE)
        .first()
    )
    if gerente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Gerente não encontrado"
        )

    vinculo_existente = (
        sessao.query(ProjetoGerente)
        .filter(
            ProjetoGerente.id_projeto == id_projeto,
            ProjetoGerente.id_gerente == dados.id_gerente,
        )
        .first()
    )
    if vinculo_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gerente já está vinculado a este projeto",
        )

    novo_vinculo = ProjetoGerente(id_projeto=id_projeto, id_gerente=dados.id_gerente)
    sessao.add(novo_vinculo)
    sessao.commit()
    sessao.refresh(novo_vinculo)
    return novo_vinculo


@roteador.get(
    "/{id_projeto}/gerentes",
    response_model=List[ProjetoGerenteResposta],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.ADMIN))],
)
def listar_gerentes_do_projeto(
    id_projeto: int,
    sessao: Session = Depends(obter_sessao),
    admin: Usuario = Depends(obter_usuario_atual),
):
    _obter_projeto_do_admin(id_projeto, admin, sessao)
    return sessao.query(ProjetoGerente).filter(ProjetoGerente.id_projeto == id_projeto).all()
