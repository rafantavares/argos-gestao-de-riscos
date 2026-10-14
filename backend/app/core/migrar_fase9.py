"""Migração pontual (fase 9): arquivamento de riscos.
Idempotente. Executa o mesmo SQL de backend/migracoes/fase9_arquivar_riscos.sql
(que também pode ser rodado direto no SQL Editor do Supabase se a conexão
Postgres estiver bloqueada na rede).

Uso:
    python -m app.core.migrar_fase9
"""
from pathlib import Path

from app.database import engine

CAMINHO_SQL = Path(__file__).resolve().parents[2] / "migracoes" / "fase9_arquivar_riscos.sql"


def main() -> None:
    sql = CAMINHO_SQL.read_text(encoding="utf-8")
    with engine.begin() as conexao:
        conexao.exec_driver_sql(sql)
    print("Migração da fase 9 aplicada (riscos.arquivado).")


if __name__ == "__main__":
    main()
