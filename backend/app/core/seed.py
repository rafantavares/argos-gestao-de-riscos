"""Popula a tabela planos_contingencia com os 12 planos usados como rótulo pelo
módulo de ML (mesma correspondência categoria/severidade usada para gerar o
dataset.csv). Cada plano representa a combinação típica de probabilidade e
impacto do seu "nível de severidade" (baixo/médio/alto); a recomendação real
para uma combinação específica é feita pelo modelo treinado, não por busca
direta nestes três campos.

Executar uma vez, após configurar a conexão com o banco:
    python -m app.core.seed
"""
from sqlalchemy.orm import Session

from app.database import Base, SessaoLocal, engine
from app.models.enums import CategoriaRisco, ImpactoRisco, ProbabilidadeRisco
from app.models.plano_contingencia import PlanoContingencia

PLANOS_INICIAIS = [
    dict(
        id=1,
        categoria=CategoriaRisco.TECNICO,
        probabilidade=ProbabilidadeRisco.BAIXA,
        impacto=ImpactoRisco.BAIXO,
        descricao="Revisão técnica adicional e testes complementares para mitigar o risco antes que se concretize.",
    ),
    dict(
        id=2,
        categoria=CategoriaRisco.TECNICO,
        probabilidade=ProbabilidadeRisco.MEDIA,
        impacto=ImpactoRisco.MEDIO,
        descricao="Contratação de especialista técnico temporário para dar suporte à equipe.",
    ),
    dict(
        id=3,
        categoria=CategoriaRisco.TECNICO,
        probabilidade=ProbabilidadeRisco.ALTA,
        impacto=ImpactoRisco.ALTO,
        descricao="Substituição da tecnologia ou arquitetura por uma alternativa já validada no mercado.",
    ),
    dict(
        id=4,
        categoria=CategoriaRisco.ORGANIZACIONAL,
        probabilidade=ProbabilidadeRisco.BAIXA,
        impacto=ImpactoRisco.BAIXO,
        descricao="Comunicação formal com os stakeholders internos para alinhar expectativas.",
    ),
    dict(
        id=5,
        categoria=CategoriaRisco.ORGANIZACIONAL,
        probabilidade=ProbabilidadeRisco.MEDIA,
        impacto=ImpactoRisco.MEDIO,
        descricao="Realocação de recursos entre equipes para equilibrar a carga de trabalho.",
    ),
    dict(
        id=6,
        categoria=CategoriaRisco.ORGANIZACIONAL,
        probabilidade=ProbabilidadeRisco.ALTA,
        impacto=ImpactoRisco.ALTO,
        descricao="Escalonamento ao comitê executivo e replanejamento do cronograma do projeto.",
    ),
    dict(
        id=7,
        categoria=CategoriaRisco.EXTERNO,
        probabilidade=ProbabilidadeRisco.BAIXA,
        impacto=ImpactoRisco.BAIXO,
        descricao="Monitoramento contínuo de fornecedores e cláusulas contratuais.",
    ),
    dict(
        id=8,
        categoria=CategoriaRisco.EXTERNO,
        probabilidade=ProbabilidadeRisco.MEDIA,
        impacto=ImpactoRisco.MEDIO,
        descricao="Ativação de fornecedor ou contrato alternativo (plano B) previamente mapeado.",
    ),
    dict(
        id=9,
        categoria=CategoriaRisco.EXTERNO,
        probabilidade=ProbabilidadeRisco.ALTA,
        impacto=ImpactoRisco.ALTO,
        descricao="Renegociação contratual e acionamento das cláusulas de contingência com o fornecedor.",
    ),
    dict(
        id=10,
        categoria=CategoriaRisco.PESSOAL,
        probabilidade=ProbabilidadeRisco.BAIXA,
        impacto=ImpactoRisco.BAIXO,
        descricao="Treinamento e capacitação da equipe para reduzir a dependência de conhecimento individual.",
    ),
    dict(
        id=11,
        categoria=CategoriaRisco.PESSOAL,
        probabilidade=ProbabilidadeRisco.MEDIA,
        impacto=ImpactoRisco.MEDIO,
        descricao="Contratação de recurso temporário ou redistribuição de tarefas entre a equipe.",
    ),
    dict(
        id=12,
        categoria=CategoriaRisco.PESSOAL,
        probabilidade=ProbabilidadeRisco.ALTA,
        impacto=ImpactoRisco.ALTO,
        descricao="Plano de retenção de talentos e definição de sucessão para papéis críticos do projeto.",
    ),
]


def semear_planos_contingencia(sessao: Session) -> None:
    """Insere os planos iniciais apenas se a tabela ainda estiver vazia (idempotente)."""
    if sessao.query(PlanoContingencia).count() > 0:
        return

    sessao.bulk_insert_mappings(PlanoContingencia, PLANOS_INICIAIS)
    sessao.commit()


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    sessao_cli = SessaoLocal()
    try:
        semear_planos_contingencia(sessao_cli)
        print(f"{len(PLANOS_INICIAIS)} planos de contingência verificados/inseridos.")
    finally:
        sessao_cli.close()
