"""Router de relatórios: exportação dos riscos de um projeto com suas
recomendações, em JSON (o frontend converte para CSV)."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.exposicao import avaliacao_exposicao, pontuacao_exposicao
from app.core.security import exigir_perfil, obter_usuario_atual
from app.database import obter_sessao
from app.models.enums import PerfilUsuario
from app.models.projeto import Projeto
from app.models.recomendacao import Recomendacao
from app.models.risco import Risco
from app.models.usuario import Usuario
from app.schemas.relatorio import RelatorioRiscosResposta, RiscoRelatorio

roteador = APIRouter(
    prefix="/relatorio",
    tags=["Relatórios"],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.ADMIN))],
)


@roteador.get("/riscos", response_model=RelatorioRiscosResposta)
def relatorio_riscos(
    id_projeto: Optional[int] = Query(default=None, description="Projeto a exportar; omitido = todos os projetos do admin"),
    id_gerente: Optional[int] = Query(default=None, description="Gerente a filtrar; omitido = todos os gerentes"),
    sessao: Session = Depends(obter_sessao),
    admin: Usuario = Depends(obter_usuario_atual),
):
    """Todos os riscos do projeto selecionado (ou de todos os projetos do admin)
    com as recomendações geradas para cada um e o status de aceite."""
    consulta_projetos = sessao.query(Projeto).filter(Projeto.id_admin == admin.id)
    if id_projeto is not None:
        consulta_projetos = consulta_projetos.filter(Projeto.id == id_projeto)
    projetos: List[Projeto] = consulta_projetos.all()

    if id_projeto is not None and not projetos:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado")

    ids_projetos = [p.id for p in projetos]
    nomes_projetos = {p.id: p.nome for p in projetos}

    consulta_riscos = (
        sessao.query(Risco)
        .options(
            joinedload(Risco.gerente),
            joinedload(Risco.recomendacoes).joinedload(Recomendacao.plano),
        )
        .filter(Risco.id_projeto.in_(ids_projetos))
    )
    if id_gerente is not None:
        consulta_riscos = consulta_riscos.filter(Risco.id_gerente == id_gerente)

    riscos = consulta_riscos.order_by(Risco.id_projeto, Risco.id).all()

    linhas = [
        RiscoRelatorio(
            id=risco.id,
            titulo=risco.titulo,
            projeto=nomes_projetos[risco.id_projeto],
            id_projeto=risco.id_projeto,
            gerente=risco.gerente.nome,
            indice=risco.indice,
            categoria=risco.categoria,
            area_afetada=risco.area_afetada,
            descricao_impacto=risco.descricao_impacto,
            probabilidade=risco.probabilidade,
            impacto=risco.impacto,
            exposicao=pontuacao_exposicao(risco.probabilidade, risco.impacto),
            avaliacao_exposicao=avaliacao_exposicao(
                pontuacao_exposicao(risco.probabilidade, risco.impacto)
            ),
            mitigacao=risco.mitigacao,
            contingencia=risco.contingencia,
            gatilho=risco.gatilho,
            orcamento_impacto=risco.orcamento_impacto,
            urgencia=risco.urgencia,
            fase_projeto=risco.fase_projeto,
            status=risco.status,
            criado_em=risco.criado_em,
            recomendacoes=[
                {
                    "id": rec.id,
                    "id_plano": rec.id_plano,
                    "descricao_plano": rec.plano.descricao,
                    "algoritmo_usado": rec.algoritmo_usado,
                    "acuracia_momento": rec.acuracia_momento,
                    "confianca": rec.confianca,
                    "aceita": rec.aceita,
                    "criado_em": rec.criado_em,
                }
                for rec in risco.recomendacoes
            ],
        )
        for risco in riscos
    ]

    return RelatorioRiscosResposta(
        id_projeto=id_projeto,
        total_riscos=len(linhas),
        total_recomendacoes=sum(len(l.recomendacoes) for l in linhas),
        riscos=linhas,
    )
