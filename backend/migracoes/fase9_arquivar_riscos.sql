-- Fase 9: arquivamento de riscos (some das listas, painéis, ML e assistente,
-- sem apagar o histórico). Idempotente. A tabela anexos_riscos é nova e é
-- criada pelo create_all() no startup da API.
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS arquivado BOOLEAN NOT NULL DEFAULT FALSE;
