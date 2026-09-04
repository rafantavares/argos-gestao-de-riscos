"""Router de recomendações: aciona o ML para recomendar um plano de contingência,
registra o aceite/rejeição do gerente e retreina o modelo com o feedback aceito."""
from typing import List

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import exigir_perfil, obter_usuario_atual
from app.database import obter_sessao
from app.ml.predictor import prever_plano_contingencia
from app.ml.preprocessor import carregar_dataset
from app.ml.trainer import treinar_e_avaliar
from app.models.enums import PerfilUsuario
from app.models.plano_contingencia import PlanoContingencia
from app.models.recomendacao import Recomendacao
from app.models.risco import Risco
from app.models.usuario import Usuario
from app.schemas.recomendacao import RecomendacaoAtualizar, RecomendacaoResposta

roteador = APIRouter(prefix="/recomendacoes", tags=["Recomendações"])


def _obter_risco_do_gerente(id_risco: int, gerente: Usuario, sessao: Session) -> Risco:
    risco = (
        sessao.query(Risco).filter(Risco.id == id_risco, Risco.id_gerente == gerente.id).first()
    )
    if risco is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risco não encontrado")
    return risco


def _obter_recomendacao_do_gerente(
    id_recomendacao: int, gerente: Usuario, sessao: Session
) -> Recomendacao:
    recomendacao = (
        sessao.query(Recomendacao)
        .join(Risco, Risco.id == Recomendacao.id_risco)
        .filter(Recomendacao.id == id_recomendacao, Risco.id_gerente == gerente.id)
        .first()
    )
    if recomendacao is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recomendação não encontrada"
        )
    return recomendacao


def _montar_dataset_com_feedback(sessao: Session) -> pd.DataFrame:
    """Combina o dataset.csv original com os riscos cuja recomendação foi aceita
    pelo gerente, usados como novos exemplos validados para o retreinamento."""
    dataset_base = carregar_dataset()

    registros_feedback = (
        sessao.query(Risco.categoria, Risco.probabilidade, Risco.impacto, Recomendacao.id_plano)
        .join(Recomendacao, Recomendacao.id_risco == Risco.id)
        .filter(Recomendacao.aceita.is_(True))
        .all()
    )

    if not registros_feedback:
        return dataset_base

    df_feedback = pd.DataFrame(
        [
            {
                "categoria": categoria.value,
                "probabilidade": probabilidade.value,
                "impacto": impacto.value,
                "id_plano_contingencia": id_plano,
            }
            for categoria, probabilidade, impacto, id_plano in registros_feedback
        ]
    )

    return pd.concat([dataset_base, df_feedback], ignore_index=True)


@roteador.post(
    "/gerar/{id_risco}",
    response_model=RecomendacaoResposta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def gerar_recomendacao(
    id_risco: int,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    risco = _obter_risco_do_gerente(id_risco, gerente, sessao)

    resultado = prever_plano_contingencia(
        categoria=risco.categoria.value,
        probabilidade=risco.probabilidade.value,
        impacto=risco.impacto.value,
    )

    plano = (
        sessao.query(PlanoContingencia)
        .filter(PlanoContingencia.id == resultado["id_plano_contingencia"])
        .first()
    )
    if plano is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Plano de contingência recomendado não está cadastrado no banco",
        )

    nova_recomendacao = Recomendacao(
        id_risco=risco.id,
        id_plano=plano.id,
        algoritmo_usado=resultado["algoritmo_usado"],
        acuracia_momento=resultado["acuracia_momento"],
    )
    sessao.add(nova_recomendacao)
    sessao.commit()
    sessao.refresh(nova_recomendacao)
    return nova_recomendacao


@roteador.get(
    "",
    response_model=List[RecomendacaoResposta],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def listar_minhas_recomendacoes(
    sessao: Session = Depends(obter_sessao), gerente: Usuario = Depends(obter_usuario_atual)
):
    return (
        sessao.query(Recomendacao)
        .join(Risco, Risco.id == Recomendacao.id_risco)
        .filter(Risco.id_gerente == gerente.id)
        .all()
    )


@roteador.get(
    "/risco/{id_risco}",
    response_model=List[RecomendacaoResposta],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def listar_recomendacoes_do_risco(
    id_risco: int,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    _obter_risco_do_gerente(id_risco, gerente, sessao)
    return sessao.query(Recomendacao).filter(Recomendacao.id_risco == id_risco).all()


@roteador.patch(
    "/{id_recomendacao}",
    response_model=RecomendacaoResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def responder_recomendacao(
    id_recomendacao: int,
    dados: RecomendacaoAtualizar,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    recomendacao = _obter_recomendacao_do_gerente(id_recomendacao, gerente, sessao)

    if recomendacao.aceita is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta recomendação já foi respondida",
        )

    recomendacao.aceita = dados.aceita
    sessao.commit()
    sessao.refresh(recomendacao)

    if dados.aceita:
        dataset_atualizado = _montar_dataset_com_feedback(sessao)
        treinar_e_avaliar(dataset_atualizado)

    return recomendacao
