CREATE TYPE perfil_usuario AS ENUM ('admin', 'gerente');

CREATE TYPE categoria_risco AS ENUM ('tecnico', 'organizacional', 'externo', 'pessoal');

CREATE TYPE probabilidade_risco AS ENUM ('baixa', 'media', 'alta');

CREATE TYPE impacto_risco AS ENUM ('baixo', 'medio', 'alto');

CREATE TABLE usuarios (
	id SERIAL NOT NULL, 
	nome VARCHAR(120) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	senha_hash VARCHAR(255) NOT NULL, 
	perfil perfil_usuario NOT NULL, 
	criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_usuarios_email ON usuarios (email);

CREATE INDEX ix_usuarios_id ON usuarios (id);

CREATE TABLE planos_contingencia (
	id SERIAL NOT NULL, 
	descricao TEXT NOT NULL, 
	categoria categoria_risco NOT NULL, 
	probabilidade probabilidade_risco NOT NULL, 
	impacto impacto_risco NOT NULL, 
	PRIMARY KEY (id)
);

CREATE INDEX ix_planos_contingencia_id ON planos_contingencia (id);

CREATE TABLE projetos (
	id SERIAL NOT NULL, 
	nome VARCHAR(150) NOT NULL, 
	descricao TEXT, 
	id_admin INTEGER NOT NULL, 
	criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(id_admin) REFERENCES usuarios (id)
);

CREATE INDEX ix_projetos_id ON projetos (id);

CREATE TABLE projetos_gerentes (
	id_projeto INTEGER NOT NULL, 
	id_gerente INTEGER NOT NULL, 
	vinculado_em TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id_projeto, id_gerente), 
	FOREIGN KEY(id_projeto) REFERENCES projetos (id), 
	FOREIGN KEY(id_gerente) REFERENCES usuarios (id)
);

CREATE TABLE riscos (
	id SERIAL NOT NULL, 
	titulo VARCHAR(200) NOT NULL, 
	categoria categoria_risco NOT NULL, 
	probabilidade probabilidade_risco NOT NULL, 
	impacto impacto_risco NOT NULL, 
	id_projeto INTEGER NOT NULL, 
	id_gerente INTEGER NOT NULL, 
	criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(id_projeto) REFERENCES projetos (id), 
	FOREIGN KEY(id_gerente) REFERENCES usuarios (id)
);

CREATE INDEX ix_riscos_id ON riscos (id);

CREATE TABLE recomendacoes (
	id SERIAL NOT NULL, 
	id_risco INTEGER NOT NULL, 
	id_plano INTEGER NOT NULL, 
	algoritmo_usado VARCHAR(50) NOT NULL, 
	acuracia_momento FLOAT NOT NULL, 
	aceita BOOLEAN, 
	criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(id_risco) REFERENCES riscos (id), 
	FOREIGN KEY(id_plano) REFERENCES planos_contingencia (id)
);

CREATE INDEX ix_recomendacoes_id ON recomendacoes (id);

INSERT INTO planos_contingencia (id, descricao, categoria, probabilidade, impacto) VALUES
(1, 'Revisão técnica adicional e testes complementares para mitigar o risco antes que se concretize.', 'tecnico', 'baixa', 'baixo'),
(2, 'Contratação de especialista técnico temporário para dar suporte à equipe.', 'tecnico', 'media', 'medio'),
(3, 'Substituição da tecnologia ou arquitetura por uma alternativa já validada no mercado.', 'tecnico', 'alta', 'alto'),
(4, 'Comunicação formal com os stakeholders internos para alinhar expectativas.', 'organizacional', 'baixa', 'baixo'),
(5, 'Realocação de recursos entre equipes para equilibrar a carga de trabalho.', 'organizacional', 'media', 'medio'),
(6, 'Escalonamento ao comitê executivo e replanejamento do cronograma do projeto.', 'organizacional', 'alta', 'alto'),
(7, 'Monitoramento contínuo de fornecedores e cláusulas contratuais.', 'externo', 'baixa', 'baixo'),
(8, 'Ativação de fornecedor ou contrato alternativo (plano B) previamente mapeado.', 'externo', 'media', 'medio'),
(9, 'Renegociação contratual e acionamento das cláusulas de contingência com o fornecedor.', 'externo', 'alta', 'alto'),
(10, 'Treinamento e capacitação da equipe para reduzir a dependência de conhecimento individual.', 'pessoal', 'baixa', 'baixo'),
(11, 'Contratação de recurso temporário ou redistribuição de tarefas entre a equipe.', 'pessoal', 'media', 'medio'),
(12, 'Plano de retenção de talentos e definição de sucessão para papéis críticos do projeto.', 'pessoal', 'alta', 'alto');
