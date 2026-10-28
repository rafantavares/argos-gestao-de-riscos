"""Tarefas agendadas, disparadas de fora (ex.: GitHub Actions) com um token
próprio no cabeçalho X-Tarefa-Token, sem login de usuário."""
import hmac

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import configuracoes
from app.core.resumo import envio_configurado, enviar_email, html_do_resumo, montar_resumo
from app.database import obter_sessao
from app.models.usuario import Usuario

roteador = APIRouter(prefix="/tarefas", tags=["Tarefas agendadas"])


def _exigir_token_tarefa(x_tarefa_token: str = Header(default="")) -> None:
    esperado = configuracoes.tarefas_token
    if not esperado or not hmac.compare_digest(x_tarefa_token, esperado):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de tarefa inválido")


@roteador.post("/resumo-semanal", dependencies=[Depends(_exigir_token_tarefa)])
def enviar_resumo_semanal(sessao: Session = Depends(obter_sessao)):
    """Envia o resumo a quem ligou "Resumo semanal por e-mail" em Configurações.
    Quem não tem nada pendente não recebe e-mail."""
    if not envio_configurado():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Envio de e-mail não configurado")
    enviados, sem_pendencias, falhas = 0, 0, 0
    usuarios = sessao.query(Usuario).filter(Usuario.excluido_em.is_(None)).all()
    for usuario in usuarios:
        if not (usuario.preferencias or {}).get("resumo_semanal"):
            continue
        resumo = montar_resumo(sessao, usuario)
        if resumo["total"] == 0:
            sem_pendencias += 1
            continue
        try:
            enviar_email(
                usuario.email,
                f"Argos: {resumo['total']} {'item pede' if resumo['total'] == 1 else 'itens pedem'} sua atenção",
                html_do_resumo(usuario, resumo, configuracoes.url_frontend),
            )
            enviados += 1
        except Exception:  # noqa: BLE001 -- um destinatário com problema não para os outros
            falhas += 1
    return {"enviados": enviados, "sem_pendencias": sem_pendencias, "falhas": falhas}
