
# Persistir consultant_id no Contato Durante Transferencia do Fluxo

## Problema Raiz

Quando o fluxo transfere uma conversa para um consultor (via email lookup ou collectedData), o webhook salva o `assigned_to` na **conversa** mas **nunca persiste o `consultant_id` na tabela `contacts`**. Na proxima vez que o cliente manda mensagem:

1. Webhook busca `contacts.consultant_id` → NULL
2. `hasConsultant = false`
3. Cria conversa em `autopilot` ao inves de `copilot`
4. Fluxo recomeça do zero ("Seja bem-vindo...")

Dados do Ronildo confirmam: contact tem `consultant_id: NULL`, conversa anterior tinha `assigned_to: dc6d6f88...` (consultor correto).

## Correcao

### Arquivo: `supabase/functions/meta-whatsapp-webhook/index.ts`

**Unico ponto de mudanca** — Apos linha 828, quando `consultantId` e encontrado e atribuido a conversa, tambem salvar no contato:

```typescript
if (consultantId) {
  updateData.assigned_to = consultantId;
  updateData.ai_mode = 'copilot';
  console.log("[meta-whatsapp-webhook] 👤 Atribuindo ao consultor:", consultantId);

  // NOVO: Persistir consultant_id no contato para routing futuro
  const { error: contactUpdateError } = await supabase
    .from('contacts')
    .update({ consultant_id: consultantId })
    .eq('id', contact.id);

  if (contactUpdateError) {
    console.error("[meta-whatsapp-webhook] ❌ Erro ao salvar consultant_id no contato:", contactUpdateError);
  } else {
    console.log("[meta-whatsapp-webhook] ✅ consultant_id salvo no contato:", contact.id, "→", consultantId);
  }
}
```

## Fix imediato para Ronildo (SQL)

Tambem corrigir o contato do Ronildo que ja esta com consultant_id NULL mas deveria ter o consultor `dc6d6f88-19f0-46c5-a618-d2023ec76b7d`:

```sql
UPDATE contacts 
SET consultant_id = 'dc6d6f88-19f0-46c5-a618-d2023ec76b7d'
WHERE id = '6089a243-be4b-49e2-9345-344c44c6f04a';
```

## Resultado

| Cenario | Antes | Depois |
|---------|-------|--------|
| 1o contato (fluxo transfere) | Consultor so no assigned_to da conversa | Consultor tambem salvo no contato |
| 2o contato (retorno) | consultant_id NULL → autopilot → fluxo do zero | consultant_id preenchido → copilot → direto pro consultor |

## Impacto

- Zero risco de regressao: so adiciona um UPDATE no contato quando consultor ja foi identificado
- Nao altera nenhum outro fluxo (distribuicao geral, kill switch, CSAT)
- Edge function `meta-whatsapp-webhook` precisa deploy apos mudanca
