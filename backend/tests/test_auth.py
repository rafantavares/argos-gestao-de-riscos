"""Testes de autenticação: cadastro aberto, login, /me e troca de senha."""
from tests.conftest import SENHA_GERENTE


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


def test_cadastro_aberto_cria_gerente_e_ja_devolve_token(cliente):
    resposta = cliente.post(
        "/auth/cadastro",
        json={"nome": "Nova Pessoa", "email": "Nova.Pessoa@example.com", "senha": "senha-nova-123"},
    )

    assert resposta.status_code == 201
    token = resposta.json()["access_token"]
    me = cliente.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    corpo = me.json()
    assert corpo["perfil"] == "gerente"
    # O e-mail é gravado em minúsculas; a senha nunca volta na resposta.
    assert corpo["email"] == "nova.pessoa@example.com"
    assert "senha" not in corpo and "senha_hash" not in corpo


def test_cadastro_com_email_ja_usado_e_recusado(cliente, gerente):
    resposta = cliente.post(
        "/auth/cadastro",
        json={"nome": "Outro Nome", "email": gerente.email.upper(), "senha": "senha-nova-123"},
    )

    assert resposta.status_code == 400


def test_cadastro_valida_senha_e_email(cliente):
    curta = cliente.post("/auth/cadastro", json={"nome": "Fulano", "email": "f@example.com", "senha": "123"})
    invalido = cliente.post("/auth/cadastro", json={"nome": "Fulano", "email": "nao-e-email", "senha": "senha-nova-123"})

    assert curta.status_code == 422
    assert invalido.status_code == 422


def test_login_nao_diferencia_maiusculas_no_email(cliente, gerente):
    resposta = cliente.post("/auth/login", json={"email": gerente.email.upper(), "senha": SENHA_GERENTE})

    assert resposta.status_code == 200


def test_rotas_antigas_do_admin_nao_existem_mais(cliente, cabecalho_gerente):
    assert cliente.get("/auth/gerentes", headers=cabecalho_gerente).status_code in (404, 405)
    assert cliente.get("/riscos/admin/todos", headers=cabecalho_gerente).status_code in (404, 405, 422)
    assert cliente.get("/recomendacoes/admin/todas", headers=cabecalho_gerente).status_code in (404, 405, 422)


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
