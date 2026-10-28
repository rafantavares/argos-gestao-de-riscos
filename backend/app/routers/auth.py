"""Router de autenticação e da conta: cadastro aberto, login (emissão de JWT),
dados do usuário logado, preferências, sessões e acessos, troca de senha e os
direitos do titular (exportar os dados e excluir a conta, LGPD)."""
import secrets
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.resumo import envio_configurado, montar_resumo
from app.core.security import (
    criar_hash_senha,
    obter_usuario_atual,
    token_do_usuario,
    verificar_senha,
)
from app.database import obter_sessao
from app.models.acesso_usuario import AcessoUsuario
from app.models.enums import PerfilUsuario
from app.models.projeto import Projeto
from app.models.projeto_gerente import ProjetoGerente
from app.models.reavaliacao_risco import ReavaliacaoRisco
from app.models.recomendacao import Recomendacao
from app.models.risco import Risco
from app.models.usuario import Usuario
from app.schemas.auth import CadastroRequisicao, LoginRequisicao, TokenResposta, TrocaSenha
from app.schemas.usuario import (
    AcessoResposta,
    ExclusaoConta,
    PreferenciasUsuario,
    UsuarioAtualizar,
    UsuarioResposta,
)

roteador = APIRouter(prefix="/auth", tags=["Autenticação"])

ACESSOS_GUARDADOS = 20


def _registrar_acesso(sessao: Session, usuario: Usuario, requisicao: Request) -> None:
    """Guarda o login (IP e navegador) e mantém só os mais recentes."""
    encaminhado = requisicao.headers.get("x-forwarded-for", "")
    ip = encaminhado.split(",")[0].strip() or (requisicao.client.host if requisicao.client else None)
    sessao.add(
        AcessoUsuario(id_usuario=usuario.id, ip=(ip or "")[:64] or None, navegador=requisicao.headers.get("user-agent", "")[:300] or None)
    )
    sessao.flush()
    antigos = (
        sessao.query(AcessoUsuario.id)
        .filter(AcessoUsuario.id_usuario == usuario.id)
        .order_by(AcessoUsuario.criado_em.desc(), AcessoUsuario.id.desc())
        .offset(ACESSOS_GUARDADOS)
        .all()
    )
    if antigos:
        sessao.query(AcessoUsuario).filter(AcessoUsuario.id.in_([a.id for a in antigos])).delete(synchronize_session=False)


@roteador.post("/cadastro", response_model=TokenResposta, status_code=status.HTTP_201_CREATED)
def cadastrar(dados: CadastroRequisicao, requisicao: Request, sessao: Session = Depends(obter_sessao)):
    """Cria a conta (perfil gerente) e já devolve o token, como no login."""
    email = dados.email.lower()
    if sessao.query(Usuario).filter(Usuario.email == email).first() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma conta com este e-mail",
        )
    usuario = Usuario(
        nome=dados.nome.strip(),
        email=email,
        senha_hash=criar_hash_senha(dados.senha),
        perfil=PerfilUsuario.GERENTE,
    )
    sessao.add(usuario)
    sessao.flush()
    _registrar_acesso(sessao, usuario, requisicao)
    sessao.commit()
    return TokenResposta(access_token=token_do_usuario(usuario))


@roteador.post("/login", response_model=TokenResposta)
def login(credenciais: LoginRequisicao, requisicao: Request, sessao: Session = Depends(obter_sessao)):
    # E-mail sem diferenciar maiúsculas (o cadastro grava em minúsculas).
    usuario = sessao.query(Usuario).filter(func.lower(Usuario.email) == credenciais.email.lower()).first()

    if usuario is None or usuario.excluido_em is not None or not verificar_senha(credenciais.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
        )

    _registrar_acesso(sessao, usuario, requisicao)
    sessao.commit()
    return TokenResposta(access_token=token_do_usuario(usuario))


@roteador.get("/me", response_model=UsuarioResposta)
def obter_usuario_logado(usuario_atual: Usuario = Depends(obter_usuario_atual)):
    return usuario_atual


@roteador.patch("/me", response_model=UsuarioResposta)
def atualizar_dados(
    dados: UsuarioAtualizar,
    sessao: Session = Depends(obter_sessao),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Nome, cargo e organização (os dois últimos saem nos relatórios em PDF).
    Texto vazio em cargo/organização apaga o campo."""
    usuario = sessao.get(Usuario, usuario_atual.id)
    if dados.nome is not None:
        usuario.nome = dados.nome.strip()
    for campo in ("cargo", "organizacao"):
        if campo in dados.model_fields_set:
            valor = (getattr(dados, campo) or "").strip()
            setattr(usuario, campo, valor or None)
    sessao.commit()
    sessao.refresh(usuario)
    return usuario


@roteador.put("/me/preferencias", response_model=UsuarioResposta)
def salvar_preferencias(
    dados: PreferenciasUsuario,
    sessao: Session = Depends(obter_sessao),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Mescla as preferências enviadas com as já salvas (só as chaves conhecidas)."""
    usuario = sessao.get(Usuario, usuario_atual.id)
    usuario.preferencias = {**(usuario.preferencias or {}), **dados.model_dump(exclude_none=True)}
    sessao.commit()
    sessao.refresh(usuario)
    return usuario


@roteador.get("/me/resumo")
def previa_resumo(sessao: Session = Depends(obter_sessao), usuario_atual: Usuario = Depends(obter_usuario_atual)):
    """Prévia do resumo semanal (o mesmo conteúdo do e-mail) e se o envio por
    e-mail está configurado no servidor."""
    return {**montar_resumo(sessao, usuario_atual), "envio_configurado": envio_configurado()}


@roteador.get("/me/acessos", response_model=List[AcessoResposta])
def listar_acessos(sessao: Session = Depends(obter_sessao), usuario_atual: Usuario = Depends(obter_usuario_atual)):
    return (
        sessao.query(AcessoUsuario)
        .filter(AcessoUsuario.id_usuario == usuario_atual.id)
        .order_by(AcessoUsuario.criado_em.desc(), AcessoUsuario.id.desc())
        .limit(10)
        .all()
    )


@roteador.post("/me/encerrar-outras-sessoes", response_model=TokenResposta)
def encerrar_outras_sessoes(sessao: Session = Depends(obter_sessao), usuario_atual: Usuario = Depends(obter_usuario_atual)):
    """Invalida todos os tokens já emitidos e devolve um novo para esta sessão."""
    usuario = sessao.get(Usuario, usuario_atual.id)
    usuario.versao_token = (usuario.versao_token or 0) + 1
    sessao.commit()
    return TokenResposta(access_token=token_do_usuario(usuario))


@roteador.patch("/me/senha", response_model=TokenResposta)
def trocar_senha(
    dados: TrocaSenha,
    sessao: Session = Depends(obter_sessao),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """O próprio usuário troca a senha, confirmando a senha atual. As outras
    sessões são encerradas e esta recebe um token novo."""
    if not verificar_senha(dados.senha_atual, usuario_atual.senha_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A senha atual está incorreta")
    if dados.senha_nova == dados.senha_atual:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A nova senha deve ser diferente da atual")
    usuario = sessao.get(Usuario, usuario_atual.id)
    usuario.senha_hash = criar_hash_senha(dados.senha_nova)
    usuario.versao_token = (usuario.versao_token or 0) + 1
    sessao.commit()
    return TokenResposta(access_token=token_do_usuario(usuario))


# ---------- direitos do titular (LGPD) ----------


def _data(valor):
    return valor.isoformat() if valor else None


@roteador.get("/me/dados")
def exportar_dados(sessao: Session = Depends(obter_sessao), usuario_atual: Usuario = Depends(obter_usuario_atual)):
    """Todos os dados do usuário em JSON (portabilidade): conta, projetos,
    riscos com reavaliações e recomendações, e os últimos acessos."""
    ids_projetos = [v.id_projeto for v in sessao.query(ProjetoGerente).filter(ProjetoGerente.id_gerente == usuario_atual.id)]
    projetos = sessao.query(Projeto).filter(Projeto.id.in_(ids_projetos)).all() if ids_projetos else []
    riscos = sessao.query(Risco).filter(Risco.id_gerente == usuario_atual.id).all()
    ids_riscos = [r.id for r in riscos]
    reavaliacoes = sessao.query(ReavaliacaoRisco).filter(ReavaliacaoRisco.id_risco.in_(ids_riscos)).all() if ids_riscos else []
    recomendacoes = sessao.query(Recomendacao).filter(Recomendacao.id_risco.in_(ids_riscos)).all() if ids_riscos else []
    acessos = sessao.query(AcessoUsuario).filter(AcessoUsuario.id_usuario == usuario_atual.id).all()

    campos_risco = (
        "id", "indice", "titulo", "area_afetada", "descricao_impacto", "probabilidade", "impacto",
        "orcamento_impacto", "urgencia", "fase_projeto", "mitigacao", "contingencia", "gatilho", "status", "arquivado", "id_projeto",
    )

    def valor(v):
        return v.value if hasattr(v, "value") else v

    return {
        "gerado_em": datetime.now(timezone.utc).isoformat(),
        "conta": {
            "nome": usuario_atual.nome,
            "email": usuario_atual.email,
            "cargo": usuario_atual.cargo,
            "organizacao": usuario_atual.organizacao,
            "criado_em": _data(usuario_atual.criado_em),
            "preferencias": usuario_atual.preferencias,
        },
        "projetos": [
            {"id": p.id, "nome": p.nome, "descricao": p.descricao, "apetite_exposicao": p.apetite_exposicao, "criado_em": _data(p.criado_em)}
            for p in projetos
        ],
        "riscos": [{**{c: valor(getattr(r, c)) for c in campos_risco}, "criado_em": _data(r.criado_em)} for r in riscos],
        "reavaliacoes": [
            {
                "id_risco": a.id_risco,
                "notas_anteriores": [a.probabilidade_anterior, a.impacto_anterior],
                "notas_novas": [a.probabilidade, a.impacto],
                "justificativa": a.justificativa,
                "criado_em": _data(a.criado_em),
            }
            for a in reavaliacoes
        ],
        "recomendacoes": [
            {
                "id_risco": r.id_risco,
                "id_plano": r.id_plano,
                "aceita": r.aceita,
                "motivo_rejeicao": r.motivo_rejeicao,
                "criado_em": _data(r.criado_em),
                "decidida_em": _data(r.decidida_em),
            }
            for r in recomendacoes
        ],
        "acessos": [{"ip": a.ip, "navegador": a.navegador, "criado_em": _data(a.criado_em)} for a in acessos],
    }


@roteador.post("/me/excluir", status_code=status.HTTP_204_NO_CONTENT)
def excluir_conta(
    dados: ExclusaoConta,
    sessao: Session = Depends(obter_sessao),
    usuario_atual: Usuario = Depends(obter_usuario_atual),
):
    """Exclui a conta a pedido do titular, confirmando a senha. Os dados
    pessoais são apagados ou anonimizados (nome, e-mail, cargo, organização,
    preferências e acessos) e o login deixa de funcionar. Os riscos e projetos
    continuam, sem o nome de quem os registrou, porque fazem parte do histórico
    dos projetos e do treino do modelo."""
    if not verificar_senha(dados.senha, usuario_atual.senha_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha incorreta")
    usuario = sessao.get(Usuario, usuario_atual.id)
    sessao.query(AcessoUsuario).filter(AcessoUsuario.id_usuario == usuario.id).delete(synchronize_session=False)
    usuario.nome = "Conta excluída"
    usuario.email = f"excluido-{usuario.id}@conta-excluida.invalid"
    usuario.cargo = None
    usuario.organizacao = None
    usuario.preferencias = None
    usuario.senha_hash = criar_hash_senha(secrets.token_urlsafe(32))
    usuario.versao_token = (usuario.versao_token or 0) + 1
    usuario.excluido_em = datetime.now(timezone.utc)
    sessao.commit()
