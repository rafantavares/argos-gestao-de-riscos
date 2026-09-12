"""Configuração compartilhada dos testes automatizados.

Estratégia: cada teste roda contra um banco SQLite em memória, criado do zero
e descartado ao final -- não toca no Postgres/Supabase de desenvolvimento. A
dependência `obter_sessao` da aplicação é sobrescrita para apontar para esse
banco de teste.

O evento de startup do FastAPI (que criaria tabelas e rodaria o seed contra o
banco real) não é acionado de propósito: o `TestClient` só executa o ciclo de
vida da aplicação quando usado como context manager, o que estes testes evitam.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401 -- registra todos os models em Base.metadata
from app.core.security import criar_hash_senha
from app.database import Base, obter_sessao
from app.main import app
from app.models.enums import (
    CategoriaRisco,
    FaseProjeto,
    ImpactoRisco,
    OrcamentoImpacto,
    PerfilUsuario,
    ProbabilidadeRisco,
    Urgencia,
)
from app.models.plano_contingencia import PlanoContingencia
from app.models.projeto import Projeto
from app.models.projeto_gerente import ProjetoGerente
from app.models.risco import Risco
from app.models.usuario import Usuario

SENHA_ADMIN = "admin-de-teste"
SENHA_GERENTE = "gerente-de-teste"


# Gerar hash bcrypt custa ~300ms; como as senhas de teste são fixas, o hash é
# calculado uma única vez por sessão de testes e reaproveitado nas fixtures.
@pytest.fixture(scope="session")
def hashes_senhas() -> dict:
    return {
        SENHA_ADMIN: criar_hash_senha(SENHA_ADMIN),
        SENHA_GERENTE: criar_hash_senha(SENHA_GERENTE),
    }


@pytest.fixture
def sessao():
    """Banco SQLite em memória, isolado por teste.

    StaticPool + check_same_thread=False mantêm a mesma conexão viva entre a
    fixture e o TestClient -- sem isso, cada conexão nova enxergaria um banco
    em memória vazio e diferente.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    FabricaSessao = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    sessao_teste = FabricaSessao()
    try:
        yield sessao_teste
    finally:
        sessao_teste.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def cliente(sessao):
    """Cliente HTTP da aplicação, com a sessão de banco apontada para o SQLite."""

    def obter_sessao_de_teste():
        yield sessao

    app.dependency_overrides[obter_sessao] = obter_sessao_de_teste
    # Sem context manager de propósito: assim o TestClient não roda o evento de
    # startup da aplicação, que criaria tabelas e semearia dados no banco real.
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def admin(sessao, hashes_senhas) -> Usuario:
    usuario = Usuario(
        nome="Admin de Teste",
        email="admin@example.com",
        senha_hash=hashes_senhas[SENHA_ADMIN],
        perfil=PerfilUsuario.ADMIN,
    )
    sessao.add(usuario)
    sessao.commit()
    sessao.refresh(usuario)
    return usuario


@pytest.fixture
def gerente(sessao, hashes_senhas) -> Usuario:
    usuario = Usuario(
        nome="Gerente de Teste",
        email="gerente@example.com",
        senha_hash=hashes_senhas[SENHA_GERENTE],
        perfil=PerfilUsuario.GERENTE,
    )
    sessao.add(usuario)
    sessao.commit()
    sessao.refresh(usuario)
    return usuario


@pytest.fixture
def outro_gerente(sessao, hashes_senhas) -> Usuario:
    """Segundo gerente, usado para verificar isolamento entre gerentes."""
    usuario = Usuario(
        nome="Outro Gerente",
        email="outro.gerente@example.com",
        senha_hash=hashes_senhas[SENHA_GERENTE],
        perfil=PerfilUsuario.GERENTE,
    )
    sessao.add(usuario)
    sessao.commit()
    sessao.refresh(usuario)
    return usuario


@pytest.fixture
def projeto(sessao, admin) -> Projeto:
    novo_projeto = Projeto(nome="Projeto de Teste", descricao="Descrição", id_admin=admin.id)
    sessao.add(novo_projeto)
    sessao.commit()
    sessao.refresh(novo_projeto)
    return novo_projeto


@pytest.fixture
def projeto_com_gerente(sessao, projeto, gerente) -> Projeto:
    sessao.add(ProjetoGerente(id_projeto=projeto.id, id_gerente=gerente.id))
    sessao.commit()
    return projeto


@pytest.fixture
def plano(sessao) -> PlanoContingencia:
    novo_plano = PlanoContingencia(
        descricao="Plano de contingência usado nos testes automatizados.",
        categoria=CategoriaRisco.TECNICO,
        probabilidade=ProbabilidadeRisco.ALTA,
        impacto=ImpactoRisco.ALTO,
    )
    sessao.add(novo_plano)
    sessao.commit()
    sessao.refresh(novo_plano)
    return novo_plano


@pytest.fixture
def risco(sessao, projeto_com_gerente, gerente) -> Risco:
    novo_risco = Risco(
        titulo="Risco de teste",
        categoria=CategoriaRisco.TECNICO,
        probabilidade=ProbabilidadeRisco.ALTA,
        impacto=ImpactoRisco.ALTO,
        orcamento_impacto=OrcamentoImpacto.ALTO,
        urgencia=Urgencia.ALTA,
        fase_projeto=FaseProjeto.EXECUCAO,
        id_projeto=projeto_com_gerente.id,
        id_gerente=gerente.id,
    )
    sessao.add(novo_risco)
    sessao.commit()
    sessao.refresh(novo_risco)
    return novo_risco


def autenticar(cliente: TestClient, email: str, senha: str) -> dict:
    """Faz login e devolve o cabeçalho Authorization pronto para uso."""
    resposta = cliente.post("/auth/login", json={"email": email, "senha": senha})
    assert resposta.status_code == 200, resposta.text
    return {"Authorization": f"Bearer {resposta.json()['access_token']}"}


@pytest.fixture
def cabecalho_admin(cliente, admin) -> dict:
    return autenticar(cliente, admin.email, SENHA_ADMIN)


@pytest.fixture
def cabecalho_gerente(cliente, gerente) -> dict:
    return autenticar(cliente, gerente.email, SENHA_GERENTE)


@pytest.fixture
def cabecalho_outro_gerente(cliente, outro_gerente) -> dict:
    return autenticar(cliente, outro_gerente.email, SENHA_GERENTE)
