"""Testes de autenticação e autorização por perfil."""
from tests.conftest import SENHA_ADMIN, SENHA_GERENTE


def test_login_com_credenciais_validas_devolve_token(cliente, gerente):
    resposta = cliente.post(
        "/auth/login", json={"email": gerente.email, "senha": SENHA_GERENTE}
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["token_type"] == "bearer"
    assert corpo["access_token"]


def test_login_com_senha_errada_e_rejeitado(cliente, gerente):
    resposta = cliente.post(
        "/auth/login", json={"email": gerente.email, "senha": "senha-errada"}
    )

    assert resposta.status_code == 401


def test_login_com_email_inexistente_e_rejeitado(cliente):
    resposta = cliente.post(
        "/auth/login", json={"email": "ninguem@example.com", "senha": SENHA_GERENTE}
    )

    assert resposta.status_code == 401


def test_me_devolve_usuario_autenticado(cliente, gerente, cabecalho_gerente):
    resposta = cliente.get("/auth/me", headers=cabecalho_gerente)

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["email"] == gerente.email
    assert corpo["perfil"] == "gerente"


def test_me_sem_token_e_rejeitado(cliente):
    assert cliente.get("/auth/me").status_code == 401


def test_me_com_token_invalido_e_rejeitado(cliente):
    resposta = cliente.get("/auth/me", headers={"Authorization": "Bearer token-invalido"})

    assert resposta.status_code == 401


def test_admin_cadastra_gerente(cliente, cabecalho_admin):
    resposta = cliente.post(
        "/auth/gerentes",
        headers=cabecalho_admin,
        json={
            "nome": "Novo Gerente",
            "email": "novo@example.com",
            "senha": "senha-nova",
            "perfil": "gerente",
        },
    )

    assert resposta.status_code == 201
    assert resposta.json()["perfil"] == "gerente"
    # A senha nunca deve voltar na resposta, nem em texto puro nem como hash.
    assert "senha" not in resposta.json()
    assert "senha_hash" not in resposta.json()


def test_cadastro_de_gerente_com_email_duplicado_e_rejeitado(cliente, cabecalho_admin, gerente):
    resposta = cliente.post(
        "/auth/gerentes",
        headers=cabecalho_admin,
        json={
            "nome": "Outro Nome",
            "email": gerente.email,
            "senha": "senha-nova",
            "perfil": "gerente",
        },
    )

    assert resposta.status_code == 400


def test_gerente_nao_pode_cadastrar_gerente(cliente, cabecalho_gerente):
    """Verifica a restrição de perfil: cadastro de gerente é exclusivo do admin."""
    resposta = cliente.post(
        "/auth/gerentes",
        headers=cabecalho_gerente,
        json={
            "nome": "Gerente Intruso",
            "email": "intruso@example.com",
            "senha": "senha-nova",
            "perfil": "gerente",
        },
    )

    assert resposta.status_code == 403


def test_gerente_nao_pode_listar_gerentes(cliente, cabecalho_gerente):
    assert cliente.get("/auth/gerentes", headers=cabecalho_gerente).status_code == 403


def test_admin_lista_apenas_gerentes(cliente, cabecalho_admin, gerente):
    resposta = cliente.get("/auth/gerentes", headers=cabecalho_admin)

    assert resposta.status_code == 200
    perfis = {usuario["perfil"] for usuario in resposta.json()}
    assert perfis == {"gerente"}


def test_login_de_admin_funciona(cliente, admin):
    resposta = cliente.post("/auth/login", json={"email": admin.email, "senha": SENHA_ADMIN})

    assert resposta.status_code == 200


def test_usuario_troca_a_propria_senha(cliente, gerente):
    from tests.conftest import SENHA_GERENTE, autenticar

    cabecalho = autenticar(cliente, gerente.email, SENHA_GERENTE)
    r = cliente.patch("/auth/me/senha", headers=cabecalho, json={"senha_atual": SENHA_GERENTE, "senha_nova": "nova-senha-123"})
    assert r.status_code == 204
    assert cliente.post("/auth/login", json={"email": gerente.email, "senha": SENHA_GERENTE}).status_code == 401
    assert cliente.post("/auth/login", json={"email": gerente.email, "senha": "nova-senha-123"}).status_code == 200


def test_troca_de_senha_exige_a_senha_atual_correta(cliente, cabecalho_gerente):
    r = cliente.patch("/auth/me/senha", headers=cabecalho_gerente, json={"senha_atual": "errada", "senha_nova": "nova-senha-123"})
    assert r.status_code == 400


def test_nova_senha_curta_e_recusada(cliente, cabecalho_gerente):
    from tests.conftest import SENHA_GERENTE

    r = cliente.patch("/auth/me/senha", headers=cabecalho_gerente, json={"senha_atual": SENHA_GERENTE, "senha_nova": "123"})
    assert r.status_code == 422
