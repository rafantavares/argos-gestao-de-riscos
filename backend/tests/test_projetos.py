"""Testes de projetos e do vínculo entre projeto e gerente."""


def test_gerente_cria_projeto_vira_criador_e_fica_autovinculado(cliente, cabecalho_gerente, gerente):
    resposta = cliente.post(
        "/projetos", headers=cabecalho_gerente, json={"nome": "Projeto", "descricao": ""}
    )

    assert resposta.status_code == 201
    id_projeto = resposta.json()["id"]
    assert resposta.json()["id_criador"] == gerente.id

    meus = cliente.get("/projetos/meus", headers=cabecalho_gerente)
    assert meus.status_code == 200
    assert id_projeto in [p["id"] for p in meus.json()]


def test_gerente_edita_projeto_vinculado(cliente, cabecalho_gerente, projeto_com_gerente):
    resposta = cliente.put(
        f"/projetos/{projeto_com_gerente.id}",
        headers=cabecalho_gerente,
        json={"nome": "Novo nome", "descricao": None},
    )

    assert resposta.status_code == 200
    assert resposta.json()["nome"] == "Novo nome"


def test_gerente_nao_edita_projeto_de_outro_gerente(cliente, cabecalho_outro_gerente, projeto_com_gerente):
    resposta = cliente.put(
        f"/projetos/{projeto_com_gerente.id}",
        headers=cabecalho_outro_gerente,
        json={"nome": "Novo nome", "descricao": None},
    )

    assert resposta.status_code == 404


def test_gerente_lista_seus_projetos_vinculados(
    cliente, cabecalho_gerente, projeto_com_gerente
):
    resposta = cliente.get("/projetos/meus", headers=cabecalho_gerente)

    assert resposta.status_code == 200
    assert [p["id"] for p in resposta.json()] == [projeto_com_gerente.id]


def test_gerente_sem_vinculo_nao_ve_projetos(cliente, cabecalho_gerente, projeto):
    """O projeto existe, mas o gerente não foi vinculado a ele."""
    resposta = cliente.get("/projetos/meus", headers=cabecalho_gerente)

    assert resposta.status_code == 200
    assert resposta.json() == []


def test_rotas_de_admin_de_projetos_nao_existem_mais(cliente, cabecalho_gerente, projeto_com_gerente):
    assert cliente.get("/projetos", headers=cabecalho_gerente).status_code == 405
    vinculo = cliente.post(
        f"/projetos/{projeto_com_gerente.id}/gerentes", headers=cabecalho_gerente, json={"id_gerente": 1}
    )
    assert vinculo.status_code in (404, 405)
