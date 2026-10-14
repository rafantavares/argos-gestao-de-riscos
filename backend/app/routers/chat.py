"""Router do chat com o assistente de IA (modelo de linguagem com o contexto do projeto)."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.assistente import chat, llm
from app.core.security import exigir_perfil, obter_usuario_atual
from app.database import obter_sessao
from app.models.enums import PerfilUsuario
from app.models.plano_contingencia import PlanoContingencia
from app.models.projeto import Projeto
from app.models.risco import Risco
from app.models.usuario import Usuario
from app.routers.riscos import _verificar_gerente_vinculado
from app.models.conversa_chat import ConversaChat
from app.models.conversa_chat import MensagemChat as MensagemSalva
from app.schemas.chat import (
    ChatEntrada,
    ChatResposta,
    ConversaDetalhe,
    ConversaRenomear,
    ConversaResumo,
    RascunhoRisco,
)

roteador = APIRouter(prefix="/chat", tags=["Chat"])


@roteador.post(
    "",
    response_model=ChatResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def conversar(
    dados: ChatEntrada,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    """Responde à conversa do gerente com sugestões de registro e tratamento do
    risco e salva a pergunta e a resposta no histórico (cria a conversa na
    primeira mensagem). O contexto enviado ao modelo é a conversa recebida."""
    _verificar_gerente_vinculado(dados.id_projeto, gerente, sessao)
    if dados.mensagens[-1].papel != "usuario":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A última mensagem deve ser do usuário",
        )

    conversa = (
        _obter_conversa(dados.id_conversa, gerente, sessao)
        if dados.id_conversa
        else ConversaChat(
            id_projeto=dados.id_projeto,
            id_gerente=gerente.id,
            titulo=_titulo_da_conversa(dados.mensagens[-1].texto),
        )
    )
    if conversa.id_projeto != dados.id_projeto:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A conversa é de outro projeto")

    instrucoes = _instrucoes_do_projeto(dados.id_projeto, sessao)
    detalhes = {}
    resposta = _chamar(instrucoes, [m.model_dump() for m in dados.mensagens], detalhes=detalhes)

    conversa.mensagens.append(MensagemSalva(papel="usuario", texto=dados.mensagens[-1].texto))
    conversa.mensagens.append(MensagemSalva(papel="assistente", texto=resposta, modelo=detalhes.get("modelo")))
    conversa.atualizado_em = func.now()
    sessao.add(conversa)
    sessao.commit()
    return ChatResposta(resposta=resposta, id_conversa=conversa.id, titulo=conversa.titulo)


def _instrucoes_do_projeto(id_projeto: int, sessao: Session) -> str:
    projeto = sessao.get(Projeto, id_projeto)
    riscos = (
        sessao.query(Risco).filter(Risco.id_projeto == id_projeto, Risco.arquivado.is_(False)).all()
    )
    planos = sessao.query(PlanoContingencia).filter(PlanoContingencia.ativo.is_(True)).all()
    return chat.montar_instrucoes(projeto, riscos, planos)


def _chamar(instrucoes: str, mensagens: list, formato_json: bool = False, detalhes: dict = None) -> str:
    try:
        if detalhes is None:
            return llm.responder(instrucoes, mensagens, formato_json=formato_json)
        return llm.responder(instrucoes, mensagens, formato_json=formato_json, detalhes=detalhes)
    except llm.AssistenteIndisponivel as erro:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(erro))
    except llm.FalhaNoProvedor as erro:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(erro))


@roteador.post(
    "/rascunho",
    response_model=RascunhoRisco,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def gerar_rascunho(
    dados: ChatEntrada,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    """Transforma a conversa num rascunho de risco para pré-preencher o "Novo risco"."""
    _verificar_gerente_vinculado(dados.id_projeto, gerente, sessao)
    instrucoes = chat.instrucoes_rascunho(_instrucoes_do_projeto(dados.id_projeto, sessao))
    mensagens = [m.model_dump() for m in dados.mensagens]
    mensagens.append({"papel": "usuario", "texto": chat.PEDIDO_RASCUNHO})
    resposta = _chamar(instrucoes, mensagens, formato_json=True)
    return RascunhoRisco(**chat.interpretar_rascunho(resposta))


# ---------- histórico de conversas ----------


def _titulo_da_conversa(primeira_pergunta: str) -> str:
    texto = " ".join(primeira_pergunta.split())
    return texto if len(texto) <= 60 else texto[:57].rstrip() + "..."


def _obter_conversa(id_conversa: int, gerente: Usuario, sessao: Session) -> ConversaChat:
    conversa = sessao.get(ConversaChat, id_conversa)
    if conversa is None or conversa.id_gerente != gerente.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversa não encontrada")
    return conversa


@roteador.get(
    "/conversas",
    response_model=List[ConversaResumo],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def listar_conversas(
    id_projeto: int,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    """Conversas do gerente no projeto, das mais recentes para as mais antigas."""
    _verificar_gerente_vinculado(id_projeto, gerente, sessao)
    return (
        sessao.query(ConversaChat)
        .filter(ConversaChat.id_projeto == id_projeto, ConversaChat.id_gerente == gerente.id)
        .order_by(ConversaChat.atualizado_em.desc(), ConversaChat.id.desc())
        .all()
    )


@roteador.get(
    "/conversas/{id_conversa}",
    response_model=ConversaDetalhe,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def obter_conversa(
    id_conversa: int,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    conversa = _obter_conversa(id_conversa, gerente, sessao)
    riscos = (
        sessao.query(Risco)
        .filter(Risco.id_conversa_origem == conversa.id, Risco.arquivado.is_(False))
        .all()
    )
    detalhe = ConversaDetalhe.model_validate(conversa)
    detalhe.riscos_criados = [{"id": r.id, "indice": r.indice, "titulo": r.titulo} for r in riscos]
    return detalhe


@roteador.patch(
    "/conversas/{id_conversa}",
    response_model=ConversaResumo,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def renomear_conversa(
    id_conversa: int,
    dados: ConversaRenomear,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    conversa = _obter_conversa(id_conversa, gerente, sessao)
    conversa.titulo = dados.titulo.strip()
    sessao.commit()
    sessao.refresh(conversa)
    return conversa


@roteador.delete(
    "/conversas/{id_conversa}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def excluir_conversa(
    id_conversa: int,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    """Exclui a conversa e suas mensagens; os riscos criados a partir dela ficam,
    só perdem o vínculo de origem."""
    conversa = _obter_conversa(id_conversa, gerente, sessao)
    sessao.query(Risco).filter(Risco.id_conversa_origem == conversa.id).update(
        {Risco.id_conversa_origem: None}, synchronize_session=False
    )
    sessao.delete(conversa)
    sessao.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
