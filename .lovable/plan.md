

## Diagnóstico: Email caindo no Spam

### Causa raiz

O email está sendo enviado com o remetente **`governante@mail.3cliques.net`** — um endereço que **não existe como sender verificado** no Resend. Os outros emails do sistema usam `contato@mail.3cliques.net` (que é o sender padrão configurado na tabela `email_senders`).

Quando o Resend envia de um endereço não verificado explicitamente, os provedores de email (Gmail, Outlook etc.) penalizam com score de spam porque:
1. **SPF/DKIM** podem não estar alinhados para o subendereço `governante@`
2. O **emoji no subject** (`🤖`) aumenta score de spam
3. O remetente nunca foi usado antes — sem reputação

### Plano de correção

1. **Trocar o remetente** de `governante@mail.3cliques.net` para `contato@mail.3cliques.net` (mesmo sender verificado usado nos tickets e outros emails do sistema)
2. **Ajustar o `from_name`** para `"IA Governante - 3Cliques"` para manter a identidade visual sem usar email não verificado
3. **Remover emoji do subject** — trocar de `🤖 Relatório IA Governante — ${dateStr}` para `Relatório IA Governante — ${dateStr}`
4. **Buscar o sender padrão do banco** (tabela `email_senders` onde `is_default = true`) em vez de hardcodar, igual já é feito no `send-ticket-email-reply`

### Alteração técnica

**Arquivo:** `supabase/functions/ai-governor/index.ts`

- Na função `sendEmailReport`, antes do fetch, buscar o sender padrão:
```typescript
let fromName = "IA Governante - 3Cliques";
let fromEmail = "contato@mail.3cliques.net";
try {
  const { data: sender } = await supabase
    .from("email_senders")
    .select("from_name, from_email")
    .eq("is_default", true)
    .single();
  if (sender) fromEmail = sender.from_email;
} catch {}
```

- Trocar o `from` no payload para: `${fromName} <${fromEmail}>`
- Remover emoji do `subject`

Isso alinha o remetente com o domínio verificado e melhora drasticamente a entregabilidade.

