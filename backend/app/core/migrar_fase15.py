"""Migração pontual (fase 15): arquivar projeto.

Adiciona `projetos.arquivado`, se ainda não existir. Idempotente, como as
anteriores: roda a cada subida (ver app/main.py). SQL equivalente em
backend/migracoes/fase15_arquivar_projeto.sql.

Uso:
    python -m app.core.migrar_fase15
"""
from sqlalchemy import inspect, text

from app.database import engine


def adicionar_colunas_fase15() -> list[str]:
    existentes = {c["name"] for c in inspect(engine).get_columns("projetos")}
    if "arquivado" in existentes:
        return []
    with engine.begin() as conexao:
        conexao.execute(text("ALTER TABLE projetos ADD COLUMN arquivado BOOLEAN NOT NULL DEFAULT false"))
    return ["projetos.arquivado"]


def main() -> None:
    criadas = adicionar_colunas_fase15()
    print(f"Migração da fase 15 aplicada: {', '.join(criadas) or 'nenhuma coluna nova'}.")


if __name__ == "__main__":
    main()
