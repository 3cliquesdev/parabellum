-- Adicionar coluna parent_id para hierarquia de departamentos
ALTER TABLE departments 
ADD COLUMN parent_id uuid REFERENCES departments(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance de queries hierárquicas
CREATE INDEX idx_departments_parent_id ON departments(parent_id);

-- Atualizar Suporte Pedidos para ser filho de Suporte
UPDATE departments 
SET parent_id = '36ce66cd-7414-4fc8-bd4a-268fecc3f01a'
WHERE id = '2dd0ee5c-fd20-44be-94ad-f83f1be1c4e9';

-- Atualizar Suporte Sistema para ser filho de Suporte
UPDATE departments 
SET parent_id = '36ce66cd-7414-4fc8-bd4a-268fecc3f01a'
WHERE id = 'fd4fcc90-22e4-4127-ae23-9c9ecb6654b4';