
# Corrigir Erro "duplicate key" ao Reengajar via Template

## Problema

O template WhatsApp e enviado com sucesso, mas a etapa seguinte (reabrir a conversa com `status: "open"`) falha com:
```
duplicate key value violates unique constraint "idx_one_open_conversation_per_contact"
```

Isso acontece porque o contato ja tem **outra conversa aberta**. O banco nao permite duas conversas abertas para o mesmo contato.

## Solucao

Antes de reabrir a conversa, verificar se ja existe outra conversa aberta para o mesmo `contact_id`. Se existir, fechar a outra conversa primeiro (ou reutiliza-la).

## Arquivo impactado

`src/components/inbox/ReengageTemplateDialog.tsx`

## Mudancas tecnicas

### 1. Adicionar verificacao pre-reopen (dentro do `mutationFn`, entre o envio do template e o update da conversa)

Antes da linha 102 (`// 2. Reopen conversation`), inserir:

```typescript
// 1.5 Close any other open conversation for same contact to avoid unique constraint
if (conversation.contact_id) {
  await supabase
    .from("conversations")
    .update({ status: "closed", closed_at: new Date().toISOString(), closed_reason: "reopened_elsewhere" })
    .eq("contact_id", conversation.contact_id)
    .eq("status", "open")
    .neq("id", conversation.id);
}
```

Isso fecha qualquer outra conversa aberta do mesmo contato antes de reabrir a conversa atual.

### 2. Manter o bloco de reopen (linhas 102-114) exatamente como esta

O update da conversa atual para `status: "open"` segue normalmente apos fechar as outras.

### 3. Adicionar log de erro mais detalhado

Se o update ainda falhar, logar o `contact_id` para debug.

## Zero regressao

- O template continua sendo enviado normalmente
- Apenas conversas **abertas** do mesmo contato sao fechadas (nao afeta conversas ja encerradas)
- O `closed_reason: "reopened_elsewhere"` permite rastrear que o fechamento foi automatico
- Kill Switch, Shadow Mode, CSAT guard: sem impacto
- Timeline e sidebar sem alteracao
