"""Testes do chat com o assistente de IA. O provedor (Gemini) é simulado: os
testes não usam rede nem chave de API."""
import pytest

from app.assistente import chat, llm
from app.core.config import configuracoes

PERGUNTA = [{"papel": "usuario", "texto": "O fornecedor do servidor está atrasando as entregas."}]


@pytest.fixture
def llm_simulado(monkeypatch):
    chamadas = []

    def responder(instrucoes, mensagens):
        chamadas.append({"instrucoes": instrucoes, "mensagens": mensagens})
        return "Sugestão de risco: atraso do fornecedor."

    monkeypatch.setattr(llm, "responder", responder)
    return chamadas


def test_chat_responde_com_o_contexto_do_projeto(cliente, cabecalho_gerente, risco, llm_simulado):
    resposta = cliente.post(
        "/chat", headers=cabecalho_gerente, json={"id_projeto": risco.id_projeto, "mensagens": PERGUNTA}
    )

    assert resposta.status_code == 200
    assert resposta.json()["resposta"] == "Sugestão de risco: atraso do fornecedor."
    instrucoes = llm_simulado[0]["instrucoes"]
    assert "R01 | Risco de teste" in instrucoes
    assert "P4 × I5 = 20 (Grave)" in instrucoes
    assert "Plano" in instrucoes or "catálogo" in instrucoes.lower()
    assert llm_simulado[0]["mensagens"] == PERGUNTA


def test_chat_envia_a_conversa_inteira(cliente, cabecalho_gerente, projeto_com_gerente, llm_simulado):
    conversa = [
        {"papel": "usuario", "texto": "Tenho um problema com a equipe."},
        {"papel": "assistente", "texto": "Qual é o problema?"},
        {"papel": "usuario", "texto": "Um desenvolvedor vai sair."},
    ]
    cliente.post("/chat", headers=cabecalho_gerente, json={"id_projeto": projeto_com_gerente.id, "mensagens": conversa})

    assert llm_simulado[0]["mensagens"] == conversa


def test_ultima_mensagem_deve_ser_do_usuario(cliente, cabecalho_gerente, projeto_com_gerente, llm_simulado):
    conversa = [*PERGUNTA, {"papel": "assistente", "texto": "Resposta"}]
    resposta = cliente.post(
        "/chat", headers=cabecalho_gerente, json={"id_projeto": projeto_com_gerente.id, "mensagens": conversa}
    )
    assert resposta.status_code == 422
    assert llm_simulado == []


def test_chat_exige_gerente_vinculado(cliente, cabecalho_gerente, projeto, llm_simulado):
    resposta = cliente.post("/chat", headers=cabecalho_gerente, json={"id_projeto": projeto.id, "mensagens": PERGUNTA})
    assert resposta.status_code == 403


def test_chat_e_exclusivo_do_gerente(cliente, cabecalho_admin, projeto, llm_simulado):
    resposta = cliente.post("/chat", headers=cabecalho_admin, json={"id_projeto": projeto.id, "mensagens": PERGUNTA})
    assert resposta.status_code == 403


def test_sem_chave_de_api_o_chat_fica_indisponivel(cliente, cabecalho_gerente, projeto_com_gerente, monkeypatch):
    monkeypatch.setattr(configuracoes, "gemini_api_key", "")
    resposta = cliente.post(
        "/chat", headers=cabecalho_gerente, json={"id_projeto": projeto_com_gerente.id, "mensagens": PERGUNTA}
    )
    assert resposta.status_code == 503
    assert "GEMINI_API_KEY" in resposta.json()["detail"]


def test_falha_do_provedor_vira_502(cliente, cabecalho_gerente, projeto_com_gerente, monkeypatch):
    def falhar(instrucoes, mensagens):
        raise llm.FalhaNoProvedor("Limite de uso da IA atingido.")

    monkeypatch.setattr(llm, "responder", falhar)
    resposta = cliente.post(
        "/chat", headers=cabecalho_gerente, json={"id_projeto": projeto_com_gerente.id, "mensagens": PERGUNTA}
    )
    assert resposta.status_code == 502
    assert "Limite" in resposta.json()["detail"]


def test_instrucoes_sem_riscos_registrados(projeto):
    instrucoes = chat.montar_instrucoes(projeto, [], [])
    assert projeto.nome in instrucoes
    assert "nenhum risco registrado ainda" in instrucoes
    assert "Muito Grave até 25" in instrucoes
