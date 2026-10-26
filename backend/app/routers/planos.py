"""Router de planos de contingência: catálogo mantido pelos gerentes.

Um plano não é apagado (Recomendacao histórica referencia por FK) -- só
desativado (`ativo=False`), o que o remove das opções que o ML pode
recomendar sem quebrar o histórico de recomendações já geradas.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import exigir_perfil
from app.database import obter_sessao
from app.models.enums import PerfilUsuario
from app.models.plano_contingencia import PlanoContingencia
from app.schemas.plano_contingencia import (
    PlanoContingenciaAtualizar,
    PlanoContingenciaCriar,
    PlanoContingenciaResposta,
)

roteador = APIRouter(
    prefix="/planos",
    tags=["Planos de Contingência"],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)


def _obter_plano(id_plano: int, sessao: Session) -> PlanoContingencia:
    plano = sessao.query(PlanoContingencia).filter(PlanoContingencia.id == id_plano).first()
    if plano is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Plano de contingência não encontrado"
        )
    return plano


@roteador.post("", response_model=PlanoContingenciaResposta, status_code=status.HTTP_201_CREATED)
def criar_plano(dados: PlanoContingenciaCriar, sessao: Session = Depends(obter_sessao)):
    novo_plano = PlanoContingencia(**dados.model_dump())
    sessao.add(novo_plano)
    sessao.commit()
    sessao.refresh(novo_plano)
    return novo_plano


@roteador.get("", response_model=List[PlanoContingenciaResposta])
def listar_planos(sessao: Session = Depends(obter_sessao)):
    return sessao.query(PlanoContingencia).order_by(PlanoContingencia.id).all()


@roteador.put("/{id_plano}", response_model=PlanoContingenciaResposta)
def editar_plano(
    id_plano: int, dados: PlanoContingenciaAtualizar, sessao: Session = Depends(obter_sessao)
):
    plano = _obter_plano(id_plano, sessao)
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(plano, campo, valor)
    sessao.commit()
    sessao.refresh(plano)
    return plano


@roteador.patch("/{id_plano}/ativo", response_model=PlanoContingenciaResposta)
def alternar_ativo_plano(id_plano: int, ativo: bool, sessao: Session = Depends(obter_sessao)):
    plano = _obter_plano(id_plano, sessao)
    plano.ativo = ativo
    sessao.commit()
    sessao.refresh(plano)
    return plano
