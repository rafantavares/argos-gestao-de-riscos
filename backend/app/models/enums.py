"""Enumerações compartilhadas entre os models e o módulo de ML."""
import enum


class PerfilUsuario(str, enum.Enum):
    # O perfil "admin" foi removido: todo usuário é gerente de projetos. O tipo
    # perfil_usuario do Postgres ainda guarda o valor antigo, sem uso (a API
    # converte contas "admin" em "gerente" ao iniciar; ver app/main.py).
    GERENTE = "gerente"


class CategoriaRisco(str, enum.Enum):
    TECNICO = "tecnico"
    ORGANIZACIONAL = "organizacional"
    EXTERNO = "externo"
    PESSOAL = "pessoal"


class ProbabilidadeRisco(str, enum.Enum):
    """Escala de 3 níveis, usada apenas nos planos de contingência do catálogo
    (rótulo da situação típica do plano). Os riscos usam a escala 1-5 de
    app/core/exposicao.py."""

    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"


class ImpactoRisco(str, enum.Enum):
    BAIXO = "baixo"
    MEDIO = "medio"
    ALTO = "alto"


class StatusRisco(str, enum.Enum):
    IDENTIFICADO = "identificado"
    # Atribuído automaticamente quando o gerente aceita uma recomendação de plano.
    EM_TRATAMENTO = "em_tratamento"
    EM_MONITORAMENTO = "em_monitoramento"
    MITIGADO = "mitigado"
    ENCERRADO = "encerrado"


class OrcamentoImpacto(str, enum.Enum):
    """Exposição financeira do risco, caso se concretize (fator PMI de severidade)."""

    BAIXO = "baixo"
    MEDIO = "medio"
    ALTO = "alto"


class Urgencia(str, enum.Enum):
    """Proximidade temporal do risco — quão em breve ele pode se concretizar
    (fator de "proximity" do PMBOK, distinto de probabilidade de ocorrência)."""

    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"


class FaseProjeto(str, enum.Enum):
    """Fase do ciclo de vida do projeto (PMBOK) em que o risco foi identificado.
    Influencia o plano adequado: um risco descoberto na execução deixa menos
    margem de reação do que um identificado na iniciação."""

    INICIACAO = "iniciacao"
    PLANEJAMENTO = "planejamento"
    EXECUCAO = "execucao"
    ENCERRAMENTO = "encerramento"


class AreaAfetada(str, enum.Enum):
    """Categoria de negócio do risco (área do projeto afetada), como usada no
    registro de riscos do MR-MPS-SW / PMBOK. Cada área pertence a um dos 4
    grupos da RBS do PMBOK (CategoriaRisco), que é o que alimenta o ML e o
    catálogo de planos -- ver AREA_PARA_CATEGORIA."""

    CRONOGRAMA = "cronograma"
    CUSTO = "custo"
    ESCOPO = "escopo"
    QUALIDADE = "qualidade"
    SEGURANCA_INFORMACAO = "seguranca_informacao"
    INFRAESTRUTURA = "infraestrutura"
    USABILIDADE = "usabilidade"
    EQUIPE = "equipe"
    FORNECEDORES = "fornecedores"
    LEGAL_REGULATORIO = "legal_regulatorio"


AREA_PARA_CATEGORIA = {
    AreaAfetada.CRONOGRAMA: CategoriaRisco.ORGANIZACIONAL,
    AreaAfetada.CUSTO: CategoriaRisco.ORGANIZACIONAL,
    AreaAfetada.ESCOPO: CategoriaRisco.ORGANIZACIONAL,
    AreaAfetada.QUALIDADE: CategoriaRisco.TECNICO,
    AreaAfetada.SEGURANCA_INFORMACAO: CategoriaRisco.TECNICO,
    AreaAfetada.INFRAESTRUTURA: CategoriaRisco.TECNICO,
    AreaAfetada.USABILIDADE: CategoriaRisco.TECNICO,
    AreaAfetada.EQUIPE: CategoriaRisco.PESSOAL,
    AreaAfetada.FORNECEDORES: CategoriaRisco.EXTERNO,
    AreaAfetada.LEGAL_REGULATORIO: CategoriaRisco.EXTERNO,
}


def valores_enum(classe_enum):
    """Usado como values_callable do SQLAlchemy: grava o .value (ex.: "tecnico")
    no banco em vez do nome do membro Python (ex.: "TECNICO")."""
    return [membro.value for membro in classe_enum]
