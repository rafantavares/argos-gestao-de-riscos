"""Resumo semanal do gerente: o que pede ação agora (fora do apetite sem
tratamento, reavaliações vencidas pelo prazo do projeto e recomendações
aguardando decisão).

O mesmo conteúdo serve à prévia em Configurações (GET /auth/me/resumo) e ao
e-mail semanal (POST /tarefas/resumo-semanal, disparado por um agendador). O
envio usa a API HTTP do Resend quando RESEND_API_KEY e RESUMO_REMETENTE estão
configurados; sem eles, nada é enviado."""
import html
import json
import urllib.request
from datetime import datetime, timezone

from sqlalchemy.orm import Session, selectinload

from app.core.config import configuracoes
from app.models.enums import StatusRisco
from app.models.recomendacao import Recomendacao
from app.models.risco import Risco
from app.models.usuario import Usuario

URL_RESEND = "https://api.resend.com/emails"


def _em_utc(data: datetime) -> datetime:
    return data if data.tzinfo else data.replace(tzinfo=timezone.utc)


def montar_resumo(sessao: Session, usuario: Usuario, agora: datetime | None = None) -> dict:
    agora = agora or datetime.now(timezone.utc)
    riscos = (
        sessao.query(Risco)
        .options(selectinload(Risco.reavaliacoes))
        .filter(Risco.id_gerente == usuario.id, Risco.arquivado.is_(False), Risco.status != StatusRisco.ENCERRADO)
        .all()
    )

    def item(risco, detalhe):
        return {"id": risco.id, "indice": risco.indice, "titulo": risco.titulo, "projeto": risco.projeto.nome, "detalhe": detalhe}

    fora_do_apetite = [
        item(r, f"exposição {r.probabilidade * r.impacto}, limite {r.projeto.apetite_exposicao}")
        for r in riscos
        if r.fora_do_apetite and r.status == StatusRisco.IDENTIFICADO
    ]
    reavaliar = []
    for r in riscos:
        dias = (agora - _em_utc(r.ultima_avaliacao_em)).days
        if dias >= r.prazo_reavaliacao_dias:
            reavaliar.append(item(r, f"{dias} dias sem reavaliação (prazo de {r.prazo_reavaliacao_dias})"))
    ids = [r.id for r in riscos]
    pendentes = (
        sessao.query(Recomendacao).filter(Recomendacao.id_risco.in_(ids), Recomendacao.aceita.is_(None)).all() if ids else []
    )
    por_id = {r.id: r for r in riscos}
    decisoes = [item(por_id[rec.id_risco], "plano recomendado aguardando sua decisão") for rec in pendentes]
    return {
        "fora_do_apetite": fora_do_apetite,
        "reavaliar": reavaliar,
        "decisoes_pendentes": decisoes,
        "total": len(fora_do_apetite) + len(reavaliar) + len(decisoes),
    }


SECOES = (
    ("fora_do_apetite", "Acima do limite de tolerância, sem tratamento"),
    ("reavaliar", "Reavaliação vencida"),
    ("decisoes_pendentes", "Recomendações aguardando decisão"),
)


def html_do_resumo(usuario: Usuario, resumo: dict, url_sistema: str) -> str:
    partes = [f"<p>Olá, {html.escape(usuario.nome)}. Este é o resumo semanal dos seus riscos no Argos.</p>"]
    if resumo["total"] == 0:
        partes.append("<p>Tudo em dia: nada acima do limite de tolerância, nenhuma reavaliação vencida e nenhuma decisão pendente.</p>")
    for chave, titulo in SECOES:
        itens = resumo[chave]
        if not itens:
            continue
        linhas = "".join(
            f"<li><strong>{html.escape(i['indice'])} {html.escape(i['titulo'])}</strong> "
            f"({html.escape(i['projeto'])}): {html.escape(i['detalhe'])}</li>"
            for i in itens
        )
        partes.append(f"<h3>{titulo} ({len(itens)})</h3><ul>{linhas}</ul>")
    partes.append(f'<p><a href="{url_sistema}">Abrir o Argos</a>. Para deixar de receber, desligue o resumo em Configurações.</p>')
    return "".join(partes)


def enviar_email(destinatario: str, assunto: str, corpo_html: str) -> None:
    dados = json.dumps(
        {"from": configuracoes.resumo_remetente, "to": [destinatario], "subject": assunto, "html": corpo_html}
    ).encode()
    requisicao = urllib.request.Request(
        URL_RESEND,
        data=dados,
        headers={"Authorization": f"Bearer {configuracoes.resend_api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(requisicao, timeout=20):
        pass


def envio_configurado() -> bool:
    return bool(configuracoes.resend_api_key and configuracoes.resumo_remetente)
