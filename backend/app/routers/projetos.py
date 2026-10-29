"""Router de projetos: o gerente cria, lista, edita, arquiva e exclui os projetos
a que está vinculado."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import exigir_perfil, obter_usuario_atual
from app.database import obter_sessao
from app.models.anexo_risco import AnexoRisco
from app.models.conversa_chat import ConversaChat
from app.models.enums import PerfilUsuario
from app.models.evento_risco import EventoRisco
from app.models.historico_risco import HistoricoRisco
from app.models.projeto import Projeto
from app.models.projeto_gerente import ProjetoGerente
from app.models.reavaliacao_risco import ReavaliacaoRisco
from app.models.recomendacao import Recomendacao
from app.models.risco import Risco
from app.models.usuario import Usuario
from app.schemas.projeto import ProjetoArquivar, ProjetoAtualizar, ProjetoCriar, ProjetoResposta

roteador = APIRouter(prefix="/projetos", tags=["Projetos"])


def _obter_projeto_acessivel(id_projeto: int, usuario: Usuario, sessao: Session) -> Projeto:
    """Projeto que o gerente autenticado pode ver/editar: os que ele criou ou aos
    quais foi vinculado."""
    projeto = (
        sessao.query(Projeto)
        .join(ProjetoGerente, ProjetoGerente.id_projeto == Projeto.id)
        .filter(Projeto.id == id_projeto, ProjetoGerente.id_gerente == usuario.id)
        .first()
    )
    if projeto is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Projeto não encontrado"
        )
    return projeto


@roteador.post(
    "",
    response_model=ProjetoResposta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def criar_projeto(
    dados: ProjetoCriar,
    sessao: Session = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_atual),
):
    novo_projeto = Projeto(nome=dados.nome, descricao=dados.descricao, id_criador=usuario.id)
    sessao.add(novo_projeto)
    sessao.commit()
    sessao.refresh(novo_projeto)

    sessao.add(ProjetoGerente(id_projeto=novo_projeto.id, id_gerente=usuario.id))
    sessao.commit()

    return novo_projeto


@roteador.get("/meus", response_model=List[ProjetoResposta])
def listar_projetos_do_gerente(
    incluir_arquivados: bool = False,
    sessao: Session = Depends(obter_sessao),
    gerente: Usuario = Depends(obter_usuario_atual),
):
    """Projetos vinculados ao gerente autenticado (usado para escolher o projeto ao cadastrar risco)."""
    consulta = (
        sessao.query(Projeto)
        .join(ProjetoGerente, ProjetoGerente.id_projeto == Projeto.id)
        .filter(ProjetoGerente.id_gerente == gerente.id)
    )
    if not incluir_arquivados:
        consulta = consulta.filter(Projeto.arquivado.is_(False))
    return consulta.all()


@roteador.put(
    "/{id_projeto}",
    response_model=ProjetoResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def editar_projeto(
    id_projeto: int,
    dados: ProjetoAtualizar,
    sessao: Session = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_atual),
):
    projeto = _obter_projeto_acessivel(id_projeto, usuario, sessao)

    if dados.nome is not None:
        projeto.nome = dados.nome
    if dados.descricao is not None:
        projeto.descricao = dados.descricao
    for campo in ("apetite_exposicao", "prazo_reavaliacao_muito_grave", "prazo_reavaliacao_grave", "prazo_reavaliacao_demais"):
        valor = getattr(dados, campo)
        if valor is not None:
            setattr(projeto, campo, valor)

    sessao.commit()
    sessao.refresh(projeto)
    return projeto


@roteador.patch(
    "/{id_projeto}/arquivo",
    response_model=ProjetoResposta,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def arquivar_projeto(
    id_projeto: int,
    dados: ProjetoArquivar,
    sessao: Session = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_atual),
):
    """Arquiva (ou restaura) o projeto e os riscos dele: tudo some das listas,
    painéis, do sino e do assistente, mas continua no banco (e no treino do
    modelo). Ao restaurar, voltam só os riscos que foram arquivados junto com o
    projeto; os que já estavam arquivados antes continuam arquivados."""
    projeto = _obter_projeto_acessivel(id_projeto, usuario, sessao)
    if projeto.arquivado == dados.arquivado:
        return projeto

    riscos = sessao.query(Risco).filter(Risco.id_projeto == projeto.id).all()
    if dados.arquivado:
        for risco in riscos:
            if not risco.arquivado:
                risco.arquivado = True
                sessao.add(EventoRisco(
                    id_risco=risco.id, id_usuario=usuario.id, tipo="arquivo",
                    descricao="Arquivado junto com o projeto", detalhes={"com_projeto": True},
                ))
    else:
        for risco in riscos:
            ultimo = (
                sessao.query(EventoRisco)
                .filter(EventoRisco.id_risco == risco.id, EventoRisco.tipo == "arquivo")
                .order_by(EventoRisco.id.desc())
                .first()
            )
            if risco.arquivado and ultimo is not None and (ultimo.detalhes or {}).get("com_projeto"):
                risco.arquivado = False
                sessao.add(EventoRisco(
                    id_risco=risco.id, id_usuario=usuario.id, tipo="arquivo",
                    descricao="Restaurado junto com o projeto",
                ))
    projeto.arquivado = dados.arquivado
    sessao.commit()
    sessao.refresh(projeto)
    return projeto


@roteador.delete(
    "/{id_projeto}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exigir_perfil(PerfilUsuario.GERENTE))],
)
def excluir_projeto(
    id_projeto: int,
    confirmacao: Optional[str] = None,
    sessao: Session = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_atual),
):
    """Exclui de vez o projeto. Se ele tem riscos (mesmo arquivados), apaga
    também os riscos e tudo o que depende deles (recomendações, reavaliações,
    histórico, trilha e anexos) e exige `confirmacao` igual ao nome do projeto,
    porque não dá para desfazer e esses riscos saem do treino do modelo. Para
    só tirar o projeto de vista, o caminho é arquivar."""
    projeto = _obter_projeto_acessivel(id_projeto, usuario, sessao)
    ids_riscos = [i for (i,) in sessao.query(Risco.id).filter(Risco.id_projeto == projeto.id)]
    if ids_riscos:
        if (confirmacao or "").strip() != projeto.nome.strip():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="O projeto tem riscos. Para excluir tudo, confirme digitando o nome do projeto.",
            )
        for modelo in (AnexoRisco, EventoRisco, HistoricoRisco, ReavaliacaoRisco, Recomendacao):
            sessao.query(modelo).filter(modelo.id_risco.in_(ids_riscos)).delete(synchronize_session=False)
        sessao.query(Risco).filter(Risco.id.in_(ids_riscos)).delete(synchronize_session=False)
    for conversa in sessao.query(ConversaChat).filter(ConversaChat.id_projeto == projeto.id):
        sessao.delete(conversa)
    sessao.query(ProjetoGerente).filter(ProjetoGerente.id_projeto == projeto.id).delete()
    sessao.delete(projeto)
    sessao.commit()
