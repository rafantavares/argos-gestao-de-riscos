"""Testes do fluxo de recomendação de plano de contingência.

O modelo de ML é simulado nestes testes: treinar de verdade levaria ~1 minuto
por chamada (GridSearchCV) e dependeria dos .joblib em disco, que não são
versionados. O que se verifica aqui é a *integração* -- se o risco certo chega
ao preditor, se o plano previsto vira recomendação, e se o aceite dispara o
retreino. A qualidade do modelo em si é avaliada em test_ml.py.
"""
import pytest

from app.routers import recomendacoes as router_recomendacoes


@pytest.fixture
def ml_simulado(monkeypatch, plano):
    """Substitui predição e retreino por versões instantâneas e determinísticas.

    Devolve um dicionário que registra as chamadas feitas, para os testes
    verificarem o que o router acionou.
    """
    registro = {"predicoes": [], "retreinos": []}

    def prever_falso(**kwargs):
        registro["predicoes"].append(kwargs)
        return {
            "id_plano_contingencia": plano.id,
            "nivel_severidade": "alto",
            "confianca": 0.91,
            "algoritmo_usado": "random_forest",
            "acuracia_momento": 0.8733,
        }

    def retreinar_falso(dataset):
        registro["retreinos"].append(len(dataset))

    monkeypatch.setattr(router_recomendacoes, "prever_plano_contingencia", prever_falso)
    monkeypatch.setattr(
        router_recomendacoes, "_retreinar_e_registrar_metricas", retreinar_falso
    )
    return registro


def test_gerar_recomendacao_para_risco_proprio(cliente, cabecalho_gerente, risco, ml_simulado, plano):
    resposta = cliente.post(f"/recomendacoes/gerar/{risco.id}", headers=cabecalho_gerente)

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["id_risco"] == risco.id
    assert corpo["id_plano"] == plano.id
    assert corpo["algoritmo_usado"] == "random_forest"
    assert corpo["confianca"] == 0.91
    assert corpo["aceita"] is None


def test_recomendacao_usa_os_seis_atributos_do_risco(
    cliente, cabecalho_gerente, risco, ml_simulado
):
    """O preditor precisa receber as 6 features, incluindo fase_projeto (fase 5)."""
    cliente.post(f"/recomendacoes/gerar/{risco.id}", headers=cabecalho_gerente)

    assert ml_simulado["predicoes"] == [
        {
            "categoria": "tecnico",
            "probabilidade": 4,
            "impacto": 5,
            "orcamento_impacto": "alto",
            "urgencia": "alta",
            "fase_projeto": "execucao",
        }
    ]


def test_gerar_recomendacao_para_risco_alheio_e_rejeitado(
    cliente, cabecalho_outro_gerente, risco, ml_simulado
):
    resposta = cliente.post(f"/recomendacoes/gerar/{risco.id}", headers=cabecalho_outro_gerente)

    assert resposta.status_code == 404


def test_plano_previsto_ausente_no_banco_retorna_erro(
    cliente, cabecalho_gerente, risco, monkeypatch
):
    """Se o modelo apontar um plano que não existe, a falha deve ser explícita."""
    monkeypatch.setattr(
        router_recomendacoes,
        "prever_plano_contingencia",
        lambda **kwargs: {
            "id_plano_contingencia": 9999,
            "algoritmo_usado": "knn",
            "acuracia_momento": 0.5,
        },
    )

    resposta = cliente.post(
        f"/recomendacoes/gerar/{risco.id}", headers=cabecalho_gerente
    )

    assert resposta.status_code == 500


def test_aceitar_recomendacao_dispara_retreino(cliente, cabecalho_gerente, risco, ml_simulado):
    id_recomendacao = cliente.post(
        f"/recomendacoes/gerar/{risco.id}", headers=cabecalho_gerente
    ).json()["id"]

    resposta = cliente.patch(
        f"/recomendacoes/{id_recomendacao}", headers=cabecalho_gerente, json={"aceita": True}
    )

    assert resposta.status_code == 200
    assert resposta.json()["aceita"] is True
    assert len(ml_simulado["retreinos"]) == 1


def test_aceitar_recomendacao_coloca_o_risco_em_tratamento(
    cliente, cabecalho_gerente, risco, ml_simulado
):
    """Aceite do plano muda o status do risco para em_tratamento e registra no histórico."""
    id_recomendacao = cliente.post(
        f"/recomendacoes/gerar/{risco.id}", headers=cabecalho_gerente
    ).json()["id"]

    cliente.patch(
        f"/recomendacoes/{id_recomendacao}", headers=cabecalho_gerente, json={"aceita": True}
    )

    risco_atualizado = cliente.get(f"/riscos/{risco.id}", headers=cabecalho_gerente).json()
    assert risco_atualizado["status"] == "em_tratamento"

    historico = cliente.get(f"/riscos/{risco.id}/historico", headers=cabecalho_gerente).json()
    assert historico[-1]["status_anterior"] == "identificado"
    assert historico[-1]["status_novo"] == "em_tratamento"


def test_aceitar_recomendacao_nao_regride_risco_ja_mitigado(
    cliente, cabecalho_gerente, risco, ml_simulado
):
    cliente.patch(
        f"/riscos/{risco.id}/status", headers=cabecalho_gerente, json={"status": "mitigado"}
    )
    id_recomendacao = cliente.post(
        f"/recomendacoes/gerar/{risco.id}", headers=cabecalho_gerente
    ).json()["id"]

    cliente.patch(
        f"/recomendacoes/{id_recomendacao}", headers=cabecalho_gerente, json={"aceita": True}
    )

    assert cliente.get(f"/riscos/{risco.id}", headers=cabecalho_gerente).json()["status"] == "mitigado"


def test_rejeitar_recomendacao_nao_dispara_retreino(
    cliente, cabecalho_gerente, risco, ml_simulado
):
    """Só o feedback aceito vira exemplo de treino, e rejeitar mantém o status."""
    id_recomendacao = cliente.post(
        f"/recomendacoes/gerar/{risco.id}", headers=cabecalho_gerente
    ).json()["id"]

    resposta = cliente.patch(
        f"/recomendacoes/{id_recomendacao}", headers=cabecalho_gerente, json={"aceita": False}
    )

    assert resposta.status_code == 200
    assert resposta.json()["aceita"] is False
    assert ml_simulado["retreinos"] == []
    assert cliente.get(f"/riscos/{risco.id}", headers=cabecalho_gerente).json()["status"] == "identificado"


def test_dataset_de_retreino_inclui_o_feedback_aceito(
    cliente, cabecalho_gerente, risco, ml_simulado
):
    """O dataset enviado ao retreino deve ser maior que o dataset base."""
    from app.ml.preprocessor import carregar_dataset

    tamanho_base = len(carregar_dataset())
    id_recomendacao = cliente.post(
        f"/recomendacoes/gerar/{risco.id}", headers=cabecalho_gerente
    ).json()["id"]

    cliente.patch(
        f"/recomendacoes/{id_recomendacao}", headers=cabecalho_gerente, json={"aceita": True}
    )

    assert ml_simulado["retreinos"] == [tamanho_base + 1]


def test_responder_recomendacao_duas_vezes_e_rejeitado(
    cliente, cabecalho_gerente, risco, ml_simulado
):
    id_recomendacao = cliente.post(
        f"/recomendacoes/gerar/{risco.id}", headers=cabecalho_gerente
    ).json()["id"]
    cliente.patch(
        f"/recomendacoes/{id_recomendacao}", headers=cabecalho_gerente, json={"aceita": True}
    )

    resposta = cliente.patch(
        f"/recomendacoes/{id_recomendacao}", headers=cabecalho_gerente, json={"aceita": False}
    )

    assert resposta.status_code == 400


def test_gerente_nao_responde_recomendacao_alheia(
    cliente, cabecalho_gerente, cabecalho_outro_gerente, risco, ml_simulado
):
    id_recomendacao = cliente.post(
        f"/recomendacoes/gerar/{risco.id}", headers=cabecalho_gerente
    ).json()["id"]

    resposta = cliente.patch(
        f"/recomendacoes/{id_recomendacao}",
        headers=cabecalho_outro_gerente,
        json={"aceita": True},
    )

    assert resposta.status_code == 404


def test_listar_recomendacoes_do_risco(cliente, cabecalho_gerente, risco, ml_simulado):
    cliente.post(f"/recomendacoes/gerar/{risco.id}", headers=cabecalho_gerente)
    cliente.post(f"/recomendacoes/gerar/{risco.id}", headers=cabecalho_gerente)

    resposta = cliente.get(f"/recomendacoes/risco/{risco.id}", headers=cabecalho_gerente)

    assert resposta.status_code == 200
    assert len(resposta.json()) == 2


def test_historico_de_metricas_exige_login(cliente):
    assert cliente.get("/recomendacoes/metricas-historico").status_code == 401


def test_historico_de_metricas_comeca_vazio(cliente, cabecalho_gerente):
    """O painel "Modelo de IA" do gerente lê o histórico de retreinos."""
    resposta = cliente.get("/recomendacoes/metricas-historico", headers=cabecalho_gerente)

    assert resposta.status_code == 200
    assert resposta.json() == []


def test_rejeitar_registra_data_e_motivo(cliente, cabecalho_gerente, risco, ml_simulado):
    id_recomendacao = cliente.post(f"/recomendacoes/gerar/{risco.id}", headers=cabecalho_gerente).json()["id"]

    corpo = cliente.patch(
        f"/recomendacoes/{id_recomendacao}",
        headers=cabecalho_gerente,
        json={"aceita": False, "motivo_rejeicao": "  Plano caro demais para a fase atual  "},
    ).json()

    assert corpo["aceita"] is False
    assert corpo["motivo_rejeicao"] == "Plano caro demais para a fase atual"
    assert corpo["decidida_em"] is not None


def test_aceitar_ignora_motivo_de_rejeicao(cliente, cabecalho_gerente, risco, ml_simulado):
    id_recomendacao = cliente.post(f"/recomendacoes/gerar/{risco.id}", headers=cabecalho_gerente).json()["id"]

    corpo = cliente.patch(
        f"/recomendacoes/{id_recomendacao}",
        headers=cabecalho_gerente,
        json={"aceita": True, "motivo_rejeicao": "não deveria ficar"},
    ).json()

    assert corpo["aceita"] is True and corpo["motivo_rejeicao"] is None
    assert corpo["decidida_em"] is not None


def test_motivo_de_rejeicao_tem_limite_de_tamanho(cliente, cabecalho_gerente, risco, ml_simulado):
    id_recomendacao = cliente.post(f"/recomendacoes/gerar/{risco.id}", headers=cabecalho_gerente).json()["id"]
    resposta = cliente.patch(
        f"/recomendacoes/{id_recomendacao}", headers=cabecalho_gerente, json={"aceita": False, "motivo_rejeicao": "x" * 501}
    )
    assert resposta.status_code == 422
