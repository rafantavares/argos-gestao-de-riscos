---
name: risk-management-system
description: >
  Use this skill whenever the user wants to build, implement, or evolve the
  Sistema Web de Gestão de Riscos com Análise Preditiva — a FastAPI + React +
  PostgreSQL/Supabase system with a scikit-learn ML module for recommending
  contingency plans. Trigger on any mention of: risk management system, risco,
  plano de contingência, KNN, Random Forest, FastAPI backend, React frontend,
  dataset semissintético, ML module, or any implementation task related to
  Rafael's TCC II project.
---

# Sistema Web de Gestão de Riscos — Skill de Desenvolvimento

Este skill guia o desenvolvimento do sistema proposto no TCC I de Rafael Nunes Tavares
(ULBRA — Engenharia de Software, 2026), orientado pela Prof. Fernanda Gomes.

---

## Contexto do Projeto

**Título:** Sistema Web de Gestão de Riscos com Análise Preditiva para Apoio à Tomada de Decisão em Projetos de Tecnologia da Informação

**Objetivo:** Desenvolver um sistema web que permita a gerentes de projetos de TI:
- Cadastrar riscos com categoria, probabilidade e impacto
- Receber sugestões automáticas de planos de contingência via ML
- Acumular histórico de aceites para retroalimentar o modelo

**Metodologia:** Design Science Research (DSR) — Peffers et al. (2007)

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React (Vite) |
| Backend | FastAPI (Python) |
| Banco de dados | PostgreSQL via Supabase |
| ML | scikit-learn (KNN, Árvore de Decisão, Random Forest) |
| Auth | JWT (dois perfis: admin e gerente) |

---

## Entidades do Banco de Dados (design atual — autoritativo)

```
Usuario          → id, nome, email, senha_hash, perfil (admin/gerente), criado_em
Projeto          → id, nome, descricao, id_admin (FK Usuario), criado_em
ProjetoGerente   → id_projeto (FK), id_gerente (FK), vinculado_em
                   (associação N:N — admin vincula gerentes a projetos;
                   gerente só cadastra risco em projeto vinculado)
Risco            → id, titulo, categoria, probabilidade, impacto,
                   id_projeto (FK), id_gerente (FK), criado_em
PlanoContingencia → id, descricao, categoria, probabilidade, impacto
                   (esses 3 últimos são as features usadas pelo ML)
Recomendacao     → id, id_risco (FK), id_plano (FK), algoritmo_usado,
                   acuracia_momento, aceita (bool | null), criado_em
```

**Categorias de risco (PMBOK):** tecnico, organizacional, externo, pessoal

**Probabilidade:** baixa | media | alta

**Impacto:** baixo | medio | alto

(valores sem acento — usados como `.value` dos enums Python e como enum do
Postgres, para bater com `dataset.csv` e evitar problemas de encoding)

---

## Estrutura de Pastas do Projeto

```
tcc-risk-management/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── routers/         # auth, projetos, riscos, recomendacoes
│   │   ├── ml/
│   │   │   ├── dataset.csv
│   │   │   ├── preprocessor.py
│   │   │   ├── trainer.py
│   │   │   └── predictor.py
│   │   └── core/
│   │       ├── config.py
│   │       ├── security.py  # JWT, hash de senha, dependências de auth/autorização
│   │       └── seed.py      # popula planos_contingencia
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── admin/        # Dashboard, Projetos, Gerentes
│   │   │   └── gerente/      # Dashboard, Riscos, Recomendacao
│   │   ├── components/
│   │   └── services/api.js
│   └── package.json
└── README.md
```

---

## Dataset Semissintético

`backend/app/ml/dataset.csv` — 90 registros. Colunas: `categoria`,
`probabilidade`, `impacto`, `id_plano_contingencia`. Gerado combinando as 36
combinações de categoria×probabilidade×impacto com ~15% de ruído proposital
(atribuição a um plano de severidade vizinha), pra evitar dataset
perfeitamente separável e permitir comparação real entre os algoritmos.

---

## Fluxo do Módulo de ML

```
1. Gerente cadastra novo risco (categoria + probabilidade + impacto)
2. POST /recomendacoes/gerar/{id_risco} aciona o módulo ML
3. predictor.py escolhe o algoritmo com maior acurácia média (k-fold) entre
   KNN / Árvore de Decisão / Random Forest e prevê o id_plano_contingencia
4. Recomendacao é salva (algoritmo_usado, acuracia_momento) e exibida ao gerente
5. Gerente aceita ou rejeita (PATCH /recomendacoes/{id})
   → só aceites entram no retreino (rejeição não informa qual seria o plano
     certo, então não vira rótulo de treino válido)
```

**Avaliação:** validação cruzada k-fold estratificada (`StratifiedKFold`,
adaptado ao tamanho da menor classe), métricas de acurácia, precisão e
recall (macro, `zero_division=0`).

---

## Perfis de Usuário

**Admin:**
- Cadastrar, editar e listar projetos
- Cadastrar e listar gerentes (`POST/GET /auth/gerentes`) e vinculá-los a
  projetos (`POST /projetos/{id}/gerentes`)

**Gerente:**
- Cadastrar riscos em projetos vinculados a ele
- Visualizar a recomendação de plano de contingência gerada pelo ML
- Aceitar ou rejeitar a recomendação

---

## Notas Acadêmicas

- O sistema é o artefato principal do TCC, orientado pela DSR
- TCC I: levantamento bibliográfico + modelagem (concluído)
- TCC II: implementação + avaliação técnica por testes funcionais e métricas de ML
- Referências: PMI (2021), Carvalho & Rabechini (2009), Pressman & Maxim (2016)
- Ao gerar código, priorizar interpretabilidade e clareza — a banca avaliará o sistema
- Mencionar uso do Claude Code no Apêndice de uso de IA do artigo
