

# Diagnóstico: Mensagens de inatividade não enviadas ao WhatsApp

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Causa raiz

A função `sendWhatsAppMessages` em `auto-close-conversations/index.ts` (linha 620) passa parâmetros com nomes **errados** para `send-meta-whatsapp`:

```text
Enviado:                     Esperado:
─────────                    ─────────
instanceId                → instance_id
to                        → phone_number
message                   → message ✅
is_bot_message            → (não existe no schema)
```

O `send-meta-whatsapp` valida `instance_id` e `phone_number` na linha 255 — ambos são `undefined`, retorna 400. O erro é engolido pelo `catch` silencioso na linha 661.

**Resultado**: mensagens são salvas no banco (aparecem na UI) mas nunca chegam ao WhatsApp do cliente.

## Correção

Alterar a função `sendWhatsAppMessages` em `auto-close-conversations/index.ts` para usar os nomes corretos dos parâmetros:

- `instanceId` → `instance_id`
- `to` → `phone_number`
- Adicionar `skip_db_save: true` (mensagem já foi salva antes)
- Adicionar `conversation_id` para tracking
- Melhorar log de erro para não ser silencioso

### Arquivo editado
- `supabase/functions/auto-close-conversations/index.ts` — função `sendWhatsAppMessages` (linhas 620-663)

### Sem risco de regressão
- Apenas corrige nomes de parâmetros para alinhar com o contrato existente do `send-meta-whatsapp`
- Adiciona `skip_db_save: true` que é o padrão correto (mensagem já inserida antes)

