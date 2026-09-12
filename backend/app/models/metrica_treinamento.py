"""Model ORM da entidade MetricaTreinamento: histórico das métricas de cada
retreino do modelo de ML, uma linha por algoritmo a cada vez que
`treinar_e_avaliar` roda. Persistido pelo *caller* (não pelo módulo `app.ml`,
que não depende de banco) -- ver `app/routers/recomendacoes.py`."""
from sqlalchemy import Column, DateTime, Float, Integer, String, Text, func

from app.database import Base


class MetricaTreinamento(Base):
    __tablename__ = "metricas_treinamento"

    id = Column(Integer, primary_key=True, index=True)
    algoritmo = Column(String(50), nullable=False)
    acuracia = Column(Float, nullable=False)
    precisao = Column(Float, nullable=False)
    recall = Column(Float, nullable=False)
    f1 = Column(Float, nullable=True)
    melhores_parametros = Column(Text, nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
