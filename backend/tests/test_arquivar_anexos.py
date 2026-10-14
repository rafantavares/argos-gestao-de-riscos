"""Testes de arquivamento, edição completa do registro e anexos (evidências)."""


def test_risco_arquivado_some_das_listas_e_pode_ser_restaurado(cliente, cabecalho_gerente, risco):
    resposta = cliente.patch(f"/riscos/{risco.id}/arquivo", headers=cabecalho_gerente, json={"arquivado": True})
    assert resposta.status_code == 200 and resposta.json()["arquivado"] is True

    assert cliente.get("/riscos", headers=cabecalho_gerente).json() == []
    assert cliente.get(f"/riscos/projeto/{risco.id_projeto}", headers=cabecalho_gerente).json() == []
    arquivados = cliente.get("/riscos?incluir_arquivados=true", headers=cabecalho_gerente).json()
    assert [r["id"] for r in arquivados] == [risco.id]

    cliente.patch(f"/riscos/{risco.id}/arquivo", headers=cabecalho_gerente, json={"arquivado": False})
    assert len(cliente.get("/riscos", headers=cabecalho_gerente).json()) == 1


def test_gerente_nao_arquiva_risco_alheio(cliente, cabecalho_outro_gerente, risco):
    resposta = cliente.patch(f"/riscos/{risco.id}/arquivo", headers=cabecalho_outro_gerente, json={"arquivado": True})
    assert resposta.status_code == 404


def test_edicao_completa_atualiza_titulo_area_e_grupo_pmbok(cliente, cabecalho_gerente, risco):
    resposta = cliente.patch(
        f"/riscos/{risco.id}/tratamento",
        headers=cabecalho_gerente,
        json={"titulo": "Novo título do risco", "area_afetada": "fornecedores", "urgencia": "baixa"},
    )
    corpo = resposta.json()
    assert resposta.status_code == 200
    assert corpo["titulo"] == "Novo título do risco"
    assert corpo["area_afetada"] == "fornecedores" and corpo["categoria"] == "externo"
    assert corpo["urgencia"] == "baixa"


def test_anexar_listar_baixar_e_excluir(cliente, cabecalho_gerente, risco):
    url = f"/riscos/{risco.id}/anexos"
    enviado = cliente.post(
        url, headers=cabecalho_gerente, files={"arquivo": ("ata reunião.txt", b"conteudo da ata", "text/plain")}
    )
    assert enviado.status_code == 201
    anexo = enviado.json()
    assert anexo["nome_arquivo"] == "ata reunião.txt" and anexo["tamanho"] == 15

    assert [a["id"] for a in cliente.get(url, headers=cabecalho_gerente).json()] == [anexo["id"]]
    baixado = cliente.get(f"{url}/{anexo['id']}", headers=cabecalho_gerente)
    assert baixado.content == b"conteudo da ata"

    assert cliente.delete(f"{url}/{anexo['id']}", headers=cabecalho_gerente).status_code == 204
    assert cliente.get(url, headers=cabecalho_gerente).json() == []


def test_anexo_acima_de_5mb_e_recusado(cliente, cabecalho_gerente, risco):
    grande = b"0" * (5 * 1024 * 1024 + 1)
    resposta = cliente.post(
        f"/riscos/{risco.id}/anexos", headers=cabecalho_gerente, files={"arquivo": ("grande.bin", grande)}
    )
    assert resposta.status_code == 413


def test_outro_gerente_nao_ve_anexos(cliente, cabecalho_outro_gerente, risco):
    assert cliente.get(f"/riscos/{risco.id}/anexos", headers=cabecalho_outro_gerente).status_code == 404
