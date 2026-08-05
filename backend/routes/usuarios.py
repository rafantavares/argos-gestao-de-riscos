from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_admin
from models import Usuario
from schemas.usuario import UsuarioCreate, UsuarioRead
from security import hash_senha

router = APIRouter(prefix="/usuarios", tags=["usuários"])


@router.post("", response_model=UsuarioRead, status_code=status.HTTP_201_CREATED)
def criar_usuario(
    dados: UsuarioCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> Usuario:
    if db.scalar(select(Usuario).where(Usuario.email == dados.email)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado")

    usuario = Usuario(
        nome=dados.nome,
        email=dados.email,
        perfil=dados.perfil,
        senha_hash=hash_senha(dados.senha),
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.get("", response_model=list[UsuarioRead])
def listar_usuarios(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> list[Usuario]:
    return list(db.scalars(select(Usuario)))
