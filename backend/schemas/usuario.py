from pydantic import BaseModel, ConfigDict, EmailStr, Field

from models.enums import PerfilUsuario


class UsuarioBase(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    email: EmailStr
    perfil: PerfilUsuario


class UsuarioCreate(UsuarioBase):
    senha: str = Field(min_length=8, max_length=128)


class UsuarioUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=120)
    email: EmailStr | None = None
    perfil: PerfilUsuario | None = None
    senha: str | None = Field(default=None, min_length=8, max_length=128)


class UsuarioRead(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
