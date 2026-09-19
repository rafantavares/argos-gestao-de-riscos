"""Router de riscos: cadastro e listagem, restritos ao gerente vinculado ao projeto."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.assistente import classificador, coerencia, sugestoes
from app.core.exposicao import nivel_exposicao, pontuacao_exposicao
from app.core.security import exigir_perfil, obter_usuario_atual
from app.database import obter_sessao
from app.models.enums import PerfilUsuario, StatusRisco
from app.models.historico_risco import HistoricoRisco
from app.models.projeto import Projeto
from app.models.projeto_gerente import ProjetoGerente
from app.models.risco import Risco
from app.models.usuario import Usuario
from app.schemas.risco import (
    AssistenteEntrada,
    AssistenteResposta,
    HistoricoRiscoResposta,
    RiscoCriar,
    RiscoPlanoAtualizar,
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


def _proximo_indice(id_projeto: int, sessao: Session) -> str:
    """Próximo identificador do projeto: R01, R02, ... (sequência por projeto)."""
    indices = sessao.query(Risco.indice).filter(Risco.id_projeto == id_projeto).all()
    numeros = [int(i[0][1:]) for i in indices if i[0][1:].isdigit()]
    return f"R{(max(numeros) if numeros else 0) + 1:02d}"


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
        indice=_proximo_indice(dados.id_projeto, sessao),
        titulo=dados.titulo,
        categoria=dados.categoria,
        area_afetada=dados.area_afetada.value,
        descricao_impacto=dados.descricao_impacto,
        probabilidade=dados.probabilidade,
        impacto=dados.impacto,
        mitigacao=dados.mitigacao,
        contingencia=dados.contingencia,
        gatilho=dados.gatilho,
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


@roteador.post(
    "/assistente",
    response_model=AssistenteResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def consultar_assistente(
    dados: AssistenteEntrada,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    """Apoio de IA ao preencher o registro de risco: sugere a área afetada,
    avisa de riscos parecidos já cadastrados no projeto, audita a coerência entre
    descrição e notas e propõe mitigação/contingência/gatilho. Não grava nada."""
    _verificar_gerente_vinculado(dados.id_projeto, gerente, sessao)

    area_sugerida = classificador.sugerir_area(dados.titulo, dados.descricao_impacto)

    existentes = [
        dict(id=r.id, indice=r.indice, titulo=r.titulo, descricao_impacto=r.descricao_impacto)
        for r in sessao.query(Risco).filter(Risco.id_projeto == dados.id_projeto).all()
    ]
    similares = classificador.encontrar_similares(dados.titulo, dados.descricao_impacto, existentes)

    alertas = coerencia.auditar(
        dados.titulo, dados.descricao_impacto, dados.probabilidade, dados.impacto
    )

    area = dados.area_afetada or (area_sugerida["area_afetada"] if area_sugerida else None)
    sugestao_plano = None
    if area is not None and dados.probabilidade and dados.impacto:
        nivel = nivel_exposicao(pontuacao_exposicao(dados.probabilidade, dados.impacto))
        sugestao_plano = sugestoes.gerar_sugestao(area, nivel)

    return AssistenteResposta(
        area_sugerida=area_sugerida,
        similares=similares,
        alertas_coerencia=alertas,
        sugestao_plano=sugestao_plano,
    )


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


@roteador.patch(
    "/{id_risco}/tratamento",
    response_model=RiscoResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def atualizar_tratamento_risco(
    id_risco: int,
    dados: RiscoPlanoAtualizar,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    """O gerente refina a descrição do impacto, a mitigação, a contingência e o gatilho."""
    risco = _obter_risco_do_gerente(id_risco, gerente, sessao)
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(risco, campo, valor)
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
