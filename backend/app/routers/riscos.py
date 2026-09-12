"""Router de riscos: cadastro e listagem, restritos ao gerente vinculado ao projeto."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import exigir_perfil, obter_usuario_atual
from app.database import obter_sessao
from app.models.enums import PerfilUsuario, StatusRisco
from app.models.historico_risco import HistoricoRisco
from app.models.projeto import Projeto
from app.models.projeto_gerente import ProjetoGerente
from app.models.risco import Risco
from app.models.usuario import Usuario
from app.schemas.risco import (
    HistoricoRiscoResposta,
    RiscoCriar,
    RiscoResposta,
    RiscoStatusAtualizar,
)

roteador = APIRouter(prefix="/riscos", tags=["Riscos"])


def _verificar_gerente_vinculado(id_projeto: int, gerente: Usuario, sessao: Session) -> None:
    vinculo = (
        sessao.query(ProjetoGerente)
        .filter(
            ProjetoGerente.id_projeto == id_projeto,
            ProjetoGerente.id_gerente == gerente.id,
        )
        .first()
    )
    if vinculo is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gerente não está vinculado a este projeto",
        )


def _obter_risco_do_gerente(id_risco: int, gerente: Usuario, sessao: Session) -> Risco:
    risco = (
        sessao.query(Risco)
        .filter(Risco.id == id_risco, Risco.id_gerente == gerente.id)
        .first()
    )
    if risco is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risco não encontrado")
    return risco


@roteador.post(
    "",
    response_model=RiscoResposta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def cadastrar_risco(
    dados: RiscoCriar,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    _verificar_gerente_vinculado(dados.id_projeto, gerente, sessao)

    novo_risco = Risco(
        titulo=dados.titulo,
        categoria=dados.categoria,
        probabilidade=dados.probabilidade,
        impacto=dados.impacto,
        orcamento_impacto=dados.orcamento_impacto,
        urgencia=dados.urgencia,
        fase_projeto=dados.fase_projeto,
        id_projeto=dados.id_projeto,
        id_gerente=gerente.id,
    )
    sessao.add(novo_risco)
    sessao.commit()
    sessao.refresh(novo_risco)

    sessao.add(
        HistoricoRisco(
            id_risco=novo_risco.id,
            id_usuario=gerente.id,
            status_anterior=None,
            status_novo=StatusRisco.IDENTIFICADO,
            comentario="Risco cadastrado",
        )
    )
    sessao.commit()
    return novo_risco


@roteador.get(
    "",
    response_model=List[RiscoResposta],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def listar_meus_riscos(
    sessao: Session = Depends(obter_sessao), gerente: Usuario = Depends(obter_usuario_atual)
):
    return sessao.query(Risco).filter(Risco.id_gerente == gerente.id).all()


@roteador.get(
    "/{id_risco}",
    response_model=RiscoResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def obter_risco(
    id_risco: int,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    return _obter_risco_do_gerente(id_risco, gerente, sessao)


@roteador.get(
    "/projeto/{id_projeto}",
    response_model=List[RiscoResposta],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def listar_riscos_do_projeto(
    id_projeto: int,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    _verificar_gerente_vinculado(id_projeto, gerente, sessao)
    return sessao.query(Risco).filter(Risco.id_projeto == id_projeto).all()


@roteador.get(
    "/admin/todos",
    response_model=List[RiscoResposta],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.ADMIN))],
)
def listar_todos_riscos_do_admin(
    sessao: Session = Depends(obter_sessao), admin: Usuario = Depends(obter_usuario_atual)
):
    """Riscos de todos os projetos administrados pelo admin autenticado (visão cross-projeto)."""
    return (
        sessao.query(Risco)
        .join(Projeto, Projeto.id == Risco.id_projeto)
        .filter(Projeto.id_admin == admin.id)
        .all()
    )


@roteador.patch(
    "/{id_risco}/status",
    response_model=RiscoResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def atualizar_status_risco(
    id_risco: int,
    dados: RiscoStatusAtualizar,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    risco = _obter_risco_do_gerente(id_risco, gerente, sessao)

    if risco.status == StatusRisco.ENCERRADO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Um risco encerrado não pode mudar de status",
        )

    status_anterior = risco.status
    risco.status = dados.status
    sessao.add(
        HistoricoRisco(
            id_risco=risco.id,
            id_usuario=gerente.id,
            status_anterior=status_anterior,
            status_novo=dados.status,
            comentario=dados.comentario,
        )
    )
    sessao.commit()
    sessao.refresh(risco)
    return risco


@roteador.get(
    "/{id_risco}/historico",
    response_model=List[HistoricoRiscoResposta],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def listar_historico_risco(
    id_risco: int,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    _obter_risco_do_gerente(id_risco, gerente, sessao)
    return (
        sessao.query(HistoricoRisco)
        .filter(HistoricoRisco.id_risco == id_risco)
        .order_by(HistoricoRisco.criado_em)
        .all()
    )
