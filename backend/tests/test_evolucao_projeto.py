"""Testes da evolução agregada da exposição (Visão geral)."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.assistente import monitoramento
from app.models.enums import StatusRisco

AGORA = datetime(2026, 10, 15, tzinfo=timezone.utc)


def _risco(id_, dias_atras, p, i):
    return SimpleNamespace(id=id_, criado_em=AGORA - timedelta(days=dias_atras), probabilidade=p, impacto=i)


def test_serie_soma_riscos_ativos_e_respeita_cadastro_reavaliacao_e_encerramento():
    r1 = _risco(1, 30, 3, 3)  # reavaliado há 10 dias de 4x4 (16) para 3x3 (9)
    r2 = _risco(2, 20, 2, 5)  # encerrado há 3 dias
    reav = {1: [SimpleNamespace(criado_em=AGORA - timedelta(days=10), probabilidade=3, impacto=3,
                                probabilidade_anterior=4, impacto_anterior=4)]}
    hist = {2: [SimpleNamespace(criado_em=AGORA - timedelta(days=3), status_novo=StatusRisco.ENCERRADO)]}
    serie = monitoramento.serie_exposicao([r1, r2], reav, hist, semanas=5, agora=AGORA)

    totais = [p["total"] for p in serie]  # semanas: -28, -21, -14, -7, 0 dias
    assert totais == [16, 16, 26, 19, 9]
    assert serie[2]["por_faixa"] == {"Grave": 16, "Leve": 10}
    assert serie[-1]["quantidade"] == 1 and serie[-1]["media"] == 9


def test_endpoint_da_evolucao_agregada(cliente, cabecalho_gerente, risco):
    r = cliente.get(f"/riscos/painel/evolucao?id_projeto={risco.id_projeto}&semanas=4", headers=cabecalho_gerente)
    assert r.status_code == 200
    pontos = r.json()
    assert len(pontos) == 4 and pontos[-1]["total"] == 20


def test_evolucao_exige_vinculo_com_o_projeto(cliente, cabecalho_gerente, projeto):
    assert cliente.get(f"/riscos/painel/evolucao?id_projeto={projeto.id}", headers=cabecalho_gerente).status_code == 403
