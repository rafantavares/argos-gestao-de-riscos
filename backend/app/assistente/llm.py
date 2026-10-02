"""Acesso ao modelo de linguagem usado pelo chat do assistente.

Todo o contato com o provedor (hoje o Google Gemini, via SDK `google-genai`)
fica isolado neste módulo: para trocar de provedor, só esta função muda. A
chave vem da variável de ambiente GEMINI_API_KEY, o modelo principal de
GEMINI_MODEL e os modelos reserva de GEMINI_MODELOS_RESERVA.

Plano B: se o modelo principal estiver sobrecarregado (503), no limite de uso
(429), com erro interno ou demorando demais, a mesma pergunta vai na hora para
o próximo modelo da lista. Cada tentativa tem tempo máximo e não é repetida
pelo SDK, para o gerente não ficar esperando um modelo travado."""
import logging
from functools import lru_cache
from typing import List

from app.core.config import configuracoes

log = logging.getLogger(__name__)

TEMPO_MAXIMO_MS = 30_000
CODIGOS_PARA_TROCAR_DE_MODELO = {429, 500, 502, 503, 504}


class AssistenteIndisponivel(Exception):
    """O chat não está configurado (sem chave de API)."""


class FalhaNoProvedor(Exception):
    """O provedor de IA recusou ou falhou ao responder (limite, rede etc.)."""


@lru_cache(maxsize=1)
def _cliente():
    from google import genai
    from google.genai import types

    return genai.Client(
        api_key=configuracoes.gemini_api_key,
        http_options=types.HttpOptions(
            timeout=TEMPO_MAXIMO_MS,
            # Uma tentativa por modelo: quem decide trocar de modelo é responder().
            retry_options=types.HttpRetryOptions(attempts=1),
        ),
    )


def modelos_em_ordem() -> List[str]:
    reservas = [m.strip() for m in configuracoes.gemini_modelos_reserva.split(",") if m.strip()]
    ordem = [configuracoes.gemini_model, *reservas]
    return list(dict.fromkeys(ordem))  # sem repetidos, mantendo a ordem


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
    config = types.GenerateContentConfig(
        system_instruction=instrucoes,
        temperature=0.4,
        max_output_tokens=2048,
        # Sem ferramentas: desliga a chamada automática de funções do SDK.
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )

    ultimo_codigo = None
    for modelo in modelos_em_ordem():
        try:
            resposta = _cliente().models.generate_content(
                model=modelo, contents=conteudo, config=config
            )
        except errors.APIError as erro:
            ultimo_codigo = getattr(erro, "code", None)
            if ultimo_codigo in CODIGOS_PARA_TROCAR_DE_MODELO:
                log.warning("Modelo %s indisponível (%s); tentando o próximo.", modelo, ultimo_codigo)
                continue
            raise FalhaNoProvedor(f"O serviço de IA retornou um erro ({ultimo_codigo}).") from erro
        except Exception as erro:  # rede ou tempo esgotado: tenta o próximo modelo
            log.warning("Falha ao chamar o modelo %s: %s", modelo, erro)
            ultimo_codigo = None
            continue

        texto = (resposta.text or "").strip()
        if texto:
            return texto
        log.warning("Modelo %s devolveu resposta vazia; tentando o próximo.", modelo)

    if ultimo_codigo == 429:
        raise FalhaNoProvedor("Limite de uso da IA atingido. Aguarde um minuto e tente novamente.")
    raise FalhaNoProvedor(
        "O serviço de IA está sobrecarregado no momento. Tente novamente em instantes."
    )
