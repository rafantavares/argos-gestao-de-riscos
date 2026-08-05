from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user, require_admin, verificar_acesso_projeto
from models import Projeto, Usuario
from models.enums import PerfilUsuario
from schemas.projeto import ProjetoCreate, ProjetoRead, ProjetoUpdate

router = APIRouter(prefix="/projetos", tags=["projetos"])


def _get_projeto_ou_404(projeto_id: int, db: Session) -> Projeto:
    projeto = db.get(Projeto, projeto_id)
    if projeto is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado")
    return projeto


@router.post("", response_model=ProjetoRead, status_code=status.HTTP_201_CREATED)
def criar_projeto(
    dados: ProjetoCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> Projeto:
    responsavel = db.get(Usuario, dados.id_usuario)
    if responsavel is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuário responsável não encontrado"
        )

    projeto = Projeto(**dados.model_dump())
    db.add(projeto)
    db.commit()
    db.refresh(projeto)
    return projeto


@router.get("", response_model=list[ProjetoRead])
def listar_projetos(
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> list[Projeto]:
    stmt = select(Projeto)
    if usuario_atual.perfil != PerfilUsuario.ADMIN:
        stmt = stmt.where(Projeto.id_usuario == usuario_atual.id)
    return list(db.scalars(stmt))


@router.get("/{projeto_id}", response_model=ProjetoRead)
def obter_projeto(
    projeto_id: int,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> Projeto:
    projeto = _get_projeto_ou_404(projeto_id, db)
    verificar_acesso_projeto(projeto, usuario_atual)
    return projeto


@router.put("/{projeto_id}", response_model=ProjetoRead)
def atualizar_projeto(
    projeto_id: int,
    dados: ProjetoUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> Projeto:
    projeto = _get_projeto_ou_404(projeto_id, db)

    if dados.id_usuario is not None and db.get(Usuario, dados.id_usuario) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuário responsável não encontrado"
        )

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(projeto, campo, valor)

    db.commit()
    db.refresh(projeto)
    return projeto


@router.delete("/{projeto_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_projeto(
    projeto_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> None:
    projeto = _get_projeto_ou_404(projeto_id, db)
    db.delete(projeto)
    db.commit()
