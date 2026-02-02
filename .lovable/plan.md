
# Plano: Corrigir Problema de Deals - Vendedores Não Conseguem Dar Ganho

## Diagnóstico

Após analisar os logs do banco de dados e o código, identifiquei **2 problemas principais**:

### Problema 1: FK Constraint Violada no `email_sends` (CRÍTICO)

**Evidência nos logs:**
```
insert or update on table "email_sends" violates foreign key constraint "email_sends_template_id_fkey"
```

**Causa:** Na última alteração do `send-email/index.ts`, adicionamos o campo `template_id` ao payload de insert em `email_sends`. Porém:
- A tabela `email_sends` tem uma FK constraint `template_id -> email_templates_v2(id)`
- Quando `request_template_id` é passado mas não existe em `email_templates_v2`, o INSERT falha
- Isso impede que o registro de tracking seja criado

**Impacto:** Emails de playbooks podem falhar silenciosamente.

### Problema 2: Timeouts nas Queries de Deals

**Evidência nos logs:**
```
canceling statement due to statement timeout
```

**Causa:** 
- A tabela `deals` tem ~17.000 registros
- Existem **16 triggers** executando em cada UPDATE
- As queries SELECT com múltiplos JOINs (contacts, organizations, profiles) estão lentas
- A função `has_role()` nas políticas RLS é chamada múltiplas vezes

**Impacto:** 
- A UI pode parecer "travada" quando vendedores tentam atualizar deals
- O update pode funcionar mas o SELECT subsequente pode dar timeout

---

## Correções a Implementar

### Correção 1: Remover FK de `template_id` em `email_sends`

O campo `template_id` foi adicionado para tracking/correlação, não precisa de integridade referencial estrita.

**Migration SQL:**
```sql
ALTER TABLE public.email_sends
DROP CONSTRAINT IF EXISTS email_sends_template_id_fkey;
```

### Correção 2: Validar `template_id` antes de inserir (defensivo)

Mesmo sem FK, é bom garantir que só passamos o valor se ele for válido:

**Em `send-email/index.ts` (linhas 261-272):**
```typescript
const emailSendPayload = {
  contact_id: customer_id,
  resend_email_id: resendData.id,
  subject,
  recipient_email: to,
  status: 'sent',
  sent_at: new Date().toISOString(),
  variables_used: { to_name: recipientName, branding: brandName },
  playbook_execution_id: playbook_execution_id || null,
  playbook_node_id: playbook_node_id || null,
  // CORREÇÃO: Não passar template_id - a FK está causando erros
  // template_id será populado via webhook do template se necessário
};
```

### Correção 3 (Recomendado): Adicionar Índices para Performance

Para resolver os timeouts:

```sql
-- Índice composto para a query principal de deals
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_performance 
ON public.deals(pipeline_id, status, assigned_to, created_at DESC)
WHERE status = 'open';

-- Analisar a tabela para atualizar estatísticas
ANALYZE public.deals;
```

---

## Resumo das Alterações

| Arquivo/Recurso | Alteração | Prioridade |
|-----------------|-----------|------------|
| **Migration SQL** | Remover FK `email_sends_template_id_fkey` | ALTA |
| `send-email/index.ts` | Não passar `template_id` no insert | ALTA |
| **Migration SQL** | Adicionar índice de performance | MÉDIA |

---

## Detalhes Técnicos

### Por que a FK está causando problemas?

O `template_id` que está sendo passado vem da request do playbook. Quando o playbook especifica um template, ele passa o ID. Se esse ID foi deletado ou nunca existiu em `email_templates_v2`, o INSERT falha.

Como o `template_id` é apenas para tracking (saber qual template foi usado), não precisa de integridade referencial - pode ser NULL ou um valor histórico.

### Por que os timeouts afetam a experiência?

1. Vendedor marca deal como "won"
2. O UPDATE funciona (retorna sucesso)
3. O React Query tenta fazer `invalidateQueries` para atualizar a lista
4. A query SELECT de deals com JOINs dá timeout
5. A UI mostra loading infinito ou erro

---

## Testes Necessários

1. Após remover a FK, testar envio de email via playbook
2. Testar marcar deal como "won" via Kiwify validation
3. Testar marcar deal como "lost" com motivo
4. Verificar se os logs param de mostrar erros de FK

---

## Nota Importante

Este problema **NÃO é um bug de RLS** - as políticas estão corretas. O problema é:
1. Uma FK constraint muito restritiva no `template_id`
2. Performance de queries causando timeouts

A política RLS `role_based_update_deals` permite que sales_rep atualize seus próprios deals corretamente.
