import csv
from pathlib import Path

# Matriz de probabilidade x impacto -> nível de severidade (PMI, 2021).
# (probabilidade, impacto, nivel, quantidade_de_registros)
COMBOS = [
    ("baixa", "baixo", "baixo", 3),
    ("baixa", "medio", "baixo", 3),
    ("baixa", "alto", "medio", 3),
    ("media", "baixo", "baixo", 3),
    ("media", "medio", "medio", 3),
    ("media", "alto", "alto", 3),
    ("alta", "baixo", "medio", 3),
    ("alta", "medio", "alto", 2),
    ("alta", "alto", "alto", 2),
]

CATEGORIAS = ["tecnico", "organizacional", "externo", "pessoal"]

# Planos de contingência por (categoria, nível de severidade), com variações de
# redação para simular registros de diferentes gerentes ao longo do tempo.
PLANOS: dict[tuple[str, str], list[str]] = {
    ("tecnico", "baixo"): [
        "Registrar o risco técnico no backlog de débito técnico e monitorar em revisões de sprint, sem ação corretiva imediata.",
        "Acompanhar o item técnico nas cerimônias ágeis e reavaliar a severidade a cada sprint.",
    ],
    ("tecnico", "medio"): [
        "Realizar revisão técnica direcionada (code review/arquitetura) com o time e alocar tempo no próximo sprint para mitigação.",
        "Envolver o tech lead para avaliar o componente afetado e planejar correção incremental nos próximos ciclos.",
    ],
    ("tecnico", "alto"): [
        "Acionar imediatamente o arquiteto/tech lead, suspender entregas dependentes do componente afetado e definir plano de correção com prazo.",
        "Interromper o desenvolvimento de funcionalidades dependentes, formar força-tarefa técnica e escalar para a liderança de engenharia.",
    ],
    ("organizacional", "baixo"): [
        "Registrar a ocorrência em ata e reforçar o processo já definido na próxima reunião de acompanhamento.",
        "Comunicar o desvio de processo ao time e reforçar o checklist de governança já existente.",
    ],
    ("organizacional", "medio"): [
        "Escalar para o PMO, revisar o cronograma e renegociar prioridades com as partes interessadas.",
        "Convocar reunião extraordinária com o sponsor para realinhar expectativas e ajustar o plano do projeto.",
    ],
    ("organizacional", "alto"): [
        "Convocar comitê de mudanças com patrocinador e stakeholders-chave para redefinir escopo, prazos e recursos do projeto.",
        "Suspender temporariamente novas frentes de trabalho e reestruturar a governança do projeto com apoio da diretoria.",
    ],
    ("externo", "baixo"): [
        "Acompanhar o fornecedor/parceiro externo periodicamente e manter a cláusula de SLA como salvaguarda contratual.",
        "Monitorar indicadores externos (mercado, regulação) relacionados ao risco, sem ação corretiva imediata.",
    ],
    ("externo", "medio"): [
        "Acionar fornecedor alternativo pré-qualificado e revisar as cláusulas de contingência com o parceiro atual.",
        "Antecipar pedidos/entregas críticas junto ao fornecedor e formalizar plano de contingência contratual.",
    ],
    ("externo", "alto"): [
        "Ativar plano de contingência contratual, substituir o fornecedor/parceiro crítico e comunicar formalmente o impacto às partes interessadas.",
        "Acionar cláusula de rescisão/penalidade contratual e migrar para fornecedor backup imediatamente.",
    ],
    ("pessoal", "baixo"): [
        "Reforçar pareamento (pair work) e documentação de conhecimento crítico para reduzir dependência de uma única pessoa.",
        "Registrar o risco de disponibilidade da equipe e acompanhar em reuniões de status quinzenais.",
    ],
    ("pessoal", "medio"): [
        "Redistribuir tarefas entre a equipe, iniciar capacitação de backup e ajustar o cronograma de entregas.",
        "Solicitar apoio temporário de outro time e revisar a carga de trabalho dos membros afetados.",
    ],
    ("pessoal", "alto"): [
        "Acionar contratação emergencial ou realocação de recursos de outro projeto, e renegociar prazos críticos com o patrocinador.",
        "Mobilizar recursos seniores de outras equipes e reestruturar o cronograma para absorver a perda de competência crítica.",
    ],
}


def gerar_linhas() -> list[dict[str, str]]:
    linhas = []
    for categoria in CATEGORIAS:
        for probabilidade, impacto, nivel, quantidade in COMBOS:
            variantes = PLANOS[(categoria, nivel)]
            for i in range(quantidade):
                linhas.append(
                    {
                        "categoria": categoria,
                        "probabilidade": probabilidade,
                        "impacto": impacto,
                        "plano_contingencia": variantes[i % len(variantes)],
                    }
                )
    return linhas


def main() -> None:
    linhas = gerar_linhas()
    caminho = Path(__file__).parent / "dataset.csv"
    with caminho.open("w", newline="", encoding="utf-8") as arquivo:
        writer = csv.DictWriter(
            arquivo, fieldnames=["categoria", "probabilidade", "impacto", "plano_contingencia"]
        )
        writer.writeheader()
        writer.writerows(linhas)
    print(f"{len(linhas)} registros gravados em {caminho}")


if __name__ == "__main__":
    main()
