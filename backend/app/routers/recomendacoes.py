"""Router de recomendações: aciona o ML para recomendar um plano de contingência,
registra o aceite/rejeição do gerente e retreina o modelo com o feedback aceito."""
import json
from datetime import datetime, timezone
from typing import List

import pandas as pd
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import exigir_perfil, obter_usuario_atual
from app.assistente.sugestoes import gerar_sugestao
from app.core.exposicao import nivel_exposicao, pontuacao_exposicao
from app.database import SessaoLocal, obter_sessao
from app.ml.gerar_dataset import nivel_do_plano
from app.ml.predictor import metricas_por_algoritmo, prever_plano_contingencia
from app.ml.preprocessor import carregar_dataset
from app.ml.trainer import treinar_e_avaliar
from app.models.enums import AreaAfetada, PerfilUsuario, StatusRisco
from app.models.historico_risco import HistoricoRisco
from app.models.metrica_treinamento import MetricaTreinamento
from app.models.plano_contingencia import PlanoContingencia
from app.models.projeto import Projeto
from app.models.recomendacao import Recomendacao
from app.models.risco import Risco
from app.models.usuario import Usuario
from app.schemas.metrica_treinamento import MetricaTreinamentoResposta
from app.schemas.recomendacao import RecomendacaoAtualizar, RecomendacaoResposta

roteador = APIRouter(prefix="/recomendacoes", tags=["Recomendações"])


def _retreinar_e_registrar_metricas(dataset: pd.DataFrame) -> None:
    """Roda em background (fora do ciclo de vida do request): retreina os 3
    algoritmos e grava uma linha de histórico por algoritmo. Abre sua própria
    sessão de banco porque tarefas em segundo plano não recebem a sessão via
    Depends do request que as agendou."""
    metricas = treinar_e_avaliar(dataset)

    sessao = SessaoLocal()
    try:
        for algoritmo, valores in metricas_por_algoritmo(metricas).items():
            sessao.add(
                MetricaTreinamento(
                    algoritmo=algoritmo,
                    acuracia=valores["acuracia"],
                    precisao=valores["precisao"],
                    recall=valores["recall"],
                    f1=valores.get("f1"),
                    melhores_parametros=json.dumps(valores.get("melhores_parametros", {})),
                )
            )
        sessao.commit()
    finally:
        sessao.close()


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
    pelo gerente, usados como novos exemplos validados para o retreinamento.
    O rótulo (nível de severidade) é derivado do plano aceito; planos fora do
    catálogo base (cadastrados depois pelos gerentes) não têm nível e são ignorados."""
    dataset_base = carregar_dataset()

    registros_feedback = (
        sessao.query(
            Risco.categoria,
            Risco.probabilidade,
            Risco.impacto,
            Risco.orcamento_impacto,
            Risco.urgencia,
            Risco.fase_projeto,
            Recomendacao.id_plano,
        )
        .join(Recomendacao, Recomendacao.id_risco == Risco.id)
        .filter(Recomendacao.aceita.is_(True))
        .all()
    )

    linhas_feedback = []
    for categoria, probabilidade, impacto, orcamento_impacto, urgencia, fase_projeto, id_plano in registros_feedback:
        nivel = nivel_do_plano(categoria.value, id_plano)
        if nivel is None:
            continue
        linhas_feedback.append(
            {
                "categoria": categoria.value,
                "probabilidade": probabilidade,
                "impacto": impacto,
                "orcamento_impacto": orcamento_impacto.value,
                "urgencia": urgencia.value,
                "fase_projeto": fase_projeto.value,
                "nivel_severidade": nivel,
                "id_plano_contingencia": id_plano,
            }
        )

    if not linhas_feedback:
        return dataset_base

    return pd.concat([dataset_base, pd.DataFrame(linhas_feedback)], ignore_index=True)


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
        probabilidade=risco.probabilidade,
        impacto=risco.impacto,
        orcamento_impacto=risco.orcamento_impacto.value,
        urgencia=risco.urgencia.value,
        fase_projeto=risco.fase_projeto.value,
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
        confianca=resultado.get("confianca"),
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
        .options(joinedload(Recomendacao.plano))  # evita uma consulta por recomendação
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
    return (
        sessao.query(Recomendacao)
        .options(joinedload(Recomendacao.plano))
        .filter(Recomendacao.id_risco == id_risco)
        .all()
    )


@roteador.patch(
    "/{id_recomendacao}",
    response_model=RecomendacaoResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def responder_recomendacao(
    id_recomendacao: int,
    dados: RecomendacaoAtualizar,
    tarefas_em_segundo_plano: BackgroundTasks,
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
    recomendacao.decidida_em = datetime.now(timezone.utc)
    motivo = (dados.motivo_rejeicao or "").strip()
    recomendacao.motivo_rejeicao = motivo if not dados.aceita and motivo else None

    # Aceitar o plano coloca o risco "em tratamento" (só a partir de
    # "identificado", para não regredir um risco já mitigado/monitorado).
    # Rejeitar mantém o status como está.
    risco = recomendacao.risco
    if dados.aceita and risco.status == StatusRisco.IDENTIFICADO:
        risco.status = StatusRisco.EM_TRATAMENTO
        sessao.add(
            HistoricoRisco(
                id_risco=risco.id,
                id_usuario=gerente.id,
                status_anterior=StatusRisco.IDENTIFICADO,
                status_novo=StatusRisco.EM_TRATAMENTO,
                comentario=f"Plano de contingência #{recomendacao.id_plano} aceito via recomendação",
            )
        )

    if dados.aceita:
        # Pré-preenche o que o gerente ainda não escreveu (mitigação, contingência,
        # gatilho): ele passa a revisar a proposta em vez de começar do zero.
        sugestao = gerar_sugestao(
            AreaAfetada(risco.area_afetada),
            nivel_exposicao(pontuacao_exposicao(risco.probabilidade, risco.impacto)),
            descricao_plano=recomendacao.plano.descricao,
        )
        for campo in ("mitigacao", "contingencia", "gatilho"):
            if not getattr(risco, campo):
                setattr(risco, campo, sugestao[campo])

    sessao.commit()
    sessao.refresh(recomendacao)

    if dados.aceita:
        dataset_atualizado = _montar_dataset_com_feedback(sessao)
        # Retreino com GridSearchCV (tuning de hiperparâmetros) roda em segundo plano
        # para não bloquear a resposta ao gerente por dezenas de segundos.
        tarefas_em_segundo_plano.add_task(_retreinar_e_registrar_metricas, dataset_atualizado)

    return recomendacao


@roteador.get(
    "/metricas-historico",
    response_model=List[MetricaTreinamentoResposta],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def listar_historico_metricas(sessao: Session = Depends(obter_sessao)):
    return sessao.query(MetricaTreinamento).order_by(MetricaTreinamento.criado_em).all()
