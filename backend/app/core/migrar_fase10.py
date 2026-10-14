"""Migração pontual (fase 10): histórico do chat (riscos.id_conversa_origem).
Idempotente. Executa o mesmo SQL de backend/migracoes/fase10_historico_chat.sql
(que também pode ser rodado direto no SQL Editor do Supabase se a conexão
Postgres estiver bloqueada na rede).

Uso:
    python -m app.core.migrar_fase10
"""
from pathlib import Path

from app.database import engine

CAMINHO_SQL = Path(__file__).resolve().parents[2] / "migracoes" / "fase10_historico_chat.sql"


def main() -> None:
    sql = CAMINHO_SQL.read_text(encoding="utf-8")
    with engine.begin() as conexao:
        conexao.exec_driver_sql(sql)
    print("Migração da fase 10 aplicada (riscos.id_conversa_origem).")


if __name__ == "__main__":
    main()
