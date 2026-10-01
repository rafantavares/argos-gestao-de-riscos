"""Configurações da aplicação, carregadas a partir de variáveis de ambiente."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracoes(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str
    jwt_chave_secreta: str
    jwt_algoritmo: str = "HS256"
    jwt_expiracao_minutos: int = 60
    # Chat do assistente (Google Gemini). Sem chave, o chat responde 503.
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-latest"


configuracoes = Configuracoes()
