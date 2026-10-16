"""Ponto de entrada da API FastAPI."""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.seed import semear_planos_contingencia
from app.database import Base, SessaoLocal, engine
from app.routers import auth, chat, ml, planos, projetos, recomendacoes, relatorio, riscos


@asynccontextmanager
async def ciclo_de_vida(_app: FastAPI):
    """Na subida da API: cria as tabelas que faltarem e semeia o catálogo de planos."""
    Base.metadata.create_all(bind=engine)
    sessao = SessaoLocal()
    try:
        semear_planos_contingencia(sessao)
    finally:
        sessao.close()
    yield


app = FastAPI(title="Sistema de Gestão de Riscos com Análise Preditiva", lifespan=ciclo_de_vida)

_origens_padrao = "http://localhost:5173,http://localhost:3000"
# Endereços públicos do frontend (Vercel), aceitos sempre, além dos que vierem
# em CORS_ORIGINS. Não são segredo: são os links do site.
ORIGENS_PUBLICAS = ["https://argos-ti.vercel.app", "https://gestao-risco.vercel.app"]
_origens = {o.strip() for o in os.getenv("CORS_ORIGINS", _origens_padrao).split(",") if o.strip()}
_origens.update(ORIGENS_PUBLICAS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(_origens),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.roteador)
app.include_router(projetos.roteador)
app.include_router(riscos.roteador)
app.include_router(recomendacoes.roteador)
app.include_router(planos.roteador)
app.include_router(ml.roteador)
app.include_router(relatorio.roteador)
app.include_router(chat.roteador)


@app.get("/")
def status():
    return {"status": "ok"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/banco")
def health_banco():
    """Testa o banco de verdade. Chamado diariamente pela rotina do GitHub
    (.github/workflows/manter-ativo.yml) para o Supabase gratuito não pausar."""
    from sqlalchemy import text

    sessao = SessaoLocal()
    try:
        sessao.execute(text("SELECT 1"))
    finally:
        sessao.close()
    return {"status": "ok", "banco": "ok"}
