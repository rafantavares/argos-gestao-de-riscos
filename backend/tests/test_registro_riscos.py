"""Testes do registro de riscos no formato MR-MPS-SW/PMBOK: índice, escala 1-5,
exposição com faixas, campos de tratamento e assistente de IA (classificação,
duplicados, coerência e sugestões)."""
import pytest

from app.assistente import classificador, coerencia, sugestoes
from app.core.exposicao import avaliacao_exposicao, nivel_exposicao, pontuacao_exposicao
from app.models.enums import AREA_PARA_CATEGORIA, AreaAfetada
from app.routers import recomendacoes as router_recomendacoes

RISCO = {
    "titulo": "Vazamento de dados pessoais de clientes",
    "area_afetada": "seguranca_informacao",
    "descricao_impacto": "Exposição de dados pessoais, multa da LGPD e perda de confiança dos clientes.",
    "probabilidade": 3,
    "impacto": 5,
    "orcamento_impacto": "alto",
    "urgencia": "media",
    "fase_projeto": "execucao",
}


# ---------- escalas e exposição ----------


@pytest.mark.parametrize(
    "pontuacao, avaliacao",
    [
        (1, "Muito Leve"), (3, "Muito Leve"),
        (4, "Leve"), (10, "Leve"),
        (11, "Moderado"), (15, "Moderado"),
        (16, "Grave"), (20, "Grave"),
        (21, "Muito Grave"), (25, "Muito Grave"),
    ],
)
def test_faixas_de_exposicao(pontuacao, avaliacao):
    assert avaliacao_exposicao(pontuacao) == avaliacao


def test_exposicao_e_o_produto_de_probabilidade_e_impacto():
    assert pontuacao_exposicao(4, 5) == 20


@pytest.mark.parametrize("pontuacao, nivel", [(3, 0), (10, 0), (11, 1), (15, 1), (16, 2), (25, 2)])
def test_nivel_de_exposicao_para_o_ml(pontuacao, nivel):
    assert nivel_exposicao(pontuacao) == nivel


def test_toda_area_mapeia_para_um_grupo_pmbok():
    assert set(AREA_PARA_CATEGORIA) == set(AreaAfetada)


# ---------- cadastro ----------


def test_cadastro_devolve_indice_exposicao_e_categoria_derivada(
    cliente, cabecalho_gerente, projeto_com_gerente
):
    resposta = cliente.post(
        "/riscos", headers=cabecalho_gerente, json={**RISCO, "id_projeto": projeto_com_gerente.id}
    )

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["indice"] == "R01"
    assert corpo["categoria"] == "tecnico"  # derivada de seguranca_informacao
    assert corpo["exposicao"] == 15
    assert corpo["avaliacao_exposicao"] == "Moderado"


def test_indice_e_sequencial_por_projeto(cliente, cabecalho_gerente, projeto_com_gerente):
    indices = [
        cliente.post(
            "/riscos", headers=cabecalho_gerente, json={**RISCO, "id_projeto": projeto_com_gerente.id}
        ).json()["indice"]
        for _ in range(3)
    ]

    assert indices == ["R01", "R02", "R03"]


@pytest.mark.parametrize("campo, valor", [("probabilidade", 0), ("probabilidade", 6), ("impacto", 0), ("impacto", 6)])
def test_escala_fora_de_1_a_5_e_rejeitada(cliente, cabecalho_gerente, projeto_com_gerente, campo, valor):
    resposta = cliente.post(
        "/riscos",
        headers=cabecalho_gerente,
        json={**RISCO, "id_projeto": projeto_com_gerente.id, campo: valor},
    )

    assert resposta.status_code == 422


def test_descricao_do_impacto_e_obrigatoria(cliente, cabecalho_gerente, projeto_com_gerente):
    dados = {**RISCO, "id_projeto": projeto_com_gerente.id}
    del dados["descricao_impacto"]

    assert cliente.post("/riscos", headers=cabecalho_gerente, json=dados).status_code == 422


def test_gerente_edita_mitigacao_contingencia_e_gatilho(cliente, cabecalho_gerente, risco):
    resposta = cliente.patch(
        f"/riscos/{risco.id}/tratamento",
        headers=cabecalho_gerente,
        json={"mitigacao": "Treinar a equipe", "contingencia": "Acionar backup", "gatilho": "Falha no deploy"},
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["mitigacao"] == "Treinar a equipe"
    assert corpo["contingencia"] == "Acionar backup"
    assert corpo["gatilho"] == "Falha no deploy"


def test_gerente_nao_edita_tratamento_de_risco_alheio(cliente, cabecalho_outro_gerente, risco):
    resposta = cliente.patch(
        f"/riscos/{risco.id}/tratamento", headers=cabecalho_outro_gerente, json={"mitigacao": "x"}
    )

    assert resposta.status_code == 404


def test_aceitar_recomendacao_preenche_apenas_campos_vazios(
    cliente, cabecalho_gerente, risco, plano, monkeypatch
):
    monkeypatch.setattr(
        router_recomendacoes,
        "prever_plano_contingencia",
        lambda **_: {
            "id_plano_contingencia": plano.id,
            "nivel_severidade": "alto",
            "confianca": 0.9,
            "algoritmo_usado": "random_forest",
            "acuracia_momento": 0.87,
        },
    )
    monkeypatch.setattr(router_recomendacoes, "_retreinar_e_registrar_metricas", lambda _: None)
    cliente.patch(
        f"/riscos/{risco.id}/tratamento", headers=cabecalho_gerente, json={"gatilho": "Gatilho do gerente"}
    )
    id_recomendacao = cliente.post(f"/recomendacoes/gerar/{risco.id}", headers=cabecalho_gerente).json()["id"]

    cliente.patch(f"/recomendacoes/{id_recomendacao}", headers=cabecalho_gerente, json={"aceita": True})
    corpo = cliente.get(f"/riscos/{risco.id}", headers=cabecalho_gerente).json()

    assert corpo["contingencia"] == plano.descricao
    assert corpo["mitigacao"]
    assert corpo["gatilho"] == "Gatilho do gerente"  # não sobrescreve o que o gerente escreveu


# ---------- assistente: classificação ----------


@pytest.mark.parametrize(
    "texto, area",
    [
        ("Vazamento de dados pessoais dos usuários", AreaAfetada.SEGURANCA_INFORMACAO),
        ("Atraso na entrega das sprints do módulo", AreaAfetada.CRONOGRAMA),
        ("Servidor de produção fora do ar", AreaAfetada.INFRAESTRUTURA),
        ("Telas confusas e difíceis de usar", AreaAfetada.USABILIDADE),
        ("Saída de desenvolvedor-chave da equipe", AreaAfetada.EQUIPE),
    ],
)
def test_classificador_sugere_a_area_afetada(texto, area):
    sugestao = classificador.sugerir_area(texto, "")

    assert sugestao is not None
    assert sugestao["area_afetada"] == area
    assert sugestao["categoria"] == AREA_PARA_CATEGORIA[area]


def test_classificador_ignora_texto_curto_demais():
    assert classificador.sugerir_area("ab", "") is None


# ---------- assistente: duplicados ----------


def test_detecta_risco_parecido_no_projeto():
    existentes = [
        dict(id=1, indice="R01", titulo="Vazamento de dados pessoais de clientes", descricao_impacto="Multa da LGPD"),
        dict(id=2, indice="R02", titulo="Atraso na entrega do módulo de relatórios", descricao_impacto="Prazo"),
    ]

    similares = classificador.encontrar_similares("Vazamento de dados pessoais dos clientes", "Multa LGPD", existentes)

    assert [s["id"] for s in similares] == [1]


def test_risco_diferente_nao_e_apontado_como_duplicado():
    existentes = [dict(id=1, indice="R01", titulo="Atraso na entrega do módulo", descricao_impacto="Prazo")]

    assert classificador.encontrar_similares("Fornecedor de nuvem indisponível", "Queda do serviço", existentes) == []


# ---------- assistente: coerência ----------


def test_alerta_quando_consequencia_grave_tem_impacto_baixo():
    alertas = coerencia.auditar("Vazamento de dados", "Exposição de dados pessoais", 3, 2)

    assert alertas[0]["tipo"] == "impacto_subestimado"
    assert alertas[0]["valor_sugerido"] == 4
    assert "vazamento" in alertas[0]["termos"]


def test_sem_alerta_quando_nota_e_coerente_com_o_texto():
    assert coerencia.auditar("Vazamento de dados", "Exposição de dados pessoais", 3, 5) == []


def test_alerta_quando_impacto_alto_descreve_consequencia_trivial():
    alertas = coerencia.auditar("Ajuste de layout", "Problema cosmético sem impacto", 2, 5)

    assert alertas[0]["tipo"] == "impacto_superestimado"


def test_alerta_quando_problema_ja_ocorreu_com_probabilidade_baixa():
    alertas = coerencia.auditar("Atraso na entrega", "O atraso já ocorreu na última sprint", 2, 3)

    assert any(a["tipo"] == "probabilidade_subestimada" for a in alertas)


def test_auditoria_ignora_acentos_e_caixa():
    assert coerencia.auditar("VAZAMENTO DE DADOS", "", 3, 1)


# ---------- assistente: sugestões ----------


@pytest.mark.parametrize("area", list(AreaAfetada))
@pytest.mark.parametrize("nivel", [0, 1, 2])
def test_toda_area_e_nivel_geram_sugestao_completa(area, nivel):
    sugestao = sugestoes.gerar_sugestao(area, nivel)

    assert sugestao["mitigacao"] and sugestao["contingencia"] and sugestao["gatilho"]


def test_plano_recomendado_vira_a_contingencia():
    sugestao = sugestoes.gerar_sugestao(AreaAfetada.EQUIPE, 1, descricao_plano="Plano do catálogo")

    assert sugestao["contingencia"] == "Plano do catálogo"


# ---------- assistente: endpoint ----------


def test_endpoint_do_assistente_reune_as_quatro_analises(cliente, cabecalho_gerente, projeto_com_gerente):
    cliente.post("/riscos", headers=cabecalho_gerente, json={**RISCO, "id_projeto": projeto_com_gerente.id})

    resposta = cliente.post(
        "/riscos/assistente",
        headers=cabecalho_gerente,
        json={
            "id_projeto": projeto_com_gerente.id,
            "titulo": "Vazamento de dados pessoais de clientes",
            "descricao_impacto": "Exposição dos dados pessoais",
            "probabilidade": 3,
            "impacto": 2,
        },
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["area_sugerida"]["area_afetada"] == "seguranca_informacao"
    assert corpo["similares"][0]["indice"] == "R01"
    assert corpo["alertas_coerencia"][0]["tipo"] == "impacto_subestimado"
    assert corpo["sugestao_plano"]["gatilho"]


def test_assistente_exige_gerente_vinculado_ao_projeto(cliente, cabecalho_gerente, projeto):
    resposta = cliente.post("/riscos/assistente", headers=cabecalho_gerente, json={"id_projeto": projeto.id})

    assert resposta.status_code == 403
