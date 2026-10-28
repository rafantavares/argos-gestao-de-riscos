"""Router de riscos: cadastro e listagem, restritos ao gerente vinculado ao projeto."""
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session, selectinload

from app.assistente import classificador, coerencia, monitoramento, predicao, sugestoes
from app.core.exposicao import nivel_exposicao, pontuacao_exposicao
from app.core.security import exigir_perfil, obter_usuario_atual
from app.database import obter_sessao
from app.models.anexo_risco import AnexoRisco
from app.models.enums import AREA_PARA_CATEGORIA, PerfilUsuario, StatusRisco
from app.models.evento_risco import EventoRisco
from app.models.historico_risco import HistoricoRisco
from app.models.projeto import Projeto
from app.models.projeto_gerente import ProjetoGerente
from app.models.reavaliacao_risco import ReavaliacaoRisco
from app.models.recomendacao import Recomendacao
from app.models.risco import Risco
from app.models.usuario import Usuario
from app.schemas.risco import (
    AnexoResposta,
    AssistenteEntrada,
    AssistenteResposta,
    EvolucaoExposicao,
    HistoricoRiscoResposta,
    RiscoCriar,
    RiscoArquivar,
    RiscoPlanoAtualizar,
    RiscoReavaliar,
    RiscoResposta,
    RiscoStatusAtualizar,
)

roteador = APIRouter(prefix="/riscos", tags=["Riscos"])

# As listagens carregam as reavaliações numa consulta só (a data da última
# avaliação de cada risco depende delas); sem isso seria uma consulta por risco.
COM_REAVALIACOES = selectinload(Risco.reavaliacoes)


# Rótulos dos campos editáveis do registro, para a trilha de auditoria.
CAMPOS_REGISTRO = {
    "titulo": "Risco",
    "area_afetada": "Área afetada",
    "orcamento_impacto": "Orçamento",
    "urgencia": "Urgência",
    "descricao_impacto": "Descrição do impacto",
    "mitigacao": "Mitigação",
    "probabilidade_residual": "Probabilidade residual",
    "impacto_residual": "Impacto residual",
    "contingencia": "Contingência",
    "gatilho": "Gatilho",
}


def _valor(v):
    return v.value if hasattr(v, "value") else v


def _registrar_evento(sessao: Session, risco: Risco, usuario: Usuario, tipo: str, descricao: str, detalhes=None) -> None:
    sessao.add(EventoRisco(id_risco=risco.id, id_usuario=usuario.id, tipo=tipo, descricao=descricao, detalhes=detalhes))


def _verificar_gerente_vinculado(id_projeto: int, gerente: Usuario, sessao: Session) -> None:
    vinculo = (
        sessao.query(ProjetoGerente)
        .filter(
            ProjetoGerente.id_projeto == id_projeto,
            ProjetoGerente.id_gerente == gerente.id,
        )
        .first()
    )
    if vinculo is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gerente não está vinculado a este projeto",
        )


def _proximo_indice(id_projeto: int, sessao: Session) -> str:
    """Próximo identificador do projeto: R01, R02, ... (sequência por projeto)."""
    indices = sessao.query(Risco.indice).filter(Risco.id_projeto == id_projeto).all()
    numeros = [int(i[0][1:]) for i in indices if i[0][1:].isdigit()]
    return f"R{(max(numeros) if numeros else 0) + 1:02d}"


def _conversa_valida(id_conversa, id_projeto: int, gerente: Usuario, sessao: Session):
    """Só vincula a conversa se ela for do gerente e do mesmo projeto."""
    if not id_conversa:
        return None
    from app.models.conversa_chat import ConversaChat

    conversa = sessao.get(ConversaChat, id_conversa)
    if conversa and conversa.id_gerente == gerente.id and conversa.id_projeto == id_projeto:
        return conversa.id
    return None


def _obter_risco_do_gerente(id_risco: int, gerente: Usuario, sessao: Session) -> Risco:
    risco = (
        sessao.query(Risco)
        .filter(Risco.id == id_risco, Risco.id_gerente == gerente.id)
        .first()
    )
    if risco is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risco não encontrado")
    return risco


@roteador.post(
    "",
    response_model=RiscoResposta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def cadastrar_risco(
    dados: RiscoCriar,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    _verificar_gerente_vinculado(dados.id_projeto, gerente, sessao)

    novo_risco = Risco(
        indice=_proximo_indice(dados.id_projeto, sessao),
        titulo=dados.titulo,
        categoria=dados.categoria,
        area_afetada=dados.area_afetada.value,
        descricao_impacto=dados.descricao_impacto,
        probabilidade=dados.probabilidade,
        impacto=dados.impacto,
        mitigacao=dados.mitigacao,
        probabilidade_residual=dados.probabilidade_residual,
        impacto_residual=dados.impacto_residual,
        contingencia=dados.contingencia,
        gatilho=dados.gatilho,
        orcamento_impacto=dados.orcamento_impacto,
        urgencia=dados.urgencia,
        fase_projeto=dados.fase_projeto,
        id_projeto=dados.id_projeto,
        id_gerente=gerente.id,
        id_conversa_origem=_conversa_valida(dados.id_conversa_origem, dados.id_projeto, gerente, sessao),
    )
    sessao.add(novo_risco)
    sessao.commit()
    sessao.refresh(novo_risco)

    sessao.add(
        HistoricoRisco(
            id_risco=novo_risco.id,
            id_usuario=gerente.id,
            status_anterior=None,
            status_novo=StatusRisco.IDENTIFICADO,
            comentario="Risco cadastrado",
        )
    )
    sessao.commit()
    return novo_risco


@roteador.post(
    "/assistente",
    response_model=AssistenteResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def consultar_assistente(
    dados: AssistenteEntrada,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    """Apoio de IA ao preencher o registro de risco: sugere a área afetada,
    avisa de riscos parecidos já cadastrados no projeto, audita a coerência entre
    descrição e notas e propõe mitigação/contingência/gatilho. Não grava nada."""
    _verificar_gerente_vinculado(dados.id_projeto, gerente, sessao)

    area_sugerida = classificador.sugerir_area(dados.titulo, dados.descricao_impacto)

    existentes = [
        dict(id=r.id, indice=r.indice, titulo=r.titulo, descricao_impacto=r.descricao_impacto)
        for r in sessao.query(Risco)
        .filter(Risco.id_projeto == dados.id_projeto, Risco.arquivado.is_(False))
        .all()
    ]
    similares = classificador.encontrar_similares(dados.titulo, dados.descricao_impacto, existentes)

    # Base histórica da organização: riscos de todos os projetos (o Argos é de
    # uma organização só).
    historico = [
        dict(
            indice=r.indice,
            titulo=r.titulo,
            descricao_impacto=r.descricao_impacto,
            probabilidade=r.probabilidade,
            impacto=r.impacto,
            projeto=nome_projeto,
        )
        for r, nome_projeto in sessao.query(Risco, Projeto.nome)
        .join(Projeto, Projeto.id == Risco.id_projeto)
        .filter(Risco.arquivado.is_(False))
        .all()
    ]
    notas_sugeridas = predicao.sugerir_notas(dados.titulo, dados.descricao_impacto, historico)

    alertas = coerencia.auditar(
        dados.titulo, dados.descricao_impacto, dados.probabilidade, dados.impacto
    )

    area = dados.area_afetada or (area_sugerida["area_afetada"] if area_sugerida else None)
    sugestao_plano = None
    if area is not None and dados.probabilidade and dados.impacto:
        nivel = nivel_exposicao(pontuacao_exposicao(dados.probabilidade, dados.impacto))
        sugestao_plano = sugestoes.gerar_sugestao(area, nivel)

    return AssistenteResposta(
        area_sugerida=area_sugerida,
        notas_sugeridas=notas_sugeridas,
        similares=similares,
        alertas_coerencia=alertas,
        sugestao_plano=sugestao_plano,
    )


@roteador.get(
    "",
    response_model=List[RiscoResposta],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def listar_meus_riscos(
    incluir_arquivados: bool = False,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    consulta = sessao.query(Risco).options(COM_REAVALIACOES).filter(Risco.id_gerente == gerente.id)
    if not incluir_arquivados:
        consulta = consulta.filter(Risco.arquivado.is_(False))
    return consulta.all()


@roteador.get(
    "/painel/evolucao",
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def evolucao_exposicao_agregada(
    id_projeto: Optional[int] = None,
    semanas: int = 12,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    """Exposição total dos riscos do gerente (ou de um projeto) semana a semana,
    reconstruída a partir dos cadastros, reavaliações e mudanças de status."""
    if id_projeto:
        _verificar_gerente_vinculado(id_projeto, gerente, sessao)
    consulta = sessao.query(Risco).filter(Risco.id_gerente == gerente.id, Risco.arquivado.is_(False))
    if id_projeto:
        consulta = consulta.filter(Risco.id_projeto == id_projeto)
    riscos = consulta.all()
    ids = [r.id for r in riscos]
    reavaliacoes, historico = {}, {}
    if ids:
        for r in (
            sessao.query(ReavaliacaoRisco)
            .filter(ReavaliacaoRisco.id_risco.in_(ids))
            .order_by(ReavaliacaoRisco.criado_em, ReavaliacaoRisco.id)
        ):
            reavaliacoes.setdefault(r.id_risco, []).append(r)
        for h in (
            sessao.query(HistoricoRisco)
            .filter(HistoricoRisco.id_risco.in_(ids))
            .order_by(HistoricoRisco.criado_em, HistoricoRisco.id)
        ):
            historico.setdefault(h.id_risco, []).append(h)
    return monitoramento.serie_exposicao(riscos, reavaliacoes, historico, semanas=max(1, min(semanas, 52)))


@roteador.get(
    "/painel/calibracao",
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def calibracao_avaliacoes(
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    """Tendência das avaliações do gerente: quanto as notas iniciais mudaram
    nas reavaliações, no geral e por área afetada (página Meu perfil)."""
    riscos = (
        sessao.query(Risco)
        .options(COM_REAVALIACOES)
        .filter(Risco.id_gerente == gerente.id, Risco.arquivado.is_(False))
        .all()
    )
    return monitoramento.calibracao(riscos)


@roteador.get(
    "/{id_risco}",
    response_model=RiscoResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def obter_risco(
    id_risco: int,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    return _obter_risco_do_gerente(id_risco, gerente, sessao)


@roteador.get(
    "/projeto/{id_projeto}",
    response_model=List[RiscoResposta],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def listar_riscos_do_projeto(
    id_projeto: int,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    _verificar_gerente_vinculado(id_projeto, gerente, sessao)
    return (
        sessao.query(Risco)
        .options(COM_REAVALIACOES)
        .filter(Risco.id_projeto == id_projeto, Risco.arquivado.is_(False))
        .all()
    )


@roteador.patch(
    "/{id_risco}/status",
    response_model=RiscoResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def atualizar_status_risco(
    id_risco: int,
    dados: RiscoStatusAtualizar,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    risco = _obter_risco_do_gerente(id_risco, gerente, sessao)

    if risco.status == StatusRisco.ENCERRADO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Um risco encerrado não pode mudar de status",
        )

    status_anterior = risco.status
    risco.status = dados.status
    sessao.add(
        HistoricoRisco(
            id_risco=risco.id,
            id_usuario=gerente.id,
            status_anterior=status_anterior,
            status_novo=dados.status,
            comentario=dados.comentario,
        )
    )
    sessao.commit()
    sessao.refresh(risco)
    return risco


@roteador.patch(
    "/{id_risco}/tratamento",
    response_model=RiscoResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def atualizar_tratamento_risco(
    id_risco: int,
    dados: RiscoPlanoAtualizar,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    """O gerente refina a descrição do impacto, a mitigação, a contingência e o gatilho."""
    risco = _obter_risco_do_gerente(id_risco, gerente, sessao)
    antes = {campo: _valor(getattr(risco, campo)) for campo in CAMPOS_REGISTRO}
    for campo, valor in dados.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(risco, campo, valor.value if campo == "area_afetada" else valor)
    # O residual pode ser apagado (enviado como null).
    for campo in ("probabilidade_residual", "impacto_residual"):
        if campo in dados.model_fields_set and getattr(dados, campo) is None:
            setattr(risco, campo, None)
    if dados.area_afetada is not None:
        # O grupo PMBOK (feature do ML) acompanha a área afetada.
        risco.categoria = AREA_PARA_CATEGORIA[dados.area_afetada]
    mudancas = {
        campo: {"antes": antes[campo], "depois": _valor(getattr(risco, campo))}
        for campo in CAMPOS_REGISTRO
        if antes[campo] != _valor(getattr(risco, campo))
    }
    if mudancas:
        nomes = ", ".join(CAMPOS_REGISTRO[c].lower() for c in mudancas)
        _registrar_evento(sessao, risco, gerente, "edicao", f"Registro editado: {nomes}", mudancas)
    sessao.commit()
    sessao.refresh(risco)
    return risco


@roteador.post(
    "/{id_risco}/reavaliacao",
    response_model=RiscoResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def reavaliar_risco(
    id_risco: int,
    dados: RiscoReavaliar,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    """Recalcula a exposição conforme o andamento do projeto: o gerente revisa as
    notas (e a fase atual) e a revisão entra na série de evolução do risco."""
    risco = _obter_risco_do_gerente(id_risco, gerente, sessao)
    if risco.status == StatusRisco.ENCERRADO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Um risco encerrado não pode ser reavaliado",
        )

    fase_nova = dados.fase_projeto or risco.fase_projeto
    sessao.add(
        ReavaliacaoRisco(
            id_risco=risco.id,
            id_usuario=gerente.id,
            probabilidade_anterior=risco.probabilidade,
            impacto_anterior=risco.impacto,
            fase_projeto_anterior=risco.fase_projeto,
            probabilidade=dados.probabilidade,
            impacto=dados.impacto,
            fase_projeto=fase_nova,
            justificativa=dados.justificativa,
        )
    )
    risco.probabilidade = dados.probabilidade
    risco.impacto = dados.impacto
    risco.fase_projeto = fase_nova
    sessao.commit()
    sessao.refresh(risco)
    return risco


@roteador.get(
    "/{id_risco}/evolucao",
    response_model=EvolucaoExposicao,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def obter_evolucao_exposicao(
    id_risco: int,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    risco = _obter_risco_do_gerente(id_risco, gerente, sessao)
    reavaliacoes = (
        sessao.query(ReavaliacaoRisco)
        .filter(ReavaliacaoRisco.id_risco == id_risco)
        .order_by(ReavaliacaoRisco.criado_em, ReavaliacaoRisco.id)
        .all()
    )
    historico_status = (
        sessao.query(HistoricoRisco)
        .filter(HistoricoRisco.id_risco == id_risco)
        .order_by(HistoricoRisco.criado_em, HistoricoRisco.id)
        .all()
    )
    return monitoramento.montar_evolucao(risco, reavaliacoes, historico_status)


@roteador.get(
    "/{id_risco}/historico",
    response_model=List[HistoricoRiscoResposta],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def listar_historico_risco(
    id_risco: int,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    _obter_risco_do_gerente(id_risco, gerente, sessao)
    return (
        sessao.query(HistoricoRisco)
        .filter(HistoricoRisco.id_risco == id_risco)
        .order_by(HistoricoRisco.criado_em)
        .all()
    )


@roteador.patch(
    "/{id_risco}/arquivo",
    response_model=RiscoResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def arquivar_risco(
    id_risco: int,
    dados: RiscoArquivar,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    """Arquiva (ou restaura) o risco: ele some das listas, painéis, do ML e do
    assistente, mas o registro e o histórico continuam no banco."""
    risco = _obter_risco_do_gerente(id_risco, gerente, sessao)
    if risco.arquivado != dados.arquivado:
        _registrar_evento(
            sessao, risco, gerente, "arquivo", "Risco arquivado" if dados.arquivado else "Risco restaurado do arquivo"
        )
    risco.arquivado = dados.arquivado
    sessao.commit()
    sessao.refresh(risco)
    return risco


# ---------- trilha de auditoria ----------

ROTULOS_STATUS = {
    "identificado": "Identificado",
    "em_tratamento": "Em tratamento",
    "em_monitoramento": "Em monitoramento",
    "mitigado": "Mitigado",
    "encerrado": "Encerrado",
}


@roteador.get(
    "/{id_risco}/auditoria",
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def trilha_de_auditoria(
    id_risco: int,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    """Tudo o que aconteceu com o risco, do mais recente ao mais antigo, com
    quem fez: cadastro, edições do registro, status, reavaliações, decisões
    sobre recomendações, arquivamento e anexos (rastreabilidade, MR-MPS-SW)."""
    risco = _obter_risco_do_gerente(id_risco, gerente, sessao)
    entradas = [{"data": risco.criado_em, "tipo": "cadastro", "descricao": "Risco cadastrado", "detalhes": None, "id_usuario": risco.id_gerente}]
    for h in sessao.query(HistoricoRisco).filter(HistoricoRisco.id_risco == id_risco):
        if h.status_anterior is None:
            continue  # status inicial, gravado no cadastro (já está na trilha)
        texto = f"Status: {ROTULOS_STATUS.get(_valor(h.status_anterior), _valor(h.status_anterior))} → {ROTULOS_STATUS.get(_valor(h.status_novo), _valor(h.status_novo))}"
        entradas.append({"data": h.criado_em, "tipo": "status", "descricao": texto, "detalhes": {"comentario": h.comentario} if h.comentario else None, "id_usuario": h.id_usuario})
    for a in sessao.query(ReavaliacaoRisco).filter(ReavaliacaoRisco.id_risco == id_risco):
        texto = (
            f"Reavaliado: {a.probabilidade_anterior}×{a.impacto_anterior} = {a.probabilidade_anterior * a.impacto_anterior}"
            f" → {a.probabilidade}×{a.impacto} = {a.probabilidade * a.impacto}"
        )
        entradas.append({"data": a.criado_em, "tipo": "reavaliacao", "descricao": texto, "detalhes": {"justificativa": a.justificativa}, "id_usuario": a.id_usuario})
    for r in sessao.query(Recomendacao).filter(Recomendacao.id_risco == id_risco):
        entradas.append({"data": r.criado_em, "tipo": "recomendacao", "descricao": f"Plano #{r.id_plano} recomendado pelo modelo ({r.algoritmo_usado})", "detalhes": None, "id_usuario": None})
        if r.decidida_em:
            texto = f"Plano #{r.id_plano} aceito" if r.aceita else f"Plano #{r.id_plano} rejeitado"
            detalhes = {"motivo": r.motivo_rejeicao} if r.motivo_rejeicao else None
            entradas.append({"data": r.decidida_em, "tipo": "decisao", "descricao": texto, "detalhes": detalhes, "id_usuario": risco.id_gerente})
    for e in sessao.query(EventoRisco).filter(EventoRisco.id_risco == id_risco):
        entradas.append({"data": e.criado_em, "tipo": e.tipo, "descricao": e.descricao, "detalhes": e.detalhes, "id_usuario": e.id_usuario})

    ids = {e["id_usuario"] for e in entradas if e["id_usuario"]}
    nomes = {u.id: u.nome for u in sessao.query(Usuario).filter(Usuario.id.in_(ids))} if ids else {}
    for e in entradas:
        e["usuario"] = nomes.get(e.pop("id_usuario"), "Modelo de IA" if e["tipo"] == "recomendacao" else None)
        e["data"] = monitoramento._em_utc(e["data"]) if e["data"] else None
    return sorted(entradas, key=lambda e: e["data"] or monitoramento._em_utc(risco.criado_em), reverse=True)


# ---------- anexos (evidências do risco) ----------

TAMANHO_MAXIMO_ANEXO = 5 * 1024 * 1024  # 5 MB


@roteador.get(
    "/{id_risco}/anexos",
    response_model=List[AnexoResposta],
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def listar_anexos(
    id_risco: int,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    _obter_risco_do_gerente(id_risco, gerente, sessao)
    return (
        sessao.query(AnexoRisco)
        .filter(AnexoRisco.id_risco == id_risco)
        .order_by(AnexoRisco.criado_em.desc(), AnexoRisco.id.desc())
        .all()
    )


@roteador.post(
    "/{id_risco}/anexos",
    response_model=AnexoResposta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
async def anexar_arquivo(
    id_risco: int,
    arquivo: UploadFile = File(...),
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    risco = _obter_risco_do_gerente(id_risco, gerente, sessao)
    conteudo = await arquivo.read(TAMANHO_MAXIMO_ANEXO + 1)
    if len(conteudo) > TAMANHO_MAXIMO_ANEXO:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="O arquivo passa do limite de 5 MB",
        )
    if not conteudo:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Arquivo vazio")
    anexo = AnexoRisco(
        id_risco=id_risco,
        id_usuario=gerente.id,
        nome_arquivo=(arquivo.filename or "anexo")[:255],
        tipo_conteudo=(arquivo.content_type or "application/octet-stream")[:120],
        tamanho=len(conteudo),
        conteudo=conteudo,
    )
    sessao.add(anexo)
    _registrar_evento(sessao, risco, gerente, "anexo", f"Anexo adicionado: {anexo.nome_arquivo}")
    sessao.commit()
    sessao.refresh(anexo)
    return anexo


def _obter_anexo(id_risco: int, id_anexo: int, gerente: Usuario, sessao: Session) -> AnexoRisco:
    _obter_risco_do_gerente(id_risco, gerente, sessao)
    anexo = (
        sessao.query(AnexoRisco)
        .filter(AnexoRisco.id == id_anexo, AnexoRisco.id_risco == id_risco)
        .first()
    )
    if anexo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anexo não encontrado")
    return anexo


@roteador.get(
    "/{id_risco}/anexos/{id_anexo}",
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def baixar_anexo(
    id_risco: int,
    id_anexo: int,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    from urllib.parse import quote

    anexo = _obter_anexo(id_risco, id_anexo, gerente, sessao)
    nome = quote(anexo.nome_arquivo)
    return Response(
        content=anexo.conteudo,
        media_type=anexo.tipo_conteudo,
        headers={"Content-Disposition": "attachment; filename*=UTF-8''" + nome},
    )


@roteador.delete(
    "/{id_risco}/anexos/{id_anexo}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def excluir_anexo(
    id_risco: int,
    id_anexo: int,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    anexo = _obter_anexo(id_risco, id_anexo, gerente, sessao)
    _registrar_evento(sessao, anexo.risco, gerente, "anexo", f"Anexo removido: {anexo.nome_arquivo}")
    sessao.delete(anexo)
    sessao.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
