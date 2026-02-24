

# Registrar envio de template na timeline do contato

## Problema

Quando um template de reengajamento e enviado, a mensagem aparece no chat (via edge function), mas nao e registrado nenhum evento na timeline de interacoes do contato. O painel lateral mostra "Nenhum evento registrado" mesmo apos envios de templates.

## Solucao

Adicionar um INSERT na tabela `interactions` apos o envio bem-sucedido do template, registrando o evento como tipo `whatsapp_msg` (ou um tipo dedicado) com os detalhes do template enviado.

## Mudanca

### Arquivo: `src/components/inbox/ReengageTemplateDialog.tsx`

Dentro do `onSuccess` da mutation (apos o envio funcionar), inserir uma interacao na tabela `interactions`:

```typescript
// Dentro de onSuccess, antes de invalidar queries:
if (conversation.contact_id) {
  await supabase.from("interactions").insert({
    customer_id: conversation.contact_id,
    type: "whatsapp_msg",
    channel: "whatsapp",
    direction: "outbound",
    content: `📋 Template enviado: ${selectedTemplate?.name}`,
    metadata: {
      template_name: selectedTemplate?.name,
      template_category: selectedTemplate?.category,
      conversation_id: conversation.id,
      sent_by: user?.id,
    },
  });
}
```

Tambem invalidar a query de timeline para o contato aparecer atualizado:

```typescript
queryClient.invalidateQueries({ queryKey: ["unified-timeline", conversation.contact_id] });
queryClient.invalidateQueries({ queryKey: ["customer-timeline", conversation.contact_id] });
```

**Nota tecnica**: O `onSuccess` precisa virar `async` para aguardar o insert. Alternativamente, o insert pode ser fire-and-forget (sem await), ja que e apenas registro de auditoria e nao deve bloquear o fluxo principal.

## Zero regressao

- O envio do template nao muda - continua via edge function
- Apenas adiciona um registro de auditoria na tabela `interactions`
- Kill Switch, CSAT guard, fluxos: sem impacto
- Timeline existente continua funcionando, apenas ganha mais um evento

