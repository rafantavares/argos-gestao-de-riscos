"""Schemas Pydantic do chat com o assistente de IA."""
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class MensagemChat(BaseModel):
    papel: Literal["usuario", "assistente"]
    texto: str = Field(min_length=1, max_length=4000)


class ChatEntrada(BaseModel):
    id_projeto: int
    # Conversa inteira, em ordem; a última mensagem é a pergunta atual.
    mensagens: List[MensagemChat] = Field(min_length=1, max_length=40)


class ChatResposta(BaseModel):
    resposta: str


class RascunhoRisco(BaseModel):
    """Campos do "Novo risco" extraídos da conversa; o gerente revisa antes de salvar."""

    titulo: str = ""
    area_afetada: Optional[str] = None
    descricao_impacto: str = ""
    probabilidade: Optional[int] = None
    impacto: Optional[int] = None
    mitigacao: str = ""
    contingencia: str = ""
    gatilho: str = ""
