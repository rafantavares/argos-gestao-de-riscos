"""Geração de propostas de mitigação, contingência e gatilho.

A partir da área afetada e do nível de exposição, monta um rascunho para o
gerente revisar (deixa de partir do zero). Quando há um plano de contingência
recomendado pelo ML e aceito, ele passa a ser a contingência do risco.

Implementação por modelos de texto (sem API paga): cada área tem uma
estratégia preventiva, uma reativa e um indicador de gatilho; o nível de
exposição define a cadência de acompanhamento e a instância de escalonamento."""
from typing import Optional

from app.models.enums import AreaAfetada

MODELOS_POR_AREA = {
    AreaAfetada.CRONOGRAMA: dict(
        mitigacao="Replanejar estimativas com margem de contingência, quebrar entregas em incrementos menores e acompanhar o caminho crítico a cada sprint.",
        contingencia="Renegociar prazos e escopo com o cliente, priorizar o mínimo viável e realocar pessoas para as tarefas do caminho crítico.",
        gatilho="Atraso acumulado superior a 10% do cronograma da sprint/marco, ou PRs aguardando aprovação por mais de 2 dias.",
    ),
    AreaAfetada.CUSTO: dict(
        mitigacao="Manter reserva de contingência no orçamento, revisar custos mensalmente e negociar valores fixos com fornecedores.",
        contingencia="Congelar gastos não essenciais, solicitar aporte ao patrocinador e reduzir escopo para caber no orçamento.",
        gatilho="Custo real acima de 10% do planejado no período, ou estouro de horas previstas na sprint.",
    ),
    AreaAfetada.ESCOPO: dict(
        mitigacao="Formalizar requisitos com critérios de aceitação, validar com o cliente e adotar controle de mudanças com análise de impacto.",
        contingencia="Acionar o comitê de mudanças, reestimar prazo e custo do novo escopo e obter aprovação formal antes de executar.",
        gatilho="Mais de duas solicitações de mudança por sprint, ou requisito alterado após a aprovação.",
    ),
    AreaAfetada.QUALIDADE: dict(
        mitigacao="Ampliar a cobertura de testes automatizados, exigir revisão de código e definir critérios de aceitação verificáveis.",
        contingencia="Abrir ciclo de correção priorizado por severidade, reforçar testes de regressão e adiar a entrega, se necessário.",
        gatilho="Cobertura de testes abaixo da meta, ou defeitos críticos encontrados em homologação/produção.",
    ),
    AreaAfetada.SEGURANCA_INFORMACAO: dict(
        mitigacao="Aplicar controle de acesso por perfil, criptografia de dados sensíveis, varredura de vulnerabilidades e revisão periódica de credenciais.",
        contingencia="Acionar o plano de resposta a incidentes: isolar o ambiente afetado, revogar credenciais, restaurar backups e notificar os envolvidos (LGPD).",
        gatilho="Alerta de acesso anômalo, vulnerabilidade crítica reportada ou credencial exposta.",
    ),
    AreaAfetada.INFRAESTRUTURA: dict(
        mitigacao="Provisionar redundância e monitoramento, automatizar deploy e backup e dimensionar recursos com folga.",
        contingencia="Failover para ambiente reserva, restaurar a partir do último backup e comunicar a janela de indisponibilidade.",
        gatilho="Disponibilidade abaixo do SLA, falha recorrente no pipeline ou uso de recursos acima de 80%.",
    ),
    AreaAfetada.USABILIDADE: dict(
        mitigacao="Prototipar e validar telas com usuários reais, seguir diretrizes de acessibilidade e medir a facilidade de uso desde cedo.",
        contingencia="Coletar feedback dos usuários, corrigir os fluxos mais problemáticos em release prioritária e oferecer treinamento.",
        gatilho="Aumento de chamados de suporte sobre uso, ou baixa taxa de conclusão nos fluxos principais.",
    ),
    AreaAfetada.EQUIPE: dict(
        mitigacao="Documentar o conhecimento, formar substitutos para papéis-chave, distribuir a carga de trabalho e treinar a equipe.",
        contingencia="Realocar ou contratar temporariamente, redistribuir tarefas e repriorizar entregas enquanto o papel é reposto.",
        gatilho="Aviso de desligamento/afastamento de membro-chave, ou horas extras recorrentes na equipe.",
    ),
    AreaAfetada.FORNECEDORES: dict(
        mitigacao="Formalizar SLAs e penalidades em contrato, qualificar fornecedor alternativo e acompanhar as entregas com antecedência.",
        contingencia="Acionar o fornecedor alternativo, aplicar as cláusulas contratuais e ajustar o cronograma às novas datas.",
        gatilho="Entrega do fornecedor atrasada em mais de 3 dias, ou sinal de descontinuidade do serviço/componente.",
    ),
    AreaAfetada.LEGAL_REGULATORIO: dict(
        mitigacao="Mapear requisitos legais e contratuais, consultar o jurídico/compliance e registrar evidências de conformidade.",
        contingencia="Acionar o jurídico, adequar o sistema ao requisito descumprido e negociar prazo com o órgão ou a parte afetada.",
        gatilho="Nova norma publicada, notificação de órgão regulador ou auditoria com não conformidade.",
    ),
}

ACOMPANHAMENTO_POR_NIVEL = {
    0: "Acompanhar na reunião de status do projeto.",
    1: "Revisar quinzenalmente e informar o patrocinador se a exposição subir.",
    2: "Revisar semanalmente e escalar ao patrocinador/comitê imediatamente.",
}


def gerar_sugestao(
    area: AreaAfetada, nivel: int, descricao_plano: Optional[str] = None
) -> dict:
    modelo = MODELOS_POR_AREA[area]
    acompanhamento = ACOMPANHAMENTO_POR_NIVEL[nivel]
    return {
        "mitigacao": f"{modelo['mitigacao']} {acompanhamento}",
        "contingencia": descricao_plano or modelo["contingencia"],
        "gatilho": modelo["gatilho"],
    }
