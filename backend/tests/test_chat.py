"""Testes do chat com o assistente de IA. O provedor (Gemini) é simulado: os
testes não usam rede nem chave de API."""
import pytest

from app.assistente import chat, llm
from app.core.config import configuracoes

PERGUNTA = [{"papel": "usuario", "texto": "O fornecedor do servidor está atrasando as entregas."}]


@pytest.fixture
def llm_simulado(monkeypatch):
    chamadas = []

    def responder(instrucoes, mensagens, formato_json=False, detalhes=None):
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


def test_chat_exige_login(cliente, projeto, llm_simulado):
    resposta = cliente.post("/chat", json={"id_projeto": projeto.id, "mensagens": PERGUNTA})
    assert resposta.status_code == 401


def test_sem_chave_de_api_o_chat_fica_indisponivel(cliente, cabecalho_gerente, projeto_com_gerente, monkeypatch):
    monkeypatch.setattr(configuracoes, "gemini_api_key", "")
    resposta = cliente.post(
        "/chat", headers=cabecalho_gerente, json={"id_projeto": projeto_com_gerente.id, "mensagens": PERGUNTA}
    )
    assert resposta.status_code == 503
    assert "GEMINI_API_KEY" in resposta.json()["detail"]


def test_falha_do_provedor_vira_502(cliente, cabecalho_gerente, projeto_com_gerente, monkeypatch):
    def falhar(instrucoes, mensagens, formato_json=False, detalhes=None):
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


# ---------- plano B entre modelos (provedor simulado) ----------


class _ClienteFalso:
    """Imita genai.Client: cada modelo responde ou falha conforme `roteiro`."""

    def __init__(self, roteiro):
        self.roteiro = roteiro
        self.chamados = []
        self.models = self

    def generate_content(self, model, contents, config):
        from types import SimpleNamespace

        self.chamados.append(model)
        resultado = self.roteiro[model]
        if isinstance(resultado, Exception):
            raise resultado
        return SimpleNamespace(text=resultado)


def _erro(codigo):
    from google.genai import errors

    classe = errors.ServerError if codigo >= 500 else errors.ClientError
    return classe(codigo, {"error": {"code": codigo, "message": "simulado"}})


@pytest.fixture
def modelos(monkeypatch):
    monkeypatch.setattr(configuracoes, "gemini_api_key", "chave-de-teste")
    monkeypatch.setattr(configuracoes, "gemini_model", "principal")
    monkeypatch.setattr(configuracoes, "gemini_modelos_reserva", "reserva1, reserva2")

    def instalar(roteiro):
        cliente = _ClienteFalso(roteiro)
        monkeypatch.setattr(llm, "_cliente", lambda: cliente)
        return cliente

    return instalar


def test_usa_o_modelo_principal_quando_ele_responde(modelos):
    cliente = modelos({"principal": "ok"})
    assert llm.responder("x", PERGUNTA) == "ok"
    assert cliente.chamados == ["principal"]


def test_modelo_sobrecarregado_passa_para_o_reserva(modelos):
    cliente = modelos({"principal": _erro(503), "reserva1": _erro(429), "reserva2": "resposta"})
    assert llm.responder("x", PERGUNTA) == "resposta"
    assert cliente.chamados == ["principal", "reserva1", "reserva2"]


def test_todos_os_modelos_sobrecarregados(modelos):
    modelos({"principal": _erro(503), "reserva1": _erro(503), "reserva2": _erro(503)})
    with pytest.raises(llm.FalhaNoProvedor, match="sobrecarregado"):
        llm.responder("x", PERGUNTA)


def test_erro_que_nao_e_de_disponibilidade_nao_troca_de_modelo(modelos):
    cliente = modelos({"principal": _erro(400), "reserva1": "nao deveria chegar aqui"})
    with pytest.raises(llm.FalhaNoProvedor, match="400"):
        llm.responder("x", PERGUNTA)
    assert cliente.chamados == ["principal"]


def test_lista_de_modelos_sem_repetidos(monkeypatch):
    monkeypatch.setattr(configuracoes, "gemini_model", "a")
    monkeypatch.setattr(configuracoes, "gemini_modelos_reserva", "b, a, ,c")
    assert llm.modelos_em_ordem() == ["a", "b", "c"]


# ---------- rascunho de risco a partir da conversa ----------


def test_rascunho_interpreta_e_valida_os_campos():
    texto = (
        '```json\n{"titulo": "Saida de dev", "area_afetada": "equipe", '
        '"probabilidade": 9, "impacto": "4", "gatilho": "aviso previo"}\n```'
    )
    r = chat.interpretar_rascunho(texto)
    assert r["titulo"] == "Saida de dev" and r["area_afetada"] == "equipe"
    assert r["probabilidade"] == 5 and r["impacto"] == 4 and r["mitigacao"] == ""


def test_rascunho_descarta_area_invalida_e_texto_quebrado():
    assert chat.interpretar_rascunho('{"area_afetada": "marte"}')["area_afetada"] is None
    assert chat.interpretar_rascunho("sem json aqui")["titulo"] == ""


def test_endpoint_de_rascunho(cliente, cabecalho_gerente, projeto_com_gerente, monkeypatch):
    pedidos = []

    def responder(instrucoes, mensagens, formato_json=False, detalhes=None):
        pedidos.append((instrucoes, mensagens, formato_json))
        return '{"titulo": "Atraso do fornecedor", "area_afetada": "fornecedores", "probabilidade": 3, "impacto": 4}'

    monkeypatch.setattr(llm, "responder", responder)
    conversa = [*PERGUNTA, {"papel": "assistente", "texto": "Sugestão..."}]
    resposta = cliente.post(
        "/chat/rascunho", headers=cabecalho_gerente, json={"id_projeto": projeto_com_gerente.id, "mensagens": conversa}
    )
    assert resposta.status_code == 200
    assert resposta.json()["area_afetada"] == "fornecedores"
    instrucoes, mensagens, formato_json = pedidos[0]
    assert formato_json and "JSON" in instrucoes and mensagens[-1]["papel"] == "usuario"
