-- Fase 12: fim do perfil admin. Todo usuário passa a ser gerente de projetos.
-- Idempotente. A API também executa este comando ao iniciar (app/core/migrar_fase12.py).
UPDATE usuarios SET perfil = 'gerente' WHERE perfil = 'admin';
