"""Testes do catálogo de planos de contingência (mantido pelos gerentes)."""

PLANO_VALIDO = {
    "descricao": "Acionar fornecedor alternativo previamente homologado.",
    "categoria": "externo",
    "probabilidade": "alta",
    "impacto": "alto",
}


def test_gerente_cria_plano(cliente, cabecalho_gerente):
    resposta = cliente.post("/planos", headers=cabecalho_gerente, json=PLANO_VALIDO)

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["descricao"] == PLANO_VALIDO["descricao"]
    assert corpo["ativo"] is True


def test_catalogo_exige_login(cliente):
    assert cliente.get("/planos").status_code == 401
    assert cliente.post("/planos", json=PLANO_VALIDO).status_code == 401


def test_descricao_muito_curta_e_rejeitada(cliente, cabecalho_gerente):
    resposta = cliente.post(
        "/planos", headers=cabecalho_gerente, json={**PLANO_VALIDO, "descricao": "curta"}
    )

    assert resposta.status_code == 422


def test_gerente_lista_planos(cliente, cabecalho_gerente, plano):
    resposta = cliente.get("/planos", headers=cabecalho_gerente)

    assert resposta.status_code == 200
    assert [p["id"] for p in resposta.json()] == [plano.id]


def test_gerente_edita_plano_parcialmente(cliente, cabecalho_gerente, plano):
    """Campos omitidos no PUT devem permanecer inalterados."""
    resposta = cliente.put(
        f"/planos/{plano.id}",
        headers=cabecalho_gerente,
        json={"descricao": "Descrição revisada pelo gerente."},
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["descricao"] == "Descrição revisada pelo gerente."
    assert corpo["categoria"] == plano.categoria.value
    assert corpo["impacto"] == plano.impacto.value


def test_editar_plano_inexistente_retorna_404(cliente, cabecalho_gerente):
    resposta = cliente.put(
        "/planos/9999", headers=cabecalho_gerente, json={"descricao": "Qualquer descrição."}
    )

    assert resposta.status_code == 404


def test_gerente_desativa_e_reativa_plano(cliente, cabecalho_gerente, plano):
    desativado = cliente.patch(
        f"/planos/{plano.id}/ativo?ativo=false", headers=cabecalho_gerente
    )
    assert desativado.status_code == 200
    assert desativado.json()["ativo"] is False

    reativado = cliente.patch(f"/planos/{plano.id}/ativo?ativo=true", headers=cabecalho_gerente)
    assert reativado.status_code == 200
    assert reativado.json()["ativo"] is True


def test_desativar_plano_preserva_recomendacoes_existentes(
    cliente, sessao, cabecalho_gerente, plano, risco
):
    """Plano é desativado, nunca apagado: o histórico de recomendações continua íntegro."""
    from app.models.recomendacao import Recomendacao

    sessao.add(
        Recomendacao(
            id_risco=risco.id,
            id_plano=plano.id,
            algoritmo_usado="random_forest",
            acuracia_momento=0.78,
            aceita=True,
        )
    )
    sessao.commit()

    cliente.patch(f"/planos/{plano.id}/ativo?ativo=false", headers=cabecalho_gerente)

    assert sessao.query(Recomendacao).filter(Recomendacao.id_plano == plano.id).count() == 1
