"""Evolução da exposição ao longo do projeto (MR-MPS-SW:2023, GPR 17/17+:
riscos do projeto monitorados e comunicados às partes interessadas).

A série começa na avaliação inicial (data do cadastro) e ganha um ponto a cada
reavaliação registrada pelo gerente. Sobre ela o módulo calcula a tendência,
avisa quando o risco está há muito tempo sem ser reavaliado e sugere um
recálculo das notas quando o andamento do risco indica mudança (ex.: a
mitigação foi concluída depois da última avaliação). Regras determinísticas e
explicáveis -- a sugestão sempre traz o motivo e só é aplicada pelo gerente."""
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from app.core.exposicao import avaliacao_exposicao, pontuacao_exposicao
from app.models.enums import StatusRisco

# Prazo padrão entre reavaliações quando o risco não tem projeto carregado; o
# prazo real vem do projeto, por faixa de exposição (Projeto.prazo_reavaliacao).
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
        "reavaliacao_pendente": dias >= (getattr(risco, "prazo_reavaliacao_dias", None) or DIAS_PARA_REAVALIAR)
        and risco.status not in STATUS_SEM_MONITORAMENTO,
        "sugestao": None if risco.status in STATUS_SEM_MONITORAMENTO
        else sugerir_recalculo(risco, serie, historico_status),
    }


# ---------- evolução agregada do projeto ----------


def _notas_em(risco, reavaliacoes: List, momento: datetime):
    """Notas (P, I) do risco num momento: a última reavaliação até ali ou, se
    nenhuma, a avaliação inicial (o "anterior" da primeira reavaliação)."""
    anteriores = [r for r in reavaliacoes if _em_utc(r.criado_em) <= momento]
    if anteriores:
        ultima = anteriores[-1]
        return ultima.probabilidade, ultima.impacto
    if reavaliacoes:
        return reavaliacoes[0].probabilidade_anterior, reavaliacoes[0].impacto_anterior
    return risco.probabilidade, risco.impacto


def _ativo_em(risco, historico_status: List, momento: datetime) -> bool:
    if _em_utc(risco.criado_em) > momento:
        return False
    status = StatusRisco.IDENTIFICADO
    for h in historico_status:
        if _em_utc(h.criado_em) <= momento:
            status = h.status_novo
    return status != StatusRisco.ENCERRADO


def serie_exposicao(riscos: List, reavaliacoes_por_risco: dict, historico_por_risco: dict,
                    semanas: int = 12, agora: Optional[datetime] = None) -> List[dict]:
    """Exposição do conjunto de riscos ao fim de cada semana: total, média,
    quantidade de riscos ativos e a soma da exposição em cada faixa."""
    agora = agora or datetime.now(timezone.utc)
    pontos = []
    for k in range(semanas - 1, -1, -1):
        momento = agora - timedelta(weeks=k)
        por_faixa = {}
        total = quantidade = 0
        for risco in riscos:
            if not _ativo_em(risco, historico_por_risco.get(risco.id, []), momento):
                continue
            p, i = _notas_em(risco, reavaliacoes_por_risco.get(risco.id, []), momento)
            exposicao = pontuacao_exposicao(p, i)
            faixa = avaliacao_exposicao(exposicao)
            por_faixa[faixa] = por_faixa.get(faixa, 0) + exposicao
            total += exposicao
            quantidade += 1
        pontos.append({
            "data": momento,
            "total": total,
            "quantidade": quantidade,
            "media": round(total / quantidade, 1) if quantidade else 0,
            "por_faixa": por_faixa,
        })
    return pontos


# ---------- calibração das avaliações do gerente ----------

def calibracao(riscos: List) -> dict:
    """Quanto as notas iniciais do gerente mudaram até a última reavaliação.

    Para cada risco reavaliado ao menos uma vez, compara as notas do cadastro
    (as "anteriores" da primeira reavaliação) com as atuais. Variação negativa =
    as notas iniciais caíram (o gerente tendia a avaliar mais alto do que o
    risco se mostrou); positiva = subiram. A variação também reflete mudanças
    reais do risco, então é um indicador de tendência, não um erro medido."""
    variacoes = []
    for risco in riscos:
        if not risco.reavaliacoes:
            continue
        primeira = risco.reavaliacoes[0]
        variacoes.append({
            "area": risco.area_afetada.value if hasattr(risco.area_afetada, "value") else risco.area_afetada,
            "probabilidade": risco.probabilidade - primeira.probabilidade_anterior,
            "impacto": risco.impacto - primeira.impacto_anterior,
            "exposicao": pontuacao_exposicao(risco.probabilidade, risco.impacto)
            - pontuacao_exposicao(primeira.probabilidade_anterior, primeira.impacto_anterior),
        })

    def media(itens, campo):
        return round(sum(i[campo] for i in itens) / len(itens), 2) if itens else None

    por_area = {}
    for v in variacoes:
        por_area.setdefault(v["area"], []).append(v)
    return {
        "riscos_total": len(riscos),
        "riscos_reavaliados": len(variacoes),
        "variacao_media_probabilidade": media(variacoes, "probabilidade"),
        "variacao_media_impacto": media(variacoes, "impacto"),
        "variacao_media_exposicao": media(variacoes, "exposicao"),
        "por_area": sorted(
            ({"area": area, "riscos": len(itens), "variacao_media_exposicao": media(itens, "exposicao")}
             for area, itens in por_area.items()),
            key=lambda a: -abs(a["variacao_media_exposicao"]),
        ),
    }
