"""Conexão com o banco de dados PostgreSQL (Supabase) via SQLAlchemy."""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import configuracoes

engine = create_engine(configuracoes.database_url, pool_pre_ping=True)

SessaoLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def obter_sessao():
    """Fornece uma sessão de banco de dados por requisição (dependência do FastAPI)."""
    sessao = SessaoLocal()
    try:
        yield sessao
    finally:
        sessao.close()
