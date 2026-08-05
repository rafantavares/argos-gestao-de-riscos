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
- Acumular histórico de ocorrências para retroalimentar o modelo

**Metodologia:** Design Science Research (DSR) — Peffers et al. (2007)

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React (Vite) |
| Backend | FastAPI (Python 3.11+) |
| Banco de dados | PostgreSQL via Supabase |
| ML | scikit-learn (KNN, Decision Tree, Random Forest) |
| Auth | JWT (dois perfis: admin e gerente) |

---

## Entidades do Banco de Dados

```
Usuario          → id, nome, email, senha_hash, perfil (admin/gerente)
Projeto          → id, nome, descricao, data_inicio, status, id_usuario
Risco            → id, titulo, descricao, categoria, probabilidade, impacto, status, data, id_projeto
PlanoContingencia → id, descricao, acao, responsavel, prazo, id_risco
Recomendacao     → id, id_risco_novo, id_risco_similar, algoritmo, score, aceita
```

**Categorias de risco (PMBOK 7ª ed.):** técnico, organizacional, externo, pessoal

**Probabilidade:** baixa | média | alta

**Impacto:** baixo | médio | alto

---

## Estrutura de Pastas do Projeto

```
risk-management-system/
├── backend/
│   ├── main.py
│   ├── models/          # SQLAlchemy models
│   ├── schemas/         # Pydantic schemas
│   ├── routes/          # Endpoints REST
│   ├── ml/
│   │   ├── train.py     # Treino dos modelos
│   │   ├── predict.py   # Recomendação
│   │   └── dataset.csv  # Dataset semissintético
│   └── database.py      # Conexão Supabase/PostgreSQL
├── frontend/
│   ├── src/
│   │   ├── pages/       # Login, Dashboard, Riscos, Recomendações
│   │   ├── components/  # MatrizRisco, CardRisco, etc.
│   │   └── services/    # Axios API calls
│   └── vite.config.js
└── README.md
```

---

## Dataset Semissintético

O dataset deve conter 80–100 registros baseados nas categorias do PMBOK.
Colunas: `categoria`, `probabilidade`, `impacto`, `plano_contingencia`

Exemplo de distribuição:
- 25% técnico
- 25% organizacional
- 25% externo
- 25% pessoal

Fundamentado em: PMI (2021), Carvalho & Rabechini (2009), Pressman & Maxim (2016)

---

## Fluxo do Módulo de ML

```
1. Gerente cadastra novo risco (categoria + probabilidade + impacto)
2. Backend aciona módulo ML (scikit-learn)
3. Modelo compara com histórico via KNN / Decision Tree / Random Forest
4. Sistema retorna plano de contingência mais similar
5. Gerente aceita ou rejeita → registro retroalimenta o histórico
```

**Algoritmos a avaliar comparativamente:**
- KNN — interpretável, ideal para bases pequenas
- Decision Tree — transparente, regras legíveis
- Random Forest — mais robusto, menos interpretável

**Métricas de avaliação:** acurácia, precisão, recall

---

## Perfis de Usuário

**Admin:**
- Cadastrar projetos e gerentes
- Gerenciar base de riscos e planos

**Gerente:**
- Cadastrar riscos no projeto
- Receber e avaliar recomendações
- Acompanhar histórico e status dos riscos

---

## Ordem de Implementação Recomendada

1. Backend — modelos, schemas e conexão com Supabase
2. Autenticação JWT com dois perfis
3. CRUD de projetos e riscos
4. Dataset semissintético (CSV)
5. Módulo ML — treino e endpoint de recomendação
6. Frontend — telas de login, dashboard, cadastro de risco, recomendação
7. Integração frontend ↔ backend
8. Testes funcionais e avaliação comparativa das métricas dos algoritmos (acurácia, precisão, recall)

---

## Notas Acadêmicas

- O sistema é o artefato principal do TCC, orientado pela DSR
- TCC I: levantamento bibliográfico + modelagem (concluído)
- TCC II: implementação + avaliação técnica por testes funcionais e métricas de ML
- A avaliação será feita por métricas: acurácia, precisão e recall dos algoritmos
- O PDF do artigo TCC I está disponível em: /mnt/user-data/uploads/
- Ao gerar código, priorizar interpretabilidade e clareza — a banca avaliará o sistema
- Mencionar uso do Claude Code no Apêndice de uso de IA do artigo