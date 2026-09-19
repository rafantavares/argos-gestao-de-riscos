"""Migração pontual (fase 6): registro de riscos no formato MR-MPS-SW / PMBOK.
Idempotente. Executa o mesmo SQL de backend/migracoes/fase6_registro_riscos_mpsbr.sql
(que também pode ser rodado direto no SQL Editor do Supabase se a conexão
Postgres estiver bloqueada na rede).

Uso:
    python -m app.core.migrar_fase6
"""
from pathlib import Path

from app.database import engine

CAMINHO_SQL = Path(__file__).resolve().parents[2] / "migracoes" / "fase6_registro_riscos_mpsbr.sql"


def main() -> None:
    sql = CAMINHO_SQL.read_text(encoding="utf-8")
    with engine.begin() as conexao:
        conexao.exec_driver_sql(sql)
    print("Migração da fase 6 aplicada (índice, área afetada, tratamento, escala 1-5).")


if __name__ == "__main__":
    main()
