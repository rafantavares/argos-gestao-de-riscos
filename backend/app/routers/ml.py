"""Router do módulo de ML: métricas atuais e importância das features.

Usados pelo painel "Modelo de IA" do gerente e pela aba Sobre das configurações."""
from fastapi import APIRouter, Depends

from app.core.security import exigir_perfil, obter_usuario_atual
from app.ml.predictor import obter_importancia_features, obter_metricas_atuais
from app.models.enums import PerfilUsuario
from app.schemas.ml import ImportanciaFeaturesResposta

roteador = APIRouter(prefix="/ml", tags=["Machine Learning"])


@roteador.get(
    "/feature-importance",
    response_model=ImportanciaFeaturesResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def importancia_features():
    """Importância relativa de cada feature no Random Forest (soma 1.0),
    ordenada da mais para a menos relevante."""
    return obter_importancia_features()


@roteador.get("/metricas", dependencies=[Depends(obter_usuario_atual)])
def metricas_atuais():
    """Conteúdo de metricas.json: acurácia, precisão, recall e F1 (macro) de
    cada algoritmo na última validação cruzada, mais metadados do dataset."""
    return obter_metricas_atuais()
