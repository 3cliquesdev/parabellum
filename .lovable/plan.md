

# Fix: Contato Duplicado + Distribuição da Eliane Freitas

## Diagnóstico

```text
Contato 1 (email): 3baa1726 → email: elianefreitas.vendas@gmail.com, assigned_to: Loriani, consultant_id: NULL
Contato 2 (whatsapp): 2210a745 → phone: 554399951354, consultant_id: NULL, email: NULL
Conversa: 395cd646 → contact_id: 2210a745, ai_mode: waiting_human, assigned_to: NULL, dept: Customer Success
```

Dois problemas: (A) deduplicação de contatos não aconteceu, (B) mesmo o contato original não tem `consultant_id` preenchido.

## Solução Imediata (dados)

### 1. Unificar contatos — Mesclar o contato WhatsApp no contato com email
- Atualizar contato `3baa1726`: preencher `phone` com `554399951354`, definir `consultant_id` = Loriani (`522d898d`)
- Atualizar conversa `395cd646`: `contact_id` = `3baa1726`, `assigned_to` = `522d898d`, `ai_mode` = `copilot`
- Migrar mensagens do contato antigo para o novo
- Remover contato duplicado `2210a745`

### 2. Corrigir assigned_to → consultant_id

O contato original tem `assigned_to = Loriani` mas `consultant_id = null`. Definir `consultant_id = 522d898d` (Loriani) para que o returning-client routing funcione nas próximas conversas.

## Solução Estrutural (código) — Prevenir futuras duplicações

### 3. Melhorar deduplicação no webhook de WhatsApp
No `meta-whatsapp-webhook`, quando um novo contato é criado por número de telefone, adicionar uma verificação cruzada:
- Buscar contatos existentes onde `phone` contenha o número (normalizado)
- Se encontrar match, vincular a conversa ao contato existente em vez de criar novo
- Isso evita duplicações futuras

### 4. Garantir `consultant_id` sincronizado com `assigned_to`
Quando um contato é criado/atualizado com `assigned_to` mas sem `consultant_id`, preencher automaticamente o `consultant_id` com o mesmo valor — para que o returning-client routing funcione.

