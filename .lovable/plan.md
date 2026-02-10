
## Correcao: Webhook do Resend nao atualiza email_sends

### Problema

O fluxo do playbook tem um no de condicao "Email Aberto" que verifica a coluna `opened_at` na tabela `email_sends`. Porem, quando o Resend envia o webhook de abertura (`email.opened`), a Edge Function `resend-webhook` registra o evento apenas em:
- `email_tracking_events` (tabela de tracking)
- `interactions` (tabela de interacoes)

**Nunca atualiza `email_sends.opened_at`**, que e exatamente onde a condicao do playbook consulta. Resultado: a condicao sempre retorna `false`, e o fluxo segue pelo caminho "Nao" (lembrete).

### Solucao

Adicionar no `resend-webhook` a atualizacao de `email_sends` quando receber eventos de abertura, clique ou bounce:

```text
Evento opened  -> UPDATE email_sends SET opened_at = NOW() WHERE resend_email_id = email_id
Evento clicked -> UPDATE email_sends SET clicked_at = NOW() WHERE resend_email_id = email_id
Evento bounced -> UPDATE email_sends SET bounced_at = NOW() WHERE resend_email_id = email_id
```

### Arquivo alterado

**`supabase/functions/resend-webhook/index.ts`**

Apos o insert em `email_tracking_events` (linha 93) e antes do insert em `interactions`, adicionar:

```typescript
// Atualizar email_sends com timestamps de interacao
if (eventType === 'opened' || eventType === 'clicked' || eventType === 'bounced') {
  const updateField = eventType === 'opened' ? 'opened_at' 
    : eventType === 'clicked' ? 'clicked_at' 
    : 'bounced_at';
  
  const { error: updateError } = await supabase
    .from('email_sends')
    .update({ [updateField]: new Date().toISOString() })
    .eq('resend_email_id', payload.data.email_id);
  
  if (updateError) {
    console.warn('[resend-webhook] Falha ao atualizar email_sends:', updateError);
  } else {
    console.log(`[resend-webhook] email_sends.${updateField} atualizado para email ${payload.data.email_id}`);
  }
}
```

### Impacto

- Zero regressao: nenhuma logica existente e alterada, apenas um UPDATE adicional
- A condicao `email_opened` no `process-playbook-queue` passara a funcionar corretamente
- Emails ja abertos no passado nao serao retroativamente corrigidos (apenas novos eventos)
- O campo `clicked_at` tambem sera corrigido preventivamente para condicoes `email_clicked`
