from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user, require_admin, verificar_acesso_projeto
from models import Projeto, Risco, Usuario
from models.enums import PerfilUsuario
from schemas.risco import RiscoCreate, RiscoRead, RiscoUpdate

router = APIRouter(prefix="/riscos", tags=["riscos"])


def _get_risco_ou_404(risco_id: int, db: Session) -> Risco:
    risco = db.get(Risco, risco_id)
    if risco is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risco não encontrado")
    return risco


def _get_projeto_ou_404(projeto_id: int, db: Session) -> Projeto:
    projeto = db.get(Projeto, projeto_id)
    if projeto is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado")
    return projeto


@router.post("", response_model=RiscoRead, status_code=status.HTTP_201_CREATED)
def criar_risco(
    dados: RiscoCreate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> Risco:
    projeto = _get_projeto_ou_404(dados.id_projeto, db)
    verificar_acesso_projeto(projeto, usuario_atual)

    risco = Risco(**dados.model_dump())
    db.add(risco)
    db.commit()
    db.refresh(risco)
    return risco


@router.get("", response_model=list[RiscoRead])
def listar_riscos(
    id_projeto: int | None = None,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> list[Risco]:
    stmt = select(Risco)
    if usuario_atual.perfil != PerfilUsuario.ADMIN:
        stmt = stmt.join(Projeto).where(Projeto.id_usuario == usuario_atual.id)
    if id_projeto is not None:
        stmt = stmt.where(Risco.id_projeto == id_projeto)
    return list(db.scalars(stmt))


@router.get("/{risco_id}", response_model=RiscoRead)
def obter_risco(
    risco_id: int,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> Risco:
    risco = _get_risco_ou_404(risco_id, db)
    verificar_acesso_projeto(risco.projeto, usuario_atual)
    return risco


@router.put("/{risco_id}", response_model=RiscoRead)
def atualizar_risco(
    risco_id: int,
    dados: RiscoUpdate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> Risco:
    risco = _get_risco_ou_404(risco_id, db)
    verificar_acesso_projeto(risco.projeto, usuario_atual)

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(risco, campo, valor)

    db.commit()
    db.refresh(risco)
    return risco


@router.delete("/{risco_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_risco(
    risco_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> None:
    risco = _get_risco_ou_404(risco_id, db)
    db.delete(risco)
    db.commit()
