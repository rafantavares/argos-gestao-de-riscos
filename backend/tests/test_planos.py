"""Testes do catálogo de planos de contingência (consulta, só leitura)."""
from app.core.seed import PLANOS_INICIAIS, semear_planos_contingencia, sincronizar_textos_planos
from app.models.enums import CategoriaRisco, ImpactoRisco, ProbabilidadeRisco
from app.models.plano_contingencia import PlanoContingencia

PLANO_VALIDO = {
    "descricao": "Acionar fornecedor alternativo previamente homologado.",
    "categoria": "externo",
    "probabilidade": "alta",
    "impacto": "alto",
}


def test_catalogo_exige_login(cliente):
    assert cliente.get("/planos").status_code == 401


def test_lista_os_12_planos_do_modelo_em_ordem(cliente, sessao, cabecalho_gerente):
    semear_planos_contingencia(sessao)

    resposta = cliente.get("/planos", headers=cabecalho_gerente)

    assert resposta.status_code == 200
    assert [p["id"] for p in resposta.json()] == list(range(1, 13))


def test_plano_fora_do_catalogo_do_modelo_nao_e_listado(cliente, sessao, cabecalho_gerente):
    """Planos extras (cadastrados no passado) nunca são recomendados, então não aparecem."""
    semear_planos_contingencia(sessao)
    sessao.add(
        PlanoContingencia(
            id=50,
            descricao="Plano extra que o modelo nunca recomenda.",
            categoria=CategoriaRisco.EXTERNO,
            probabilidade=ProbabilidadeRisco.ALTA,
            impacto=ImpactoRisco.ALTO,
        )
    )
    sessao.commit()

    ids = [p["id"] for p in cliente.get("/planos", headers=cabecalho_gerente).json()]

    assert 50 not in ids


def test_catalogo_nao_aceita_mais_criar_editar_nem_desativar(cliente, cabecalho_gerente, plano):
    assert cliente.post("/planos", headers=cabecalho_gerente, json=PLANO_VALIDO).status_code == 405
    assert cliente.put(f"/planos/{plano.id}", headers=cabecalho_gerente, json={"descricao": "Outra."}).status_code in (404, 405)
    assert cliente.patch(f"/planos/{plano.id}/ativo?ativo=false", headers=cabecalho_gerente).status_code in (404, 405)


def test_sincronizacao_corrige_textos_sem_acento(sessao):
    semear_planos_contingencia(sessao)
    plano = sessao.get(PlanoContingencia, 12)
    plano.descricao = "Plano de retencao de talentos e definicao de sucessao para papeis criticos do projeto."
    plano.ativo = False
    sessao.commit()

    assert sincronizar_textos_planos(sessao) == 1
    sessao.refresh(plano)
    assert plano.descricao == PLANOS_INICIAIS[11]["descricao"]
    assert plano.ativo is True
    # Idempotente: rodar de novo não muda nada.
    assert sincronizar_textos_planos(sessao) == 0
