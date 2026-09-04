"""Router de riscos: cadastro e listagem, restritos ao gerente vinculado ao projeto."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import exigir_perfil, obter_usuario_atual
from app.database import obter_sessao
from app.models.enums import PerfilUsuario
from app.models.projeto_gerente import ProjetoGerente
from app.models.risco import Risco
from app.models.usuario import Usuario
from app.schemas.risco import RiscoCriar, RiscoResposta

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
        id_projeto=dados.id_projeto,
        id_gerente=gerente.id,
    )
    sessao.add(novo_risco)
    sessao.commit()
    sessao.refresh(novo_risco)
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
    risco = (
        sessao.query(Risco)
        .filter(Risco.id == id_risco, Risco.id_gerente == gerente.id)
        .first()
    )
    if risco is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risco não encontrado")
    return risco


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
