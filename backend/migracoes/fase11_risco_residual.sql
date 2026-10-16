-- Fase 11: risco residual (notas esperadas após a mitigação). Idempotente.
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS probabilidade_residual SMALLINT;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS impacto_residual SMALLINT;
