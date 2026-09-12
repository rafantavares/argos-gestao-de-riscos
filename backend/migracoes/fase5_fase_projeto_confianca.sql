-- Migração da fase 5 (fase do projeto como feature de ML, confiança da
-- recomendação, status "em_tratamento" e F1 no histórico de métricas).
-- Idempotente: pode ser rodada mais de uma vez no SQL Editor do Supabase.
--
-- Também pode ser aplicada via:  python -m app.core.migrar_fase5

-- 1) Fase do projeto em que o risco foi identificado (nova feature do ML).
DO $$ BEGIN
    CREATE TYPE fase_projeto AS ENUM ('iniciacao', 'planejamento', 'execucao', 'encerramento');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE riscos
    ADD COLUMN IF NOT EXISTS fase_projeto fase_projeto NOT NULL DEFAULT 'planejamento';

-- 2) Status "em_tratamento": atribuído automaticamente ao aceitar uma recomendação.
--    (ALTER TYPE ... ADD VALUE não pode rodar dentro de bloco transacional em
--    versões antigas do Postgres; IF NOT EXISTS garante idempotência.)
ALTER TYPE status_risco ADD VALUE IF NOT EXISTS 'em_tratamento' AFTER 'identificado';

-- 3) Confiança da predição (probabilidade da classe prevista, 0.0 a 1.0).
ALTER TABLE recomendacoes
    ADD COLUMN IF NOT EXISTS confianca DOUBLE PRECISION;

-- 4) F1-score macro no histórico de métricas de treinamento.
ALTER TABLE metricas_treinamento
    ADD COLUMN IF NOT EXISTS f1 DOUBLE PRECISION;
