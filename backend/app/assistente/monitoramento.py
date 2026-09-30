"""Evolução da exposição ao longo do projeto (MR-MPS-SW GRI 8: riscos avaliados e
monitorados quanto a mudanças de situação).

A série começa na avaliação inicial (data do cadastro) e ganha um ponto a cada
reavaliação registrada pelo gerente. Sobre ela o módulo calcula a tendência,
avisa quando o risco está há muito tempo sem ser reavaliado e sugere um
recálculo das notas quando o andamento do risco indica mudança (ex.: a
mitigação foi concluída depois da última avaliação). Regras determinísticas e
explicáveis -- a sugestão sempre traz o motivo e só é aplicada pelo gerente."""
from datetime import datetime, timezone
from typing import List, Optional

from app.core.exposicao import avaliacao_exposicao, pontuacao_exposicao
from app.models.enums import StatusRisco

DIAS_PARA_REAVALIAR = 30
STATUS_SEM_MONITORAMENTO = {StatusRisco.ENCERRADO}


def _em_utc(data: datetime) -> datetime:
    # SQLite devolve datas sem fuso; o Postgres, com fuso.
    return data if data.tzinfo else data.replace(tzinfo=timezone.utc)


def _ponto(data, probabilidade, impacto, fase_projeto, justificativa) -> dict:
    exposicao = pontuacao_exposicao(probabilidade, impacto)
    return {
        "data": _em_utc(data),
        "probabilidade": probabilidade,
        "impacto": impacto,
        "exposicao": exposicao,
        "avaliacao": avaliacao_exposicao(exposicao),
        "fase_projeto": fase_projeto,
        "justificativa": justificativa,
    }


def montar_serie(risco, reavaliacoes: List) -> List[dict]:
    if reavaliacoes:
        primeira = reavaliacoes[0]
        inicial = _ponto(
            risco.criado_em,
            primeira.probabilidade_anterior,
            primeira.impacto_anterior,
            primeira.fase_projeto_anterior,
            "Avaliação inicial",
        )
    else:
        inicial = _ponto(
            risco.criado_em, risco.probabilidade, risco.impacto, risco.fase_projeto,
            "Avaliação inicial",
        )
    return [inicial] + [
        _ponto(r.criado_em, r.probabilidade, r.impacto, r.fase_projeto, r.justificativa)
        for r in reavaliacoes
    ]


def tendencia(serie: List[dict]) -> str:
    if len(serie) < 2:
        return "estavel"
    diferenca = serie[-1]["exposicao"] - serie[-2]["exposicao"]
    if diferenca > 0:
        return "subindo"
    if diferenca < 0:
        return "caindo"
    return "estavel"


def sugerir_recalculo(risco, serie: List[dict], historico_status: List) -> Optional[dict]:
    """Sugere novas notas quando o status do risco mudou depois da última avaliação."""
    ultima_avaliacao = serie[-1]["data"]
    mudancas = [
        h for h in historico_status
        if h.status_anterior is not None and _em_utc(h.criado_em) > ultima_avaliacao
    ]
    if not mudancas:
        return None
    if mudancas[-1].status_novo == StatusRisco.MITIGADO and risco.probabilidade > 1:
        return {
            "probabilidade": risco.probabilidade - 1,
            "impacto": risco.impacto,
            "motivo": "A mitigação foi concluída depois da última avaliação; "
            "a probabilidade de ocorrência tende a cair.",
        }
    return None


def montar_evolucao(risco, reavaliacoes: List, historico_status: List,
                    agora: Optional[datetime] = None) -> dict:
    agora = agora or datetime.now(timezone.utc)
    serie = montar_serie(risco, reavaliacoes)
    dias = max(0, (agora - serie[-1]["data"]).days)
    return {
        "pontos": serie,
        "tendencia": tendencia(serie),
        "dias_desde_ultima_avaliacao": dias,
        "reavaliacao_pendente": dias >= DIAS_PARA_REAVALIAR
        and risco.status not in STATUS_SEM_MONITORAMENTO,
        "sugestao": None if risco.status in STATUS_SEM_MONITORAMENTO
        else sugerir_recalculo(risco, serie, historico_status),
    }
