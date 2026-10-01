"""Router do chat com o assistente de IA (modelo de linguagem com o contexto do projeto)."""
from fastapi import APIRouter, Depends, HTTPException, status
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
from app.schemas.chat import ChatEntrada, ChatResposta

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
    risco. Não grava nada: o histórico da conversa vem do cliente a cada chamada."""
    _verificar_gerente_vinculado(dados.id_projeto, gerente, sessao)
    if dados.mensagens[-1].papel != "usuario":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A última mensagem deve ser do usuário",
        )

    projeto = sessao.get(Projeto, dados.id_projeto)
    riscos = sessao.query(Risco).filter(Risco.id_projeto == dados.id_projeto).all()
    planos = sessao.query(PlanoContingencia).filter(PlanoContingencia.ativo.is_(True)).all()
    instrucoes = chat.montar_instrucoes(projeto, riscos, planos)

    try:
        resposta = llm.responder(instrucoes, [m.model_dump() for m in dados.mensagens])
    except llm.AssistenteIndisponivel as erro:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(erro))
    except llm.FalhaNoProvedor as erro:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(erro))
    return ChatResposta(resposta=resposta)
