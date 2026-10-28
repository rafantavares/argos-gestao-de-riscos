"""Migração pontual (fase 14): dados da conta, preferências e sessões.

Adiciona em `usuarios`, se ainda não existirem: cargo, organização,
preferências (JSON), versão do token (para encerrar as outras sessões) e a
data de exclusão da conta (LGPD). As tabelas novas (acessos_usuarios,
eventos_riscos) saem do create_all na subida da API.

Idempotente, como a da fase 13: roda a cada subida (ver app/main.py). SQL
equivalente em backend/migracoes/fase14_conta_auditoria.sql.

Uso:
    python -m app.core.migrar_fase14
"""
from sqlalchemy import inspect, text

from app.database import engine

COLUNAS = {
    "usuarios": {
        "cargo": "VARCHAR(120)",
        "organizacao": "VARCHAR(150)",
        "preferencias": "JSON",
        "versao_token": "INTEGER NOT NULL DEFAULT 0",
        "excluido_em": "TIMESTAMP WITH TIME ZONE",
    },
}


def adicionar_colunas_fase14() -> list[str]:
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
    criadas = adicionar_colunas_fase14()
    print(f"Migração da fase 14 aplicada: {', '.join(criadas) or 'nenhuma coluna nova'}.")


if __name__ == "__main__":
    main()
