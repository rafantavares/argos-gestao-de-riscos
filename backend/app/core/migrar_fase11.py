"""Migração pontual (fase 11): risco residual.
Idempotente. Executa o mesmo SQL de backend/migracoes/fase11_risco_residual.sql
(que também pode ser rodado direto no SQL Editor do Supabase se a conexão
Postgres estiver bloqueada na rede).

Uso:
    python -m app.core.migrar_fase11
"""
from pathlib import Path

from app.database import engine

CAMINHO_SQL = Path(__file__).resolve().parents[2] / "migracoes" / "fase11_risco_residual.sql"


def main() -> None:
    sql = CAMINHO_SQL.read_text(encoding="utf-8")
    with engine.begin() as conexao:
        conexao.exec_driver_sql(sql)
    print("Migração da fase 11 aplicada (riscos.probabilidade_residual / impacto_residual).")


if __name__ == "__main__":
    main()
