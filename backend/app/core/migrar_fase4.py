"""Migração pontual (fase 4 — governança de planos): adiciona a coluna `ativo`
em `planos_contingencia` (tabela já existente e populada pelo seed). Idempotente.

Uso:
    python -m app.core.migrar_fase4
"""
from sqlalchemy import text

from app.database import engine

COMANDOS = [
    """
    ALTER TABLE planos_contingencia
        ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;
    """,
    # O seed inicial (app/core/seed.py) insere os 12 planos com id explícito
    # (bulk_insert_mappings), o que NÃO avança a sequence do Postgres -- sem
    # isso, o primeiro INSERT feito pela API (id automático) colide com id=1.
    """
    SELECT setval(
        pg_get_serial_sequence('planos_contingencia', 'id'),
        COALESCE((SELECT MAX(id) FROM planos_contingencia), 0) + 1,
        false
    );
    """,
]


def main() -> None:
    with engine.begin() as conexao:
        for comando in COMANDOS:
            conexao.execute(text(comando))
    print("Migração da fase 4 aplicada (coluna ativo em planos_contingencia).")


if __name__ == "__main__":
    main()
