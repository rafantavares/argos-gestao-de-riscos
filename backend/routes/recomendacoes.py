import difflib

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user, verificar_acesso_projeto
from ml.predict import prever_plano
from models import PlanoContingencia, Recomendacao, Risco, Usuario
from models.enums import AlgoritmoML
from schemas.recomendacao import RecomendacaoDecisao, RecomendacaoRead

router = APIRouter(tags=["recomendações"])


def _get_risco_ou_404(risco_id: int, db: Session) -> Risco:
    risco = db.get(Risco, risco_id)
    if risco is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risco não encontrado")
    return risco


def _buscar_risco_similar(
    db: Session, risco_novo: Risco, texto_sugerido: str
) -> tuple[Risco, float] | None:
    """Entre os riscos históricos da MESMA categoria com plano de contingência
    cadastrado, encontra o mais parecido com o texto sugerido pelo modelo de ML.
    Não busca em outras categorias: planos de contingência são específicos ao
    tipo de risco (uma ação técnica não serve para um risco de equipe, por
    exemplo), então a ausência de histórico na categoria é reportada como tal."""
    stmt = (
        select(Risco)
        .join(PlanoContingencia)
        .where(Risco.id != risco_novo.id, Risco.categoria == risco_novo.categoria)
    )
    candidatos = list(db.scalars(stmt).unique())

    if not candidatos:
        return None

    melhor_risco: Risco | None = None
    melhor_score = -1.0
    for candidato in candidatos:
        for plano in candidato.planos_contingencia:
            texto_candidato = f"{plano.descricao} {plano.acao}"
            score = difflib.SequenceMatcher(None, texto_sugerido, texto_candidato).ratio()
            if score > melhor_score:
                melhor_score = score
                melhor_risco = candidato

    assert melhor_risco is not None
    return melhor_risco, melhor_score


@router.post(
    "/riscos/{risco_id}/recomendacoes",
    response_model=RecomendacaoRead,
    status_code=status.HTTP_201_CREATED,
)
def gerar_recomendacao(
    risco_id: int,
    algoritmo: AlgoritmoML = AlgoritmoML.KNN,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> Recomendacao:
    risco_novo = _get_risco_ou_404(risco_id, db)
    verificar_acesso_projeto(risco_novo.projeto, usuario_atual)

    try:
        sugestao = prever_plano(
            categoria=risco_novo.categoria.value,
            probabilidade=risco_novo.probabilidade.value,
            impacto=risco_novo.impacto.value,
            algoritmo=algoritmo.value,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc

    resultado = _buscar_risco_similar(db, risco_novo, sugestao["plano_contingencia"])
    if resultado is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Nenhum risco histórico da mesma categoria com plano de "
                "contingência cadastrado para comparação."
            ),
        )
    risco_similar, score = resultado

    recomendacao = Recomendacao(
        id_risco_novo=risco_novo.id,
        id_risco_similar=risco_similar.id,
        algoritmo=algoritmo,
        score=score,
        aceita=None,
    )
    db.add(recomendacao)
    db.commit()
    db.refresh(recomendacao)
    return recomendacao


@router.get("/riscos/{risco_id}/recomendacoes", response_model=list[RecomendacaoRead])
def listar_recomendacoes(
    risco_id: int,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> list[Recomendacao]:
    risco = _get_risco_ou_404(risco_id, db)
    verificar_acesso_projeto(risco.projeto, usuario_atual)

    stmt = select(Recomendacao).where(Recomendacao.id_risco_novo == risco_id)
    return list(db.scalars(stmt))


@router.patch("/recomendacoes/{recomendacao_id}", response_model=RecomendacaoRead)
def decidir_recomendacao(
    recomendacao_id: int,
    decisao: RecomendacaoDecisao,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> Recomendacao:
    recomendacao = db.get(Recomendacao, recomendacao_id)
    if recomendacao is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recomendação não encontrada"
        )

    verificar_acesso_projeto(recomendacao.risco_novo.projeto, usuario_atual)

    recomendacao.aceita = decisao.aceita
    db.commit()
    db.refresh(recomendacao)
    return recomendacao
