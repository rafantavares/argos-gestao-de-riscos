-- Fase 10: histórico do chat. As tabelas conversas_chat e mensagens_chat são
-- novas (criadas pelo create_all no startup); aqui só a coluna que liga o risco
-- à conversa de origem. Idempotente. Rodar DEPOIS de a API subir uma vez (para
-- conversas_chat existir) ou junto: o script abaixo cria a tabela se faltar.
CREATE TABLE IF NOT EXISTS conversas_chat (
    id SERIAL PRIMARY KEY,
    id_projeto INTEGER NOT NULL REFERENCES projetos(id),
    id_gerente INTEGER NOT NULL REFERENCES usuarios(id),
    titulo VARCHAR(120) NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE riscos ADD COLUMN IF NOT EXISTS id_conversa_origem INTEGER REFERENCES conversas_chat(id);
