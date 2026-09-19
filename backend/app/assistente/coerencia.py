"""Auditoria de coerência: cruza o texto da descrição do impacto com as notas
de impacto e probabilidade e sinaliza inconsistências para revisão.

Abordagem de PLN baseada em léxico: termos (normalizados, sem acento) associados
a consequências graves exigem um impacto mínimo; termos triviais com nota alta
indicam superestimação; relatos de que o problema "já ocorreu" exigem
probabilidade alta. É determinística e explicável -- cada alerta cita os termos
que o motivaram."""
from typing import List, Optional

from app.assistente.texto import normalizar
from app.core.exposicao import ROTULOS_IMPACTO, ROTULOS_PROBABILIDADE

TERMOS_IMPACTO_ELEVADO = [
    "vazamento", "vazar", "perda de dados", "dados pessoais", "dados sensiveis", "invasao",
    "ataque", "ransomware", "fora do ar", "parada total", "indisponibilidade total",
    "multa", "processo judicial", "sancao", "cancelamento do projeto", "inviabiliza",
    "paralisa", "prejuizo financeiro", "perda do cliente", "rescisao", "acidente",
]
TERMOS_IMPACTO_MODERADO = [
    "atraso na entrega", "estouro de orcamento", "retrabalho", "indisponibilidade",
    "queda de desempenho", "perda de qualidade", "rotatividade", "insatisfacao do cliente",
    "degradacao", "instabilidade",
]
TERMOS_IMPACTO_TRIVIAL = [
    "cosmetico", "estetico", "sem impacto", "desprezivel", "irrelevante", "trivial",
    "pequeno ajuste", "impacto minimo", "sem consequencia",
]
TERMOS_JA_OCORRENDO = [
    "ja ocorreu", "ja aconteceu", "esta ocorrendo", "esta acontecendo", "ja esta atrasad",
    "inevitavel", "certamente", "com certeza",
]


def _termos_presentes(texto: str, termos: List[str]) -> List[str]:
    return [t for t in termos if t in texto]


def auditar(
    titulo: str, descricao: str, probabilidade: Optional[int], impacto: Optional[int]
) -> List[dict]:
    texto = normalizar(f"{titulo} {descricao}")
    alertas: List[dict] = []
    if not texto:
        return alertas

    if impacto is not None:
        graves = _termos_presentes(texto, TERMOS_IMPACTO_ELEVADO)
        moderados = _termos_presentes(texto, TERMOS_IMPACTO_MODERADO)
        triviais = _termos_presentes(texto, TERMOS_IMPACTO_TRIVIAL)

        if graves and impacto < 4:
            alertas.append(
                {
                    "tipo": "impacto_subestimado",
                    "mensagem": (
                        f"O texto cita consequência grave ({', '.join(graves)}), mas o impacto "
                        f"está em {impacto} ({ROTULOS_IMPACTO[impacto]}). Considere 4 (Elevado) ou 5 (Alto)."
                    ),
                    "valor_sugerido": 4,
                    "termos": graves,
                }
            )
        elif moderados and not graves and impacto < 3:
            alertas.append(
                {
                    "tipo": "impacto_subestimado",
                    "mensagem": (
                        f"O texto cita consequência relevante ({', '.join(moderados)}), mas o "
                        f"impacto está em {impacto} ({ROTULOS_IMPACTO[impacto]}). Considere ao menos 3 (Moderado)."
                    ),
                    "valor_sugerido": 3,
                    "termos": moderados,
                }
            )
        if triviais and not graves and impacto >= 4:
            alertas.append(
                {
                    "tipo": "impacto_superestimado",
                    "mensagem": (
                        f"O texto descreve consequência mínima ({', '.join(triviais)}), mas o impacto "
                        f"está em {impacto} ({ROTULOS_IMPACTO[impacto]}). Revise a nota ou a descrição."
                    ),
                    "valor_sugerido": 2,
                    "termos": triviais,
                }
            )

    if probabilidade is not None and probabilidade < 4:
        ocorrendo = _termos_presentes(texto, TERMOS_JA_OCORRENDO)
        if ocorrendo:
            alertas.append(
                {
                    "tipo": "probabilidade_subestimada",
                    "mensagem": (
                        f"O texto indica que o problema já está ocorrendo ({', '.join(ocorrendo)}), "
                        f"mas a probabilidade está em {probabilidade} ({ROTULOS_PROBABILIDADE[probabilidade]}). "
                        "Considere 4 ou 5."
                    ),
                    "valor_sugerido": 5,
                    "termos": ocorrendo,
                }
            )

    return alertas
