"""Critérios de risco por projeto (apetite e prazos de reavaliação), decisões
datadas das recomendações, calibração das avaliações e migração da fase 13."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.pool import StaticPool

from app.assistente import monitoramento
from app.core import migrar_fase13
from app.models.enums import AreaAfetada, FaseProjeto, StatusRisco


# ---------- apetite e prazo de reavaliação ----------


def test_risco_traz_prazo_e_apetite_do_projeto_com_os_padroes(cliente, cabecalho_gerente, risco):
    corpo = cliente.get(f"/riscos/{risco.id}", headers=cabecalho_gerente).json()

    # Exposição 4x5 = 20 (Grave): prazo padrão de 15 dias e acima do apetite padrão (15).
    assert corpo["prazo_reavaliacao_dias"] == 15
    assert corpo["fora_do_apetite"] is True


def test_editar_criterios_do_projeto_muda_o_risco(cliente, cabecalho_gerente, risco):
    resposta = cliente.put(
        f"/projetos/{risco.id_projeto}",
        headers=cabecalho_gerente,
        json={"apetite_exposicao": 20, "prazo_reavaliacao_grave": 10},
    )
    assert resposta.status_code == 200
    assert resposta.json()["apetite_exposicao"] == 20
    assert resposta.json()["prazo_reavaliacao_muito_grave"] == 7  # não enviado: mantém

    corpo = cliente.get(f"/riscos/{risco.id}", headers=cabecalho_gerente).json()
    assert corpo["prazo_reavaliacao_dias"] == 10
    assert corpo["fora_do_apetite"] is False


def test_criterios_fora_da_escala_sao_rejeitados(cliente, cabecalho_gerente, projeto_com_gerente):
    for campo, valor in (("apetite_exposicao", 26), ("apetite_exposicao", 0), ("prazo_reavaliacao_demais", 0)):
        resposta = cliente.put(f"/projetos/{projeto_com_gerente.id}", headers=cabecalho_gerente, json={campo: valor})
        assert resposta.status_code == 422


def test_reavaliacao_pendente_segue_o_prazo_do_projeto():
    risco = SimpleNamespace(
        criado_em=datetime(2026, 9, 1, tzinfo=timezone.utc),
        probabilidade=5, impacto=5, fase_projeto=FaseProjeto.EXECUCAO,
        status=StatusRisco.EM_MONITORAMENTO, prazo_reavaliacao_dias=7,
    )
    agora = risco.criado_em + timedelta(days=8)
    assert monitoramento.montar_evolucao(risco, [], [], agora=agora)["reavaliacao_pendente"]
    assert not monitoramento.montar_evolucao(risco, [], [], agora=risco.criado_em + timedelta(days=6))["reavaliacao_pendente"]


# ---------- calibração ----------


def test_calibracao_compara_notas_iniciais_com_as_atuais(cliente, cabecalho_gerente, risco):
    cliente.post(
        f"/riscos/{risco.id}/reavaliacao",
        headers=cabecalho_gerente,
        json={"probabilidade": 2, "impacto": 5, "justificativa": "Fornecedor alternativo contratado"},
    )

    corpo = cliente.get("/riscos/painel/calibracao", headers=cabecalho_gerente).json()

    assert corpo["riscos_total"] == 1 and corpo["riscos_reavaliados"] == 1
    assert corpo["variacao_media_probabilidade"] == -2
    assert corpo["variacao_media_impacto"] == 0
    assert corpo["variacao_media_exposicao"] == -10  # 20 -> 10
    assert corpo["por_area"][0]["riscos"] == 1


def test_calibracao_sem_reavaliacoes_nao_tem_medias(cliente, cabecalho_gerente, risco):
    corpo = cliente.get("/riscos/painel/calibracao", headers=cabecalho_gerente).json()
    assert corpo["riscos_reavaliados"] == 0
    assert corpo["variacao_media_exposicao"] is None and corpo["por_area"] == []


def test_calibracao_agrupa_por_area():
    def risco(area, inicial, atual):
        reav = SimpleNamespace(probabilidade_anterior=inicial[0], impacto_anterior=inicial[1])
        return SimpleNamespace(area_afetada=area, probabilidade=atual[0], impacto=atual[1], reavaliacoes=[reav])

    corpo = monitoramento.calibracao([
        risco(AreaAfetada.CRONOGRAMA, (4, 4), (2, 4)),  # -8
        risco(AreaAfetada.CRONOGRAMA, (3, 3), (2, 3)),  # -3
        risco(AreaAfetada.CUSTO, (2, 2), (3, 2)),  # +2
        SimpleNamespace(area_afetada=AreaAfetada.EQUIPE, probabilidade=1, impacto=1, reavaliacoes=[]),
    ])

    assert corpo["riscos_total"] == 4 and corpo["riscos_reavaliados"] == 3
    assert corpo["por_area"][0] == {"area": "cronograma", "riscos": 2, "variacao_media_exposicao": -5.5}
    assert corpo["por_area"][1]["area"] == "custo"


# ---------- migração ----------


def test_migracao_da_fase13_cria_colunas_e_e_idempotente(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    with engine.begin() as conexao:
        conexao.execute(text("CREATE TABLE projetos (id INTEGER PRIMARY KEY)"))
        conexao.execute(text("CREATE TABLE recomendacoes (id INTEGER PRIMARY KEY)"))
        conexao.execute(text("INSERT INTO projetos (id) VALUES (1)"))
    monkeypatch.setattr(migrar_fase13, "engine", engine)

    assert len(migrar_fase13.adicionar_colunas_fase13()) == 6
    assert migrar_fase13.adicionar_colunas_fase13() == []

    colunas = {c["name"] for c in inspect(engine).get_columns("projetos")}
    assert {"apetite_exposicao", "prazo_reavaliacao_demais"} <= colunas
    with engine.connect() as conexao:
        assert conexao.execute(text("SELECT apetite_exposicao, prazo_reavaliacao_muito_grave FROM projetos")).one() == (15, 7)
