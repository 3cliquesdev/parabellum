-- A tabela negocios ja existia (criada por uma migration remota anterior,
-- "criar_tabela_negocios", nao presente neste repositorio local). Ela nao
-- tinha canal/conversa_id — necessarios para registrar de onde a
-- oportunidade veio quando criada a partir do Inbox.

ALTER TABLE negocios ADD COLUMN IF NOT EXISTS canal text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS conversa_id uuid REFERENCES conversas(id) ON DELETE SET NULL;
