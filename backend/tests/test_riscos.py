"""Testes de cadastro de riscos, isolamento entre gerentes e ciclo de vida
(status + histórico)."""

RISCO_VALIDO = {
    "titulo": "Indisponibilidade do fornecedor de nuvem",
    "area_afetada": "fornecedores",
    "descricao_impacto": "Sistema fora do ar para os clientes até o fornecedor restabelecer o serviço.",
    "probabilidade": 3,
    "impacto": 4,
    "orcamento_impacto": "alto",
    "urgencia": "media",
    "fase_projeto": "execucao",
}


def test_gerente_cadastra_risco_em_projeto_vinculado(
    cliente, cabecalho_gerente, projeto_com_gerente
):
    resposta = cliente.post(
        "/riscos",
        headers=cabecalho_gerente,
        json={**RISCO_VALIDO, "id_projeto": projeto_com_gerente.id},
    )

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["titulo"] == RISCO_VALIDO["titulo"]
    assert corpo["status"] == "identificado"
    assert corpo["fase_projeto"] == "execucao"


def test_cadastro_de_risco_grava_primeiro_evento_do_historico(
    cliente, cabecalho_gerente, projeto_com_gerente
):
    id_risco = cliente.post(
        "/riscos",
        headers=cabecalho_gerente,
        json={**RISCO_VALIDO, "id_projeto": projeto_com_gerente.id},
    ).json()["id"]

    historico = cliente.get(f"/riscos/{id_risco}/historico", headers=cabecalho_gerente).json()

    assert len(historico) == 1
    assert historico[0]["status_anterior"] is None
    assert historico[0]["status_novo"] == "identificado"


def test_gerente_nao_cadastra_risco_em_projeto_nao_vinculado(
    cliente, cabecalho_gerente, projeto
):
    resposta = cliente.post(
        "/riscos", headers=cabecalho_gerente, json={**RISCO_VALIDO, "id_projeto": projeto.id}
    )

    assert resposta.status_code == 403


def test_cadastro_sem_os_novos_atributos_de_ml_e_rejeitado(
    cliente, cabecalho_gerente, projeto_com_gerente
):
    """orcamento_impacto, urgencia e fase_projeto são obrigatórios: alimentam o modelo de ML."""
    payload = {
        k: v
        for k, v in RISCO_VALIDO.items()
        if k not in ("orcamento_impacto", "urgencia", "fase_projeto")
    }

    resposta = cliente.post(
        "/riscos", headers=cabecalho_gerente, json={**payload, "id_projeto": projeto_com_gerente.id}
    )

    assert resposta.status_code == 422


def test_fase_do_projeto_invalida_e_rejeitada(cliente, cabecalho_gerente, projeto_com_gerente):
    resposta = cliente.post(
        "/riscos",
        headers=cabecalho_gerente,
        json={**RISCO_VALIDO, "fase_projeto": "manutencao", "id_projeto": projeto_com_gerente.id},
    )

    assert resposta.status_code == 422


def test_categoria_invalida_e_rejeitada(cliente, cabecalho_gerente, projeto_com_gerente):
    resposta = cliente.post(
        "/riscos",
        headers=cabecalho_gerente,
        json={**RISCO_VALIDO, "categoria": "inexistente", "id_projeto": projeto_com_gerente.id},
    )

    assert resposta.status_code == 422


def test_gerente_lista_apenas_os_proprios_riscos(
    cliente, cabecalho_outro_gerente, risco
):
    """O risco pertence a outro gerente e não deve aparecer nesta listagem."""
    resposta = cliente.get("/riscos", headers=cabecalho_outro_gerente)

    assert resposta.status_code == 200
    assert resposta.json() == []


def test_gerente_nao_acessa_risco_de_outro_gerente(cliente, cabecalho_outro_gerente, risco):
    assert cliente.get(f"/riscos/{risco.id}", headers=cabecalho_outro_gerente).status_code == 404


def test_atualizar_status_registra_transicao_no_historico(cliente, cabecalho_gerente, risco):
    resposta = cliente.patch(
        f"/riscos/{risco.id}/status",
        headers=cabecalho_gerente,
        json={"status": "em_monitoramento", "comentario": "Acompanhando com o fornecedor"},
    )

    assert resposta.status_code == 200
    assert resposta.json()["status"] == "em_monitoramento"

    historico = cliente.get(f"/riscos/{risco.id}/historico", headers=cabecalho_gerente).json()
    ultimo = historico[-1]
    assert ultimo["status_anterior"] == "identificado"
    assert ultimo["status_novo"] == "em_monitoramento"
    assert ultimo["comentario"] == "Acompanhando com o fornecedor"


def test_status_encerrado_e_terminal(cliente, cabecalho_gerente, risco):
    """Uma vez encerrado, o risco não volta a nenhum outro status."""
    cliente.patch(
        f"/riscos/{risco.id}/status", headers=cabecalho_gerente, json={"status": "encerrado"}
    )

    resposta = cliente.patch(
        f"/riscos/{risco.id}/status",
        headers=cabecalho_gerente,
        json={"status": "em_monitoramento"},
    )

    assert resposta.status_code == 400


def test_gerente_nao_altera_status_de_risco_alheio(cliente, cabecalho_outro_gerente, risco):
    resposta = cliente.patch(
        f"/riscos/{risco.id}/status",
        headers=cabecalho_outro_gerente,
        json={"status": "mitigado"},
    )

    assert resposta.status_code == 404


def test_status_invalido_e_rejeitado(cliente, cabecalho_gerente, risco):
    resposta = cliente.patch(
        f"/riscos/{risco.id}/status", headers=cabecalho_gerente, json={"status": "arquivado"}
    )

    assert resposta.status_code == 422


def test_comentario_e_opcional_na_mudanca_de_status(cliente, cabecalho_gerente, risco):
    resposta = cliente.patch(
        f"/riscos/{risco.id}/status", headers=cabecalho_gerente, json={"status": "mitigado"}
    )

    assert resposta.status_code == 200
    historico = cliente.get(f"/riscos/{risco.id}/historico", headers=cabecalho_gerente).json()
    assert historico[-1]["comentario"] is None


