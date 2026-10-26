"""Migração pontual (fase 12): fim do perfil admin.

Todo usuário passa a ser gerente de projetos. Converte as contas que ainda têm
perfil "admin" (o valor continua existindo no tipo perfil_usuario do Postgres,
sem uso). Idempotente: roda a cada subida da API (ver app/main.py) e também pode
ser executada à mão ou pelo SQL de backend/migracoes/fase12_fim_admin.sql.

Uso:
    python -m app.core.migrar_fase12
"""
from sqlalchemy import text

from app.database import engine

SQL = "UPDATE usuarios SET perfil = 'gerente' WHERE perfil = 'admin'"


def converter_admins_em_gerentes() -> int:
    with engine.begin() as conexao:
        return conexao.execute(text(SQL)).rowcount or 0


def main() -> None:
    convertidos = converter_admins_em_gerentes()
    print(f"Migração da fase 12 aplicada: {convertidos} conta(s) admin convertida(s) em gerente.")


if __name__ == "__main__":
    main()
