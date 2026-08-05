from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user, require_admin, verificar_acesso_projeto
from models import PlanoContingencia, Risco, Usuario
from models.enums import PerfilUsuario
from schemas.plano_contingencia import (
    PlanoContingenciaCreate,
    PlanoContingenciaRead,
    PlanoContingenciaUpdate,
)

router = APIRouter(prefix="/planos-contingencia", tags=["planos de contingência"])


def _get_risco_ou_404(risco_id: int, db: Session) -> Risco:
    risco = db.get(Risco, risco_id)
    if risco is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risco não encontrado")
    return risco


def _get_plano_ou_404(plano_id: int, db: Session) -> PlanoContingencia:
    plano = db.get(PlanoContingencia, plano_id)
    if plano is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Plano de contingência não encontrado"
        )
    return plano


@router.post("", response_model=PlanoContingenciaRead, status_code=status.HTTP_201_CREATED)
def criar_plano(
    dados: PlanoContingenciaCreate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> PlanoContingencia:
    risco = _get_risco_ou_404(dados.id_risco, db)
    verificar_acesso_projeto(risco.projeto, usuario_atual)

    plano = PlanoContingencia(**dados.model_dump())
    db.add(plano)
    db.commit()
    db.refresh(plano)
    return plano


@router.get("", response_model=list[PlanoContingenciaRead])
def listar_planos(
    id_risco: int | None = None,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> list[PlanoContingencia]:
    stmt = select(PlanoContingencia)
    if id_risco is not None:
        stmt = stmt.where(PlanoContingencia.id_risco == id_risco)

    planos = list(db.scalars(stmt))
    if usuario_atual.perfil != PerfilUsuario.ADMIN:
        planos = [p for p in planos if p.risco.projeto.id_usuario == usuario_atual.id]
    return planos


@router.get("/{plano_id}", response_model=PlanoContingenciaRead)
def obter_plano(
    plano_id: int,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> PlanoContingencia:
    plano = _get_plano_ou_404(plano_id, db)
    verificar_acesso_projeto(plano.risco.projeto, usuario_atual)
    return plano


@router.put("/{plano_id}", response_model=PlanoContingenciaRead)
def atualizar_plano(
    plano_id: int,
    dados: PlanoContingenciaUpdate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> PlanoContingencia:
    plano = _get_plano_ou_404(plano_id, db)
    verificar_acesso_projeto(plano.risco.projeto, usuario_atual)

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(plano, campo, valor)

    db.commit()
    db.refresh(plano)
    return plano


@router.delete("/{plano_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_plano(
    plano_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> None:
    plano = _get_plano_ou_404(plano_id, db)
    db.delete(plano)
    db.commit()
