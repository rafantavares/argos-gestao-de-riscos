"""Schemas Pydantic do chat com o assistente de IA."""
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class MensagemChat(BaseModel):
    papel: Literal["usuario", "assistente"]
    texto: str = Field(min_length=1, max_length=4000)


class ChatEntrada(BaseModel):
    id_projeto: int
    # Conversa salva a continuar; sem ela, o servidor cria uma nova.
    id_conversa: Optional[int] = None
    # Conversa inteira, em ordem; a última mensagem é a pergunta atual.
    mensagens: List[MensagemChat] = Field(min_length=1, max_length=40)


class ChatResposta(BaseModel):
    resposta: str
    id_conversa: Optional[int] = None
    titulo: Optional[str] = None


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


# --- histórico de conversas ---


class ConversaResumo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_projeto: int
    titulo: str
    criado_em: datetime
    atualizado_em: Optional[datetime] = None


class MensagemSalvaResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    papel: str
    texto: str
    modelo: Optional[str] = None
    criado_em: Optional[datetime] = None


class RiscoDaConversa(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    indice: str
    titulo: str


class ConversaDetalhe(ConversaResumo):
    mensagens: List[MensagemSalvaResposta]
    riscos_criados: List[RiscoDaConversa] = []


class ConversaRenomear(BaseModel):
    titulo: str = Field(min_length=1, max_length=120)
