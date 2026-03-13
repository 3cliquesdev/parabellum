

## Plano: Corrigir label e descrição do Kiwify em 2 arquivos

### Mudança 1 — `RAGSourcesSection.tsx`
- **Linha 164:** `Kiwify (Vendas)` → `Kiwify (Produtos e Serviços)`
- **Linha 177:** `A IA consulta pedidos e status de pagamento` → `A IA consulta produtos e serviços contratados pelo cliente`

### Mudança 2 — `KnowledgeSourcesWidget.tsx`
- **Linha 35:** `Kiwify (Vendas/Financeiro)` → `Kiwify (Produtos e Serviços)`
- **Linha 39:** `check_order_status` → `check_product_status`
- **Linha 40:** `Clientes com vendas e dados financeiros` → `Produtos e serviços contratados pelo cliente`

Duas mudanças pontuais de texto, sem alteração de lógica.

