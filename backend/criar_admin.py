"""Cria o primeiro usuário administrador do sistema (executar uma única vez).

Uso: a partir de backend/, com o venv ativo e DATABASE_URL configurada no .env:
    python criar_admin.py
"""

import getpass

from database import Base, SessionLocal, engine
from models import Usuario
from models.enums import PerfilUsuario
from security import hash_senha


def main() -> None:
    Base.metadata.create_all(engine)

    nome = input("Nome do administrador: ").strip()
    email = input("Email: ").strip()
    senha = getpass.getpass("Senha: ")

    db = SessionLocal()
    try:
        if db.query(Usuario).filter(Usuario.email == email).first():
            print(f"Já existe um usuário com o email {email}.")
            return

        admin = Usuario(
            nome=nome,
            email=email,
            senha_hash=hash_senha(senha),
            perfil=PerfilUsuario.ADMIN,
        )
        db.add(admin)
        db.commit()
        print(f"Administrador '{nome}' criado com sucesso.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
