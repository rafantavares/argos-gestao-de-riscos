"""Migração pontual (fase 2 — novos atributos de ML): cria os tipos enum
`orcamento_impacto`/`urgencia` e adiciona as colunas em `riscos`, com backfill
'medio'/'media' nos riscos já existentes (colunas viram NOT NULL). Idempotente.

Uso:
    python -m app.core.migrar_fase2
"""
from sqlalchemy import text

from app.database import engine

COMANDOS = [
    """
    DO $$ BEGIN
        CREATE TYPE orcamento_impacto AS ENUM ('baixo', 'medio', 'alto');
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END $$;
    """,
    """
    DO $$ BEGIN
        CREATE TYPE urgencia AS ENUM ('baixa', 'media', 'alta');
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END $$;
    """,
    """
    ALTER TABLE riscos
        ADD COLUMN IF NOT EXISTS orcamento_impacto orcamento_impacto NOT NULL DEFAULT 'medio';
    """,
    """
    ALTER TABLE riscos
        ADD COLUMN IF NOT EXISTS urgencia urgencia NOT NULL DEFAULT 'media';
    """,
]


def main() -> None:
    with engine.begin() as conexao:
        for comando in COMANDOS:
            conexao.execute(text(comando))
    print("Migração da fase 2 aplicada (orcamento_impacto/urgencia em riscos).")


if __name__ == "__main__":
    main()
