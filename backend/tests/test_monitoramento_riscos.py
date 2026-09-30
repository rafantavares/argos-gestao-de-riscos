"""Testes da análise preditiva das notas iniciais e da reavaliação (evolução da
exposição conforme o andamento do projeto)."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.assistente import monitoramento, predicao
from app.models.enums import FaseProjeto, StatusRisco

HISTORICO = [
    dict(indice="R01", titulo="Vazamento de dados pessoais", descricao_impacto="multa LGPD",
         probabilidade=2, impacto=5, projeto="Projeto A"),
    dict(indice="R02", titulo="Vazamento de dados de clientes", descricao_impacto="exposição de dados",
         probabilidade=3, impacto=5, projeto="Projeto B"),
    dict(indice="R03", titulo="Atraso na entrega das sprints", descricao_impacto="prazo comprometido",
         probabilidade=4, impacto=2, projeto="Projeto A"),
]


# ---------- análise preditiva das notas ----------


def test_sugere_notas_a_partir_de_riscos_parecidos_do_historico():
    sugestao = predicao.sugerir_notas("Vazamento de dados pessoais de clientes", "", HISTORICO)

    assert sugestao["impacto"] == 5
    assert sugestao["probabilidade"] in (2, 3)
    indices = [r["indice"] for r in sugestao["referencias"]]
    assert indices[:2] == ["R01", "R02"] or indices[:2] == ["R02", "R01"]
    assert "R03" not in indices


def test_sem_historico_parecido_nao_sugere_notas():
    assert predicao.sugerir_notas("Interface confusa para o usuário", "", HISTORICO[2:]) is None
    assert predicao.sugerir_notas("Vazamento de dados", "", []) is None
    assert predicao.sugerir_notas("abc", "", HISTORICO) is None


def test_assistente_devolve_notas_sugeridas(cliente, cabecalho_gerente, risco, projeto_com_gerente):
    resposta = cliente.post(
        "/riscos/assistente",
        headers=cabecalho_gerente,
        json={"id_projeto": projeto_com_gerente.id, "titulo": "Risco de teste parecido"},
    )

    notas = resposta.json()["notas_sugeridas"]
    assert notas["probabilidade"] == 4 and notas["impacto"] == 5
    assert notas["referencias"][0]["projeto"] == projeto_com_gerente.nome


# ---------- evolução da exposição (regras) ----------


def _risco(**campos):
    base = dict(
        criado_em=datetime(2026, 9, 1, tzinfo=timezone.utc),
        probabilidade=4, impacto=5, fase_projeto=FaseProjeto.EXECUCAO,
        status=StatusRisco.EM_MONITORAMENTO,
    )
    return SimpleNamespace(**{**base, **campos})


def _reavaliacao(dia, anterior, nova):
    return SimpleNamespace(
        criado_em=datetime(2026, 9, dia, tzinfo=timezone.utc),
        probabilidade_anterior=anterior[0], impacto_anterior=anterior[1],
        fase_projeto_anterior=FaseProjeto.PLANEJAMENTO,
        probabilidade=nova[0], impacto=nova[1], fase_projeto=FaseProjeto.EXECUCAO,
        justificativa="Revisão",
    )


def _mudanca_status(dia, novo):
    return SimpleNamespace(
        criado_em=datetime(2026, 9, dia, tzinfo=timezone.utc),
        status_anterior=StatusRisco.EM_MONITORAMENTO, status_novo=novo,
    )


def test_serie_comeca_na_avaliacao_inicial_e_segue_as_reavaliacoes():
    risco = _risco(probabilidade=2, impacto=5)
    reavaliacoes = [_reavaliacao(10, (4, 5), (3, 5)), _reavaliacao(20, (3, 5), (2, 5))]

    evolucao = monitoramento.montar_evolucao(
        risco, reavaliacoes, [], agora=datetime(2026, 9, 25, tzinfo=timezone.utc)
    )

    assert [p["exposicao"] for p in evolucao["pontos"]] == [20, 15, 10]
    assert evolucao["pontos"][0]["fase_projeto"] == FaseProjeto.PLANEJAMENTO
    assert evolucao["tendencia"] == "caindo"
    assert evolucao["dias_desde_ultima_avaliacao"] == 5
    assert evolucao["reavaliacao_pendente"] is False


def test_risco_sem_reavaliacao_tem_so_o_ponto_inicial():
    evolucao = monitoramento.montar_evolucao(
        _risco(), [], [], agora=datetime(2026, 9, 2, tzinfo=timezone.utc)
    )
    assert len(evolucao["pontos"]) == 1
    assert evolucao["pontos"][0]["avaliacao"] == "Grave"
    assert evolucao["tendencia"] == "estavel"


def test_reavaliacao_pendente_depois_de_30_dias():
    agora = datetime(2026, 9, 1, tzinfo=timezone.utc) + timedelta(days=30)
    assert monitoramento.montar_evolucao(_risco(), [], [], agora=agora)["reavaliacao_pendente"]
    encerrado = _risco(status=StatusRisco.ENCERRADO)
    assert not monitoramento.montar_evolucao(encerrado, [], [], agora=agora)["reavaliacao_pendente"]


def test_sugere_reduzir_probabilidade_quando_mitigado_apos_a_ultima_avaliacao():
    risco = _risco(status=StatusRisco.MITIGADO)
    evolucao = monitoramento.montar_evolucao(risco, [], [_mudanca_status(5, StatusRisco.MITIGADO)])
    assert evolucao["sugestao"]["probabilidade"] == 3
    assert evolucao["sugestao"]["impacto"] == 5


def test_nao_sugere_quando_ja_reavaliado_depois_da_mitigacao():
    risco = _risco(status=StatusRisco.MITIGADO, probabilidade=3)
    evolucao = monitoramento.montar_evolucao(
        risco, [_reavaliacao(10, (4, 5), (3, 5))], [_mudanca_status(5, StatusRisco.MITIGADO)]
    )
    assert evolucao["sugestao"] is None


# ---------- reavaliação (endpoints) ----------


def test_gerente_reavalia_e_a_exposicao_e_recalculada(cliente, cabecalho_gerente, risco):
    resposta = cliente.post(
        f"/riscos/{risco.id}/reavaliacao",
        headers=cabecalho_gerente,
        json={"probabilidade": 2, "impacto": 5, "fase_projeto": "encerramento",
              "justificativa": "Servidor redundante entrou em produção"},
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["exposicao"] == 10 and corpo["avaliacao_exposicao"] == "Leve"
    assert corpo["fase_projeto"] == "encerramento"

    evolucao = cliente.get(f"/riscos/{risco.id}/evolucao", headers=cabecalho_gerente).json()
    assert [p["exposicao"] for p in evolucao["pontos"]] == [20, 10]
    assert evolucao["pontos"][0]["fase_projeto"] == "execucao"
    assert evolucao["tendencia"] == "caindo"


def test_reavaliacao_exige_justificativa(cliente, cabecalho_gerente, risco):
    resposta = cliente.post(
        f"/riscos/{risco.id}/reavaliacao", headers=cabecalho_gerente,
        json={"probabilidade": 2, "impacto": 5, "justificativa": ""},
    )
    assert resposta.status_code == 422


def test_risco_encerrado_nao_pode_ser_reavaliado(cliente, cabecalho_gerente, risco, sessao):
    risco.status = StatusRisco.ENCERRADO
    sessao.commit()
    resposta = cliente.post(
        f"/riscos/{risco.id}/reavaliacao", headers=cabecalho_gerente,
        json={"probabilidade": 2, "impacto": 5, "justificativa": "Revisão final"},
    )
    assert resposta.status_code == 400


def test_gerente_nao_reavalia_risco_alheio(cliente, cabecalho_outro_gerente, risco):
    resposta = cliente.post(
        f"/riscos/{risco.id}/reavaliacao", headers=cabecalho_outro_gerente,
        json={"probabilidade": 2, "impacto": 5, "justificativa": "Tentativa indevida"},
    )
    assert resposta.status_code == 404
    assert cliente.get(f"/riscos/{risco.id}/evolucao", headers=cabecalho_outro_gerente).status_code == 404
