-- Migração da fase 6 (registro de riscos no formato MR-MPS-SW / PMBOK):
-- índice R01, área afetada, descrição do impacto, mitigação, contingência e
-- gatilho; probabilidade e impacto passam de enum (baixa/média/alta) para nota
-- de 1 a 5.
-- Idempotente: pode ser rodada mais de uma vez no SQL Editor do Supabase.
--
-- Também pode ser aplicada via:  python -m app.core.migrar_fase6
--
-- Conversão dos riscos já cadastrados (escala de 3 níveis -> 1 a 5):
--   baixa/baixo -> 2, media/medio -> 3, alta/alto -> 4.
-- Os enums probabilidade_risco e impacto_risco continuam existindo: são usados
-- pelos planos de contingência (planos_contingencia).

-- 1) Índice do risco dentro do projeto (R01, R02, ...), na ordem de cadastro.
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS indice VARCHAR(10) NOT NULL DEFAULT 'R01';

UPDATE riscos AS r
SET indice = 'R' || LPAD(numeradas.posicao::text, 2, '0')
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY id_projeto ORDER BY id) AS posicao
    FROM riscos
) AS numeradas
WHERE r.id = numeradas.id;

-- 2) Área afetada (categoria de negócio). Os riscos antigos recebem a área
--    mais próxima do grupo PMBOK que já tinham.
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS area_afetada VARCHAR(40);

UPDATE riscos
SET area_afetada = CASE categoria::text
    WHEN 'tecnico' THEN 'infraestrutura'
    WHEN 'organizacional' THEN 'cronograma'
    WHEN 'externo' THEN 'fornecedores'
    ELSE 'equipe'
END
WHERE area_afetada IS NULL;

ALTER TABLE riscos ALTER COLUMN area_afetada SET DEFAULT 'cronograma';
ALTER TABLE riscos ALTER COLUMN area_afetada SET NOT NULL;

-- 3) Descrição do impacto e campos de tratamento.
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS descricao_impacto TEXT;
UPDATE riscos SET descricao_impacto = 'Não informada' WHERE descricao_impacto IS NULL;
ALTER TABLE riscos ALTER COLUMN descricao_impacto SET DEFAULT '';
ALTER TABLE riscos ALTER COLUMN descricao_impacto SET NOT NULL;

ALTER TABLE riscos ADD COLUMN IF NOT EXISTS mitigacao TEXT;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS contingencia TEXT;
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS gatilho TEXT;

-- 4) Probabilidade e impacto: enum -> SMALLINT (1 a 5). Só converte se a
--    coluna ainda for enum (USER-DEFINED), o que garante a idempotência.
DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'riscos' AND column_name = 'probabilidade') = 'USER-DEFINED' THEN
        ALTER TABLE riscos ALTER COLUMN probabilidade TYPE SMALLINT
            USING (CASE probabilidade::text WHEN 'baixa' THEN 2 WHEN 'media' THEN 3 ELSE 4 END);
    END IF;

    IF (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'riscos' AND column_name = 'impacto') = 'USER-DEFINED' THEN
        ALTER TABLE riscos ALTER COLUMN impacto TYPE SMALLINT
            USING (CASE impacto::text WHEN 'baixo' THEN 2 WHEN 'medio' THEN 3 ELSE 4 END);
    END IF;
END $$;

DO $$ BEGIN
    ALTER TABLE riscos ADD CONSTRAINT ck_riscos_probabilidade CHECK (probabilidade BETWEEN 1 AND 5);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE riscos ADD CONSTRAINT ck_riscos_impacto CHECK (impacto BETWEEN 1 AND 5);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
