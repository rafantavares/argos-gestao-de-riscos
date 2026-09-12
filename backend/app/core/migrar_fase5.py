"""Migração pontual (fase 5): cria o enum `fase_projeto` e a coluna em `riscos`
(backfill 'planejamento'), adiciona o valor 'em_tratamento' ao enum
`status_risco`, a coluna `confianca` em `recomendacoes` e `f1` em
`metricas_treinamento`. Idempotente.

Os mesmos comandos estão em backend/migracoes/fase5_fase_projeto_confianca.sql,
para rodar direto no SQL Editor do Supabase se a conexão Postgres estiver
bloqueada na rede.

Uso:
    python -m app.core.migrar_fase5
"""
from sqlalchemy import text

from app.database import engine

COMANDOS = [
    """
    DO $$ BEGIN
        CREATE TYPE fase_projeto AS ENUM ('iniciacao', 'planejamento', 'execucao', 'encerramento');
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END $$;
    """,
    """
    ALTER TABLE riscos
        ADD COLUMN IF NOT EXISTS fase_projeto fase_projeto NOT NULL DEFAULT 'planejamento';
    """,
    "ALTER TYPE status_risco ADD VALUE IF NOT EXISTS 'em_tratamento' AFTER 'identificado';",
    "ALTER TABLE recomendacoes ADD COLUMN IF NOT EXISTS confianca DOUBLE PRECISION;",
    "ALTER TABLE metricas_treinamento ADD COLUMN IF NOT EXISTS f1 DOUBLE PRECISION;",
]


def main() -> None:
    # AUTOCOMMIT: "ALTER TYPE ... ADD VALUE" não pode rodar dentro de transação.
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conexao:
        for comando in COMANDOS:
            conexao.execute(text(comando))
    print("Migração da fase 5 aplicada (fase_projeto, em_tratamento, confianca, f1).")


if __name__ == "__main__":
    main()
