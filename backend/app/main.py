"""Ponto de entrada da API FastAPI."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.seed import semear_planos_contingencia
from app.database import Base, SessaoLocal, engine
from app.routers import auth, ml, planos, projetos, recomendacoes, relatorio, riscos

app = FastAPI(title="Sistema de Gestão de Riscos com Análise Preditiva")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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


@app.on_event("startup")
def preparar_banco() -> None:
    Base.metadata.create_all(bind=engine)
    sessao = SessaoLocal()
    try:
        semear_planos_contingencia(sessao)
    finally:
        sessao.close()


@app.get("/")
def status():
    return {"status": "ok"}
