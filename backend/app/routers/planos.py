"""Router de planos de contingência: consulta do catálogo que o modelo recomenda.

São os 12 planos fixos (4 grupos PMBOK x 3 níveis de severidade) definidos em
app/core/seed.py: o modelo prevê o nível do risco e devolve o plano daquele
grupo e nível. O catálogo é só leitura (aparece em Configurações > Sobre o
Argos); planos extras eventualmente cadastrados no passado não são
recomendados pelo modelo e por isso não são listados.
"""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import exigir_perfil
from app.core.seed import IDS_PLANOS_DO_MODELO
from app.database import obter_sessao
from app.models.enums import PerfilUsuario
from app.models.plano_contingencia import PlanoContingencia
from app.schemas.plano_contingencia import PlanoContingenciaResposta

roteador = APIRouter(
    prefix="/planos",
    tags=["Planos de Contingência"],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)


@roteador.get("", response_model=List[PlanoContingenciaResposta])
def listar_planos(sessao: Session = Depends(obter_sessao)):
    return (
        sessao.query(PlanoContingencia)
        .filter(PlanoContingencia.id.in_(IDS_PLANOS_DO_MODELO))
        .order_by(PlanoContingencia.id)
        .all()
    )
