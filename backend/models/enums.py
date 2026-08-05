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


class AlgoritmoML(str, enum.Enum):
    KNN = "knn"
    DECISION_TREE = "decision_tree"
    RANDOM_FOREST = "random_forest"
