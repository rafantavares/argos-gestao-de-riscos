"""Router de projetos: o gerente cria, lista e edita os projetos a que está vinculado."""
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

roteador = APIRouter(prefix="/projetos", tags=["Projetos"])


def _obter_projeto_acessivel(id_projeto: int, usuario: Usuario, sessao: Session) -> Projeto:
    """Projeto que o gerente autenticado pode ver/editar: os que ele criou ou aos
    quais foi vinculado."""
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
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def criar_projeto(
    dados: ProjetoCriar,
    sessao: Session = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_atual),
):
    novo_projeto = Projeto(nome=dados.nome, descricao=dados.descricao, id_criador=usuario.id)
    sessao.add(novo_projeto)
    sessao.commit()
    sessao.refresh(novo_projeto)

    sessao.add(ProjetoGerente(id_projeto=novo_projeto.id, id_gerente=usuario.id))
    sessao.commit()

    return novo_projeto


@roteador.get("/meus", response_model=List[ProjetoResposta])
def listar_projetos_do_gerente(
    sessao: Session = Depends(obter_sessao), gerente: Usuario = Depends(obter_usuario_atual)
):
    """Projetos vinculados ao gerente autenticado (usado para escolher o projeto ao cadastrar risco)."""
    return (
        sessao.query(Projeto)
        .join(ProjetoGerente, ProjetoGerente.id_projeto == Projeto.id)
        .filter(ProjetoGerente.id_gerente == gerente.id)
        .all()
    )


@roteador.put(
    "/{id_projeto}",
    response_model=ProjetoResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
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
