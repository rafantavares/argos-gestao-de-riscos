-- Fase 13: critérios de risco por projeto (apetite e prazos de reavaliação por
-- faixa) e decisões das recomendações com data e motivo.
-- A API aplica isto sozinha na subida (app/core/migrar_fase13.py); este arquivo
-- serve para rodar à mão no SQL Editor do Supabase, se preferir.

ALTER TABLE projetos ADD COLUMN IF NOT EXISTS apetite_exposicao SMALLINT NOT NULL DEFAULT 15;
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS prazo_reavaliacao_muito_grave SMALLINT NOT NULL DEFAULT 7;
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS prazo_reavaliacao_grave SMALLINT NOT NULL DEFAULT 15;
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS prazo_reavaliacao_demais SMALLINT NOT NULL DEFAULT 30;

ALTER TABLE recomendacoes ADD COLUMN IF NOT EXISTS decidida_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE recomendacoes ADD COLUMN IF NOT EXISTS motivo_rejeicao TEXT;
