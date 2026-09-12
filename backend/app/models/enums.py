"""Enumerações compartilhadas entre os models e o módulo de ML."""
import enum


class PerfilUsuario(str, enum.Enum):
    ADMIN = "admin"
    GERENTE = "gerente"


class CategoriaRisco(str, enum.Enum):
    TECNICO = "tecnico"
    ORGANIZACIONAL = "organizacional"
    EXTERNO = "externo"
    PESSOAL = "pessoal"


class ProbabilidadeRisco(str, enum.Enum):
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


def valores_enum(classe_enum):
    """Usado como values_callable do SQLAlchemy: grava o .value (ex.: "tecnico")
    no banco em vez do nome do membro Python (ex.: "TECNICO")."""
    return [membro.value for membro in classe_enum]
