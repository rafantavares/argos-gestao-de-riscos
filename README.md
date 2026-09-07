# Sistema Web de Gestão de Riscos com Análise Preditiva

TCC II — Engenharia de Software, ULBRA Palmas.

**Título completo:** Sistema Web de Gestão de Riscos com Análise Preditiva para
Apoio à Tomada de Decisão em Projetos de Tecnologia da Informação.

Sistema web que permite a gerentes de projetos de TI cadastrar riscos
(categoria, probabilidade e impacto, conforme PMBOK) e receber recomendações
automáticas de planos de contingência geradas por um módulo de Machine
Learning, que compara o risco cadastrado com um histórico de riscos aceitos
usando três algoritmos (KNN, Árvore de Decisão e Random Forest).

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React (Vite) |
| Backend | FastAPI (Python) |
| Banco de dados | PostgreSQL via Supabase |
| ML | scikit-learn (KNN, Árvore de Decisão, Random Forest) |
| Autenticação | JWT |

## Estrutura

```
backend/
  app/
    main.py            # ponto de entrada FastAPI
    database.py         # engine SQLAlchemy / sessão
    core/                # config, segurança (JWT, hash de senha), seed do banco
    models/              # models ORM (Usuario, Projeto, ProjetoGerente, Risco,
                          # PlanoContingencia, Recomendacao)
    schemas/              # schemas Pydantic
    routers/              # auth, projetos, riscos, recomendacoes
    ml/                    # preprocessor, trainer, predictor, dataset.csv
  requirements.txt
  .env.example
frontend/
  src/
    pages/admin/            # telas do perfil Admin
    pages/gerente/           # telas do perfil Gerente
    components/
    services/                # cliente da API (axios)
  package.json
```

## Perfis

- **Admin**: cadastra e edita projetos, cadastra gerentes e os vincula a projetos.
- **Gerente**: cadastra riscos nos projetos vinculados a ele, recebe a
  recomendação de plano de contingência gerada pelo ML e aceita ou rejeita —
  a resposta retroalimenta o histórico usado para retreinar o modelo.

## Rodando localmente

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # preencher DATABASE_URL (Supabase) e JWT_CHAVE_SECRETA
python -m app.core.seed  # popula os planos de contingência iniciais
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Testes automatizados

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest
```

76 testes cobrindo autenticação e autorização por perfil, CRUD de projetos e
vínculo de gerentes, ciclo de vida do risco (status e histórico), fluxo de
recomendação de ML, catálogo de planos de contingência e o módulo de ML
(geração do dataset e pré-processamento).

Rodam contra um **SQLite em memória** criado e descartado a cada teste — não
tocam no banco do Supabase nem exigem conexão de rede. O treinamento do modelo
é simulado nos testes de integração (treinar de verdade levaria ~1 min por
chamada); a qualidade do dataset e do pré-processamento é verificada
separadamente em `tests/test_ml.py`.

## Contexto acadêmico

Metodologia: Design Science Research (DSR) — Peffers et al. (2007). TCC I
(concluído): levantamento bibliográfico e modelagem. TCC II (este
repositório): implementação do artefato e avaliação técnica por testes
funcionais e métricas de ML (acurácia, precisão, recall).

---

🤖 Parte deste projeto foi desenvolvida com o auxílio do [Claude Code](https://claude.com/claude-code).
