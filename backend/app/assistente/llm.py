"""Acesso ao modelo de linguagem usado pelo chat do assistente.

Todo o contato com o provedor (hoje o Google Gemini, via SDK `google-genai`)
fica isolado neste módulo: para trocar de provedor, só esta função muda. A
chave vem da variável de ambiente GEMINI_API_KEY e o modelo de GEMINI_MODEL."""
from functools import lru_cache
from typing import List

from app.core.config import configuracoes


class AssistenteIndisponivel(Exception):
    """O chat não está configurado (sem chave de API)."""


class FalhaNoProvedor(Exception):
    """O provedor de IA recusou ou falhou ao responder (limite, rede etc.)."""


@lru_cache(maxsize=1)
def _cliente():
    from google import genai

    return genai.Client(api_key=configuracoes.gemini_api_key)


def responder(instrucoes: str, mensagens: List[dict]) -> str:
    """`mensagens`: dicts com `papel` ("usuario" | "assistente") e `texto`,
    em ordem cronológica, terminando numa mensagem do usuário."""
    if not configuracoes.gemini_api_key:
        raise AssistenteIndisponivel(
            "O assistente de IA não está configurado: defina GEMINI_API_KEY no servidor."
        )

    from google.genai import errors, types

    conteudo = [
        types.Content(
            role="user" if m["papel"] == "usuario" else "model",
            parts=[types.Part(text=m["texto"])],
        )
        for m in mensagens
    ]
    try:
        resposta = _cliente().models.generate_content(
            model=configuracoes.gemini_model,
            contents=conteudo,
            config=types.GenerateContentConfig(
                system_instruction=instrucoes,
                temperature=0.4,
                max_output_tokens=2048,
            ),
        )
    except errors.APIError as erro:
        codigo = getattr(erro, "code", None)
        if codigo == 429:
            raise FalhaNoProvedor(
                "Limite de uso da IA atingido. Aguarde um minuto e tente novamente."
            ) from erro
        raise FalhaNoProvedor(f"O serviço de IA retornou um erro ({codigo}).") from erro
    except Exception as erro:  # rede, timeout
        raise FalhaNoProvedor("Não foi possível falar com o serviço de IA.") from erro

    texto = (resposta.text or "").strip()
    if not texto:
        raise FalhaNoProvedor("A IA não devolveu resposta. Reformule a pergunta.")
    return texto
