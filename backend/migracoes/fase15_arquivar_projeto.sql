-- Fase 15: arquivar projeto. A API aplica isto sozinha na subida
-- (app/core/migrar_fase15.py); este arquivo serve para rodar à mão no SQL
-- Editor do Supabase, se preferir.

ALTER TABLE projetos ADD COLUMN IF NOT EXISTS arquivado BOOLEAN NOT NULL DEFAULT false;
