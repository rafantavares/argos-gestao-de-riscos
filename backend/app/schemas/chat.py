"""Schemas Pydantic do chat com o assistente de IA."""
from typing import List, Literal

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
