-- Fase 14: dados da conta, preferências, sessões, acessos e trilha de auditoria.
-- A API aplica isto sozinha na subida (app/core/migrar_fase14.py + create_all);
-- este arquivo serve para rodar à mão no SQL Editor do Supabase, se preferir.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cargo VARCHAR(120);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS organizacao VARCHAR(150);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS preferencias JSON;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS versao_token INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS acessos_usuarios (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuarios (id),
    ip VARCHAR(64),
    navegador VARCHAR(300),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_acessos_usuarios_id_usuario ON acessos_usuarios (id_usuario);

CREATE TABLE IF NOT EXISTS eventos_riscos (
    id SERIAL PRIMARY KEY,
    id_risco INTEGER NOT NULL REFERENCES riscos (id),
    id_usuario INTEGER REFERENCES usuarios (id),
    tipo VARCHAR(40) NOT NULL,
    descricao TEXT NOT NULL,
    detalhes JSON,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_eventos_riscos_id_risco ON eventos_riscos (id_risco);
