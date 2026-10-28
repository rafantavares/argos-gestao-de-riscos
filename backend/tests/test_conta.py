"""Conta do usuário (fase 14): dados profissionais, preferências, acessos,
sessões, direitos do titular (LGPD), trilha de auditoria do risco e resumo."""
from app.core import resumo as modulo_resumo
from app.core.config import configuracoes
from app.routers import tarefas as router_tarefas
from tests.conftest import SENHA_GERENTE, autenticar


# ---------- dados e preferências ----------


def test_atualiza_cargo_e_organizacao_e_texto_vazio_apaga(cliente, cabecalho_gerente):
    r = cliente.patch("/auth/me", headers=cabecalho_gerente, json={"cargo": " Gerente de TI ", "organizacao": "Empresa X"})
    assert r.status_code == 200
    assert r.json()["cargo"] == "Gerente de TI" and r.json()["organizacao"] == "Empresa X"

    r = cliente.patch("/auth/me", headers=cabecalho_gerente, json={"cargo": ""})
    assert r.json()["cargo"] is None and r.json()["organizacao"] == "Empresa X"


def test_preferencias_sao_mescladas_e_validadas(cliente, cabecalho_gerente):
    cliente.put("/auth/me/preferencias", headers=cabecalho_gerente, json={"tema": "light", "escala": "daltonico"})
    r = cliente.put(
        "/auth/me/preferencias",
        headers=cabecalho_gerente,
        json={"tamanho_texto": "grande", "notificacoes": {"reavaliar": False}, "chave_desconhecida": 1},
    )
    prefs = r.json()["preferencias"]
    assert prefs["tema"] == "light" and prefs["escala"] == "daltonico" and prefs["tamanho_texto"] == "grande"
    assert prefs["notificacoes"] == {"apetite": True, "decidir": True, "reavaliar": False}
    assert "chave_desconhecida" not in prefs

    assert cliente.put("/auth/me/preferencias", headers=cabecalho_gerente, json={"tema": "roxo"}).status_code == 422


# ---------- acessos e sessões ----------


def test_login_registra_o_acesso(cliente, gerente):
    cabecalho = autenticar(cliente, gerente.email, SENHA_GERENTE)
    acessos = cliente.get("/auth/me/acessos", headers=cabecalho).json()
    assert len(acessos) == 1 and acessos[0]["navegador"]


def test_encerrar_outras_sessoes_invalida_tokens_antigos(cliente, gerente):
    antigo = autenticar(cliente, gerente.email, SENHA_GERENTE)
    outro = autenticar(cliente, gerente.email, SENHA_GERENTE)

    novo = cliente.post("/auth/me/encerrar-outras-sessoes", headers=antigo).json()["access_token"]

    assert cliente.get("/auth/me", headers=outro).status_code == 401
    assert cliente.get("/auth/me", headers=antigo).status_code == 401
    assert cliente.get("/auth/me", headers={"Authorization": f"Bearer {novo}"}).status_code == 200


# ---------- LGPD ----------


def test_exportar_dados_traz_conta_e_riscos(cliente, cabecalho_gerente, risco):
    dados = cliente.get("/auth/me/dados", headers=cabecalho_gerente).json()
    assert dados["conta"]["email"] == "gerente@example.com"
    assert [r["indice"] for r in dados["riscos"]] == [risco.indice]
    assert dados["projetos"][0]["id"] == risco.id_projeto


def test_excluir_conta_exige_senha_e_anonimiza(cliente, gerente, cabecalho_gerente, risco):
    assert cliente.post("/auth/me/excluir", headers=cabecalho_gerente, json={"senha": "errada"}).status_code == 400

    assert cliente.post("/auth/me/excluir", headers=cabecalho_gerente, json={"senha": SENHA_GERENTE}).status_code == 204

    assert cliente.get("/auth/me", headers=cabecalho_gerente).status_code == 401
    assert cliente.post("/auth/login", json={"email": "gerente@example.com", "senha": SENHA_GERENTE}).status_code == 401
    # O e-mail fica livre para uma conta nova.
    assert cliente.post("/auth/cadastro", json={"nome": "Outra pessoa", "email": "gerente@example.com", "senha": "senha-nova-123"}).status_code == 201


# ---------- trilha de auditoria ----------


def test_auditoria_registra_edicao_arquivo_e_reavaliacao(cliente, cabecalho_gerente, risco):
    cliente.patch(f"/riscos/{risco.id}/tratamento", headers=cabecalho_gerente, json={"mitigacao": "Contratar fornecedor reserva"})
    cliente.patch(f"/riscos/{risco.id}/tratamento", headers=cabecalho_gerente, json={"mitigacao": "Contratar fornecedor reserva"})  # sem mudança
    cliente.post(
        f"/riscos/{risco.id}/reavaliacao",
        headers=cabecalho_gerente,
        json={"probabilidade": 3, "impacto": 5, "justificativa": "Fornecedor reserva em negociação"},
    )
    cliente.patch(f"/riscos/{risco.id}/arquivo", headers=cabecalho_gerente, json={"arquivado": True})

    trilha = cliente.get(f"/riscos/{risco.id}/auditoria", headers=cabecalho_gerente).json()
    tipos = [e["tipo"] for e in trilha]

    assert tipos.count("edicao") == 1  # salvar sem mudar nada não gera evento
    assert tipos.count("cadastro") == 1 and not any("None" in e["descricao"] for e in trilha)
    assert {"cadastro", "edicao", "reavaliacao", "arquivo"} <= set(tipos)
    edicao = next(e for e in trilha if e["tipo"] == "edicao")
    assert edicao["detalhes"]["mitigacao"]["depois"] == "Contratar fornecedor reserva"
    assert edicao["usuario"] == "Gerente de Teste"
    assert next(e for e in trilha if e["tipo"] == "reavaliacao")["descricao"].endswith("3×5 = 15")


def test_auditoria_de_risco_alheio_e_negada(cliente, cabecalho_outro_gerente, risco):
    assert cliente.get(f"/riscos/{risco.id}/auditoria", headers=cabecalho_outro_gerente).status_code == 404


# ---------- resumo semanal ----------


def test_previa_do_resumo_aponta_risco_fora_do_apetite(cliente, cabecalho_gerente, risco):
    corpo = cliente.get("/auth/me/resumo", headers=cabecalho_gerente).json()
    assert [i["indice"] for i in corpo["fora_do_apetite"]] == [risco.indice]  # 4×5 = 20 > 15
    assert corpo["reavaliar"] == [] and corpo["total"] == 1
    assert corpo["envio_configurado"] is False


def test_tarefa_de_resumo_exige_token(cliente, monkeypatch):
    monkeypatch.setattr(configuracoes, "tarefas_token", "segredo-de-teste")
    assert cliente.post("/tarefas/resumo-semanal").status_code == 401
    assert cliente.post("/tarefas/resumo-semanal", headers={"X-Tarefa-Token": "errado"}).status_code == 401
    # Token certo, mas sem serviço de e-mail configurado.
    assert cliente.post("/tarefas/resumo-semanal", headers={"X-Tarefa-Token": "segredo-de-teste"}).status_code == 503


def test_tarefa_envia_so_para_quem_pediu_e_tem_pendencias(cliente, cabecalho_gerente, risco, monkeypatch):
    enviados = []
    monkeypatch.setattr(configuracoes, "tarefas_token", "segredo-de-teste")
    monkeypatch.setattr(configuracoes, "resend_api_key", "chave-falsa")
    monkeypatch.setattr(configuracoes, "resumo_remetente", "Argos <teste@example.com>")
    monkeypatch.setattr(router_tarefas, "enviar_email", lambda para, assunto, corpo: enviados.append((para, assunto, corpo)))
    cabecalho_tarefa = {"X-Tarefa-Token": "segredo-de-teste"}

    assert cliente.post("/tarefas/resumo-semanal", headers=cabecalho_tarefa).json()["enviados"] == 0  # ninguém pediu

    cliente.put("/auth/me/preferencias", headers=cabecalho_gerente, json={"resumo_semanal": True})
    corpo = cliente.post("/tarefas/resumo-semanal", headers=cabecalho_tarefa).json()

    assert corpo == {"enviados": 1, "sem_pendencias": 0, "falhas": 0}
    para, assunto, html = enviados[0]
    assert para == "gerente@example.com" and "1 item" in assunto and risco.indice in html


def test_html_do_resumo_escapa_texto(gerente):
    resumo = {"fora_do_apetite": [{"indice": "R01", "titulo": "<script>", "projeto": "P", "detalhe": "x"}], "reavaliar": [], "decisoes_pendentes": [], "total": 1}
    assert "<script>" not in modulo_resumo.html_do_resumo(gerente, resumo, "https://exemplo")
