"""Testes do catálogo de planos de contingência (governança do admin)."""

PLANO_VALIDO = {
    "descricao": "Acionar fornecedor alternativo previamente homologado.",
    "categoria": "externo",
    "probabilidade": "alta",
    "impacto": "alto",
}


def test_admin_cria_plano(cliente, cabecalho_admin):
    resposta = cliente.post("/planos", headers=cabecalho_admin, json=PLANO_VALIDO)

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["descricao"] == PLANO_VALIDO["descricao"]
    assert corpo["ativo"] is True


def test_gerente_nao_acessa_catalogo_de_planos(cliente, cabecalho_gerente):
    assert cliente.get("/planos", headers=cabecalho_gerente).status_code == 403
    assert cliente.post("/planos", headers=cabecalho_gerente, json=PLANO_VALIDO).status_code == 403


def test_descricao_muito_curta_e_rejeitada(cliente, cabecalho_admin):
    resposta = cliente.post(
        "/planos", headers=cabecalho_admin, json={**PLANO_VALIDO, "descricao": "curta"}
    )

    assert resposta.status_code == 422


def test_admin_lista_planos(cliente, cabecalho_admin, plano):
    resposta = cliente.get("/planos", headers=cabecalho_admin)

    assert resposta.status_code == 200
    assert [p["id"] for p in resposta.json()] == [plano.id]


def test_admin_edita_plano_parcialmente(cliente, cabecalho_admin, plano):
    """Campos omitidos no PUT devem permanecer inalterados."""
    resposta = cliente.put(
        f"/planos/{plano.id}",
        headers=cabecalho_admin,
        json={"descricao": "Descrição revisada pelo administrador."},
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["descricao"] == "Descrição revisada pelo administrador."
    assert corpo["categoria"] == plano.categoria.value
    assert corpo["impacto"] == plano.impacto.value


def test_editar_plano_inexistente_retorna_404(cliente, cabecalho_admin):
    resposta = cliente.put(
        "/planos/9999", headers=cabecalho_admin, json={"descricao": "Qualquer descrição."}
    )

    assert resposta.status_code == 404


def test_admin_desativa_e_reativa_plano(cliente, cabecalho_admin, plano):
    desativado = cliente.patch(
        f"/planos/{plano.id}/ativo?ativo=false", headers=cabecalho_admin
    )
    assert desativado.status_code == 200
    assert desativado.json()["ativo"] is False

    reativado = cliente.patch(f"/planos/{plano.id}/ativo?ativo=true", headers=cabecalho_admin)
    assert reativado.status_code == 200
    assert reativado.json()["ativo"] is True


def test_desativar_plano_preserva_recomendacoes_existentes(
    cliente, sessao, cabecalho_admin, plano, risco
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

    cliente.patch(f"/planos/{plano.id}/ativo?ativo=false", headers=cabecalho_admin)

    assert sessao.query(Recomendacao).filter(Recomendacao.id_plano == plano.id).count() == 1
