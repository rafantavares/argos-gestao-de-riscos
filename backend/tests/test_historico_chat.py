"""Testes do histórico de conversas com o assistente e do vínculo risco ↔ conversa.
O provedor de IA é simulado (sem rede nem chave)."""
import pytest

from app.assistente import llm

PERGUNTA = "O fornecedor do servidor está atrasando as entregas e isso pode travar a homologação."


@pytest.fixture(autouse=True)
def ia_simulada(monkeypatch):
    def responder(instrucoes, mensagens, formato_json=False, detalhes=None):
        if detalhes is not None:
            detalhes["modelo"] = "modelo-de-teste"
        return f"Resposta para: {mensagens[-1]['texto'][:20]}"

    monkeypatch.setattr(llm, "responder", responder)


def _perguntar(cliente, cabecalho, id_projeto, texto, id_conversa=None, anteriores=()):
    corpo = {
        "id_projeto": id_projeto,
        "mensagens": [*anteriores, {"papel": "usuario", "texto": texto}],
    }
    if id_conversa:
        corpo["id_conversa"] = id_conversa
    return cliente.post("/chat", headers=cabecalho, json=corpo).json()


def test_primeira_mensagem_cria_conversa_com_titulo(cliente, cabecalho_gerente, projeto_com_gerente):
    r = _perguntar(cliente, cabecalho_gerente, projeto_com_gerente.id, PERGUNTA)
    assert r["id_conversa"] and r["titulo"].startswith("O fornecedor do servidor")
    assert len(r["titulo"]) <= 60

    conversa = cliente.get(f"/chat/conversas/{r['id_conversa']}", headers=cabecalho_gerente).json()
    assert [m["papel"] for m in conversa["mensagens"]] == ["usuario", "assistente"]
    assert conversa["mensagens"][1]["modelo"] == "modelo-de-teste"


def test_continuar_conversa_acumula_mensagens_e_lista(cliente, cabecalho_gerente, projeto_com_gerente):
    pid = projeto_com_gerente.id
    r1 = _perguntar(cliente, cabecalho_gerente, pid, "Primeira pergunta")
    anteriores = [{"papel": "usuario", "texto": "Primeira pergunta"}, {"papel": "assistente", "texto": r1["resposta"]}]
    r2 = _perguntar(cliente, cabecalho_gerente, pid, "Segunda pergunta", r1["id_conversa"], anteriores)
    assert r2["id_conversa"] == r1["id_conversa"]

    detalhe = cliente.get(f"/chat/conversas/{r1['id_conversa']}", headers=cabecalho_gerente).json()
    assert len(detalhe["mensagens"]) == 4
    lista = cliente.get(f"/chat/conversas?id_projeto={pid}", headers=cabecalho_gerente).json()
    assert [c["id"] for c in lista] == [r1["id_conversa"]]


def test_renomear_e_excluir_conversa(cliente, cabecalho_gerente, projeto_com_gerente):
    r = _perguntar(cliente, cabecalho_gerente, projeto_com_gerente.id, PERGUNTA)
    url = f"/chat/conversas/{r['id_conversa']}"
    assert cliente.patch(url, headers=cabecalho_gerente, json={"titulo": "Fornecedor"}).json()["titulo"] == "Fornecedor"
    assert cliente.delete(url, headers=cabecalho_gerente).status_code == 204
    assert cliente.get(url, headers=cabecalho_gerente).status_code == 404


def test_outro_gerente_nao_ve_a_conversa(cliente, cabecalho_gerente, cabecalho_outro_gerente, projeto_com_gerente):
    r = _perguntar(cliente, cabecalho_gerente, projeto_com_gerente.id, PERGUNTA)
    assert cliente.get(f"/chat/conversas/{r['id_conversa']}", headers=cabecalho_outro_gerente).status_code == 404


def test_risco_criado_guarda_a_conversa_de_origem(cliente, cabecalho_gerente, projeto_com_gerente):
    r = _perguntar(cliente, cabecalho_gerente, projeto_com_gerente.id, PERGUNTA)
    risco = cliente.post(
        "/riscos",
        headers=cabecalho_gerente,
        json={
            "titulo": "Atraso do fornecedor",
            "area_afetada": "fornecedores",
            "descricao_impacto": "Homologação travada",
            "probabilidade": 3,
            "impacto": 4,
            "orcamento_impacto": "medio",
            "urgencia": "media",
            "fase_projeto": "execucao",
            "id_projeto": projeto_com_gerente.id,
            "id_conversa_origem": r["id_conversa"],
        },
    ).json()
    assert risco["id_conversa_origem"] == r["id_conversa"]

    detalhe = cliente.get(f"/chat/conversas/{r['id_conversa']}", headers=cabecalho_gerente).json()
    assert [x["indice"] for x in detalhe["riscos_criados"]] == [risco["indice"]]

    # Excluir a conversa mantém o risco, só tira o vínculo.
    cliente.delete(f"/chat/conversas/{r['id_conversa']}", headers=cabecalho_gerente)
    assert cliente.get(f"/riscos/{risco['id']}", headers=cabecalho_gerente).json()["id_conversa_origem"] is None


def test_conversa_de_outro_gerente_nao_e_vinculada(
    cliente, cabecalho_gerente, cabecalho_outro_gerente, projeto_com_gerente, outro_gerente, sessao
):
    from app.models.projeto_gerente import ProjetoGerente

    sessao.add(ProjetoGerente(id_projeto=projeto_com_gerente.id, id_gerente=outro_gerente.id))
    sessao.commit()
    alheia = _perguntar(cliente, cabecalho_outro_gerente, projeto_com_gerente.id, PERGUNTA)
    risco = cliente.post(
        "/riscos",
        headers=cabecalho_gerente,
        json={
            "titulo": "Risco qualquer",
            "area_afetada": "equipe",
            "descricao_impacto": "Impacto qualquer",
            "probabilidade": 2,
            "impacto": 2,
            "orcamento_impacto": "baixo",
            "urgencia": "baixa",
            "fase_projeto": "execucao",
            "id_projeto": projeto_com_gerente.id,
            "id_conversa_origem": alheia["id_conversa"],
        },
    ).json()
    assert risco["id_conversa_origem"] is None
