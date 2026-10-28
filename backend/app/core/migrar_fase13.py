"""Migração pontual (fase 13): critérios de risco por projeto e decisões datadas.

Adiciona, se ainda não existirem:
- em `projetos`: apetite de exposição e prazos de reavaliação por faixa;
- em `recomendacoes`: data da decisão e motivo da rejeição.

Idempotente: confere as colunas existentes antes de criar, então roda a cada
subida da API (ver app/main.py) em Postgres ou SQLite. O SQL equivalente para
o Postgres está em backend/migracoes/fase13_criterios_risco.sql.

Uso:
    python -m app.core.migrar_fase13
"""
from sqlalchemy import inspect, text

from app.database import engine

COLUNAS = {
    "projetos": {
        "apetite_exposicao": "SMALLINT NOT NULL DEFAULT 15",
        "prazo_reavaliacao_muito_grave": "SMALLINT NOT NULL DEFAULT 7",
        "prazo_reavaliacao_grave": "SMALLINT NOT NULL DEFAULT 15",
        "prazo_reavaliacao_demais": "SMALLINT NOT NULL DEFAULT 30",
    },
    "recomendacoes": {
        "decidida_em": "TIMESTAMP WITH TIME ZONE",
        "motivo_rejeicao": "TEXT",
    },
}


def adicionar_colunas_fase13() -> list[str]:
    inspetor = inspect(engine)
    criadas = []
    with engine.begin() as conexao:
        for tabela, colunas in COLUNAS.items():
            existentes = {c["name"] for c in inspetor.get_columns(tabela)}
            for nome, tipo in colunas.items():
                if nome not in existentes:
                    conexao.execute(text(f"ALTER TABLE {tabela} ADD COLUMN {nome} {tipo}"))
                    criadas.append(f"{tabela}.{nome}")
    return criadas


def main() -> None:
    criadas = adicionar_colunas_fase13()
    print(f"Migração da fase 13 aplicada: {', '.join(criadas) or 'nenhuma coluna nova'}.")


if __name__ == "__main__":
    main()
