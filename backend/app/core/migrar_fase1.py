"""Migração pontual (fase 1 — status/histórico de risco): adiciona as colunas
novas em `riscos` (tabela já existente e populada, fora do alcance do
`Base.metadata.create_all`) e cria o tipo enum `status_risco`. Idempotente —
pode ser rodada mais de uma vez sem erro.

Uso:
    python -m app.core.migrar_fase1
"""
from sqlalchemy import text

from app.database import engine

COMANDOS = [
    """
    DO $$ BEGIN
        CREATE TYPE status_risco AS ENUM
            ('identificado', 'em_monitoramento', 'mitigado', 'encerrado');
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END $$;
    """,
    """
    ALTER TABLE riscos
        ADD COLUMN IF NOT EXISTS status status_risco NOT NULL DEFAULT 'identificado';
    """,
    """
    ALTER TABLE riscos
        ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now();
    """,
]


def main() -> None:
    with engine.begin() as conexao:
        for comando in COMANDOS:
            conexao.execute(text(comando))
    print("Migração da fase 1 aplicada (coluna status/atualizado_em em riscos).")


if __name__ == "__main__":
    main()
