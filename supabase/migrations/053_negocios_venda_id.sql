-- Liga o negocio ganho a venda especifica da Kiwify que o fechou - permite
-- mostrar o ID do pedido (external_id) direto no NegocioSheet sem precisar
-- ir no banco.
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS venda_id uuid REFERENCES vendas(id) ON DELETE SET NULL;
