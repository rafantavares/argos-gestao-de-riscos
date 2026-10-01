# Argos — Sistema de Gestão de Riscos com Análise Preditiva (TCC)

TCC de Rafael Nunes Tavares (ULBRA Palmas, Engenharia de Software), orientadora
Prof. Fernanda Gomes. Título: "Sistema Web de Gestão de Riscos com Análise
Preditiva para Apoio à Tomada de Decisão em Projetos de Tecnologia da
Informação". Metodologia: Design Science Research (Peffers et al., 2007).
Referências-base: PMI (2021), Carvalho & Rabechini (2009), Pressman & Maxim
(2016). O uso do Claude Code deve constar no apêndice de uso de IA do artigo.

Nome do sistema: **Argos** (antes "Escopilot"; identidade em
`docs/identidade-visual.md`).

Responda ao Rafael em português, de forma objetiva.

## Stack

- `backend/`: FastAPI + SQLAlchemy + scikit-learn (Python 3.12), banco Postgres
  no Supabase. Sem Alembic de propósito: tabelas novas saem do
  `Base.metadata.create_all()` no startup; colunas novas em tabelas existentes
  têm migração pontual em `backend/migracoes/*.sql` / `app/core/migrar_fase*.py`.
- `frontend/`: React + Vite + MUI (tema escuro, identidade em
  `docs/identidade-visual.md`), gráficos com `@mui/x-charts`.
- Produção: frontend no Vercel (https://gestao-risco.vercel.app) e API no
  Render (https://gestao-risco-api.onrender.com, acordar com `/health`); ambos
  redeployam a cada push no `master`. Segredos ficam nas variáveis de ambiente
  do Render e no `backend/.env` local (não versionado).

## Rodar e testar

- Testes: `cd backend && python -m pytest` (SQLite em memória, não usa rede
  nem o Supabase; ML simulado nos testes de recomendação). 174 testes.
- Backend local: `cd backend && uvicorn app.main:app --reload --port 8000`
  (precisa de `DATABASE_URL` no `.env`). Frontend: `cd frontend && npm run dev`
  (porta 5173 — o CORS local espera exatamente essa porta).
- Nos testes, usar e-mails `@example.com` (`@teste.local` é rejeitado) e não
  usar o `TestClient` como context manager (dispara o startup contra o banco real).
- Contas de teste: `admin@teste.com` e `gerente@teste.com` (senhas com o Rafael).

## Documentação por fase (ler antes de mexer na área)

- `docs/funcionalidades.md`: ciclo de vida do risco, ML, dashboards,
  governança do admin, suíte de testes.
- `docs/registro-riscos-mpsbr.md`: registro no formato PMBOK / MR-MPS-SW:2023 (GPR 10/17, GPC 7; o antigo processo GRI não existe mais),
  escala 1–5, exposição, assistente de IA, previsão de notas e reavaliação.

## Estado atual (2026-09-30)

- Fases 1–7 em produção. A fase 7 (previsão das notas iniciais + reavaliação /
  evolução da exposição) foi testada no navegador e publicada em 2026-09-30.
- O projeto gratuito do Supabase pausa após 7 dias sem uso (erro
  `tenant/user ... not found`); é preciso restaurá-lo no painel antes de testar.
- Pendências: roteiros de apresentação desatualizados; limpar riscos de teste no
  banco antes da defesa; logo definitiva; monitoramento de gatilhos
  (ClickUp/GitLab) fica como trabalho futuro.
