"""Testes de projetos e do vínculo entre projeto e gerente."""


def test_admin_cria_projeto(cliente, cabecalho_admin):
    resposta = cliente.post(
        "/projetos",
        headers=cabecalho_admin,
        json={"nome": "Sistema de Folha", "descricao": "Migração legado"},
    )

    assert resposta.status_code == 201
    assert resposta.json()["nome"] == "Sistema de Folha"


def test_gerente_nao_pode_criar_projeto(cliente, cabecalho_gerente):
    resposta = cliente.post(
        "/projetos", headers=cabecalho_gerente, json={"nome": "Projeto", "descricao": ""}
    )

    assert resposta.status_code == 403


def test_admin_lista_apenas_os_proprios_projetos(cliente, sessao, cabecalho_admin, projeto):
    """Projetos de outro admin não podem aparecer na listagem."""
    from app.models.enums import PerfilUsuario
    from app.models.projeto import Projeto
    from app.models.usuario import Usuario

    outro_admin = Usuario(
        nome="Outro Admin",
        email="outro.admin@example.com",
        senha_hash="hash-irrelevante",
        perfil=PerfilUsuario.ADMIN,
    )
    sessao.add(outro_admin)
    sessao.commit()
    sessao.add(Projeto(nome="Projeto Alheio", id_admin=outro_admin.id))
    sessao.commit()

    resposta = cliente.get("/projetos", headers=cabecalho_admin)

    assert resposta.status_code == 200
    nomes = [p["nome"] for p in resposta.json()]
    assert nomes == [projeto.nome]


def test_admin_edita_projeto(cliente, cabecalho_admin, projeto):
    resposta = cliente.put(
        f"/projetos/{projeto.id}", headers=cabecalho_admin, json={"nome": "Nome Novo"}
    )

    assert resposta.status_code == 200
    assert resposta.json()["nome"] == "Nome Novo"


def test_admin_nao_edita_projeto_de_outro_admin(cliente, sessao, cabecalho_admin):
    from app.models.enums import PerfilUsuario
    from app.models.projeto import Projeto
    from app.models.usuario import Usuario

    outro_admin = Usuario(
        nome="Outro Admin",
        email="outro.admin@example.com",
        senha_hash="hash-irrelevante",
        perfil=PerfilUsuario.ADMIN,
    )
    sessao.add(outro_admin)
    sessao.commit()
    projeto_alheio = Projeto(nome="Projeto Alheio", id_admin=outro_admin.id)
    sessao.add(projeto_alheio)
    sessao.commit()
    sessao.refresh(projeto_alheio)

    resposta = cliente.put(
        f"/projetos/{projeto_alheio.id}", headers=cabecalho_admin, json={"nome": "Invadido"}
    )

    assert resposta.status_code == 404


def test_admin_vincula_gerente_ao_projeto(cliente, cabecalho_admin, projeto, gerente):
    resposta = cliente.post(
        f"/projetos/{projeto.id}/gerentes",
        headers=cabecalho_admin,
        json={"id_gerente": gerente.id},
    )

    assert resposta.status_code == 201
    assert resposta.json()["id_gerente"] == gerente.id


def test_vincular_o_mesmo_gerente_duas_vezes_e_rejeitado(
    cliente, cabecalho_admin, projeto_com_gerente, gerente
):
    resposta = cliente.post(
        f"/projetos/{projeto_com_gerente.id}/gerentes",
        headers=cabecalho_admin,
        json={"id_gerente": gerente.id},
    )

    assert resposta.status_code == 400


def test_vincular_gerente_inexistente_e_rejeitado(cliente, cabecalho_admin, projeto):
    resposta = cliente.post(
        f"/projetos/{projeto.id}/gerentes", headers=cabecalho_admin, json={"id_gerente": 9999}
    )

    assert resposta.status_code == 404


def test_vincular_admin_como_gerente_e_rejeitado(cliente, cabecalho_admin, projeto, admin):
    """Só usuários com perfil gerente podem ser vinculados a um projeto."""
    resposta = cliente.post(
        f"/projetos/{projeto.id}/gerentes", headers=cabecalho_admin, json={"id_gerente": admin.id}
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


def test_admin_nao_acessa_rota_de_projetos_do_gerente(cliente, cabecalho_admin):
    assert cliente.get("/projetos/meus", headers=cabecalho_admin).status_code == 403
