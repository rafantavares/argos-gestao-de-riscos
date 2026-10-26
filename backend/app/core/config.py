"""Configurações da aplicação, carregadas a partir de variáveis de ambiente."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracoes(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str
    jwt_chave_secreta: str
    jwt_algoritmo: str = "HS256"
    jwt_expiracao_minutos: int = 480  # 8 horas: um dia de trabalho sem relogar
    # Chat do assistente (Google Gemini). Sem chave, o chat responde 503.
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-latest"
    # Usados em ordem quando o modelo principal está sobrecarregado ou no limite.
    gemini_modelos_reserva: str = "gemini-2.5-flash,gemini-flash-lite-latest"


configuracoes = Configuracoes()
