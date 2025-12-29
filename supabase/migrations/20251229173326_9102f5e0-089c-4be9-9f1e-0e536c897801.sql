-- Remover FK antiga que aponta para auth.users
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_created_by_fkey;

-- Criar nova FK apontando para profiles
ALTER TABLE tickets 
ADD CONSTRAINT tickets_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES profiles(id);