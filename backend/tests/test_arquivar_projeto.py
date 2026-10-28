"""Arquivar, restaurar e excluir projeto (fase 15)."""


def _arquivar(cliente, cabecalho, id_projeto, arquivado=True):
    return cliente.patch(f"/projetos/{id_projeto}/arquivo", headers=cabecalho, json={"arquivado": arquivado})


def test_arquivar_projeto_esconde_o_projeto_e_os_riscos(cliente, cabecalho_gerente, projeto_com_gerente, risco):
    resposta = _arquivar(cliente, cabecalho_gerente, projeto_com_gerente.id)
    assert resposta.status_code == 200
    assert resposta.json()["arquivado"] is True

    assert cliente.get("/projetos/meus", headers=cabecalho_gerente).json() == []
    todos = cliente.get("/projetos/meus?incluir_arquivados=true", headers=cabecalho_gerente).json()
    assert [p["id"] for p in todos] == [projeto_com_gerente.id]
    assert cliente.get("/riscos", headers=cabecalho_gerente).json() == []

    trilha = cliente.get(f"/riscos/{risco.id}/auditoria", headers=cabecalho_gerente).json()
    assert "Arquivado junto com o projeto" in [e["descricao"] for e in trilha]


def test_restaurar_projeto_devolve_so_os_riscos_arquivados_com_ele(
    cliente, cabecalho_gerente, projeto_com_gerente, risco, sessao
):
    from app.models.risco import Risco

    antigo = Risco(**{c.name: getattr(risco, c.name) for c in Risco.__table__.columns if c.name not in ("id", "indice")})
    antigo.indice = "R99"
    sessao.add(antigo)
    sessao.commit()
    cliente.patch(f"/riscos/{antigo.id}/arquivo", headers=cabecalho_gerente, json={"arquivado": True})

    _arquivar(cliente, cabecalho_gerente, projeto_com_gerente.id)
    restaurado = _arquivar(cliente, cabecalho_gerente, projeto_com_gerente.id, False)
    assert restaurado.status_code == 200, restaurado.json()
    assert restaurado.json()["arquivado"] is False

    ativos = [r["id"] for r in cliente.get("/riscos", headers=cabecalho_gerente).json()]
    assert ativos == [risco.id]  # o que já estava arquivado antes continua arquivado


def test_projeto_arquivado_nao_recebe_riscos_nem_restaura_risco(cliente, cabecalho_gerente, projeto_com_gerente, risco):
    _arquivar(cliente, cabecalho_gerente, projeto_com_gerente.id)
    restaurar = cliente.patch(f"/riscos/{risco.id}/arquivo", headers=cabecalho_gerente, json={"arquivado": False})
    assert restaurar.status_code == 400
    novo = cliente.post("/riscos", headers=cabecalho_gerente, json={"id_projeto": projeto_com_gerente.id})
    assert novo.status_code in (400, 422)


def test_excluir_projeto_sem_riscos(cliente, cabecalho_gerente):
    id_projeto = cliente.post("/projetos", headers=cabecalho_gerente, json={"nome": "Engano"}).json()["id"]
    assert cliente.delete(f"/projetos/{id_projeto}", headers=cabecalho_gerente).status_code == 204
    assert cliente.get("/projetos/meus?incluir_arquivados=true", headers=cabecalho_gerente).json() == []


def test_nao_exclui_projeto_com_riscos_nem_de_outro_gerente(
    cliente, cabecalho_gerente, cabecalho_outro_gerente, projeto_com_gerente, risco
):
    assert cliente.delete(f"/projetos/{projeto_com_gerente.id}", headers=cabecalho_gerente).status_code == 409
    assert cliente.delete(f"/projetos/{projeto_com_gerente.id}", headers=cabecalho_outro_gerente).status_code == 404
    assert _arquivar(cliente, cabecalho_outro_gerente, projeto_com_gerente.id).status_code == 404
