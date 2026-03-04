

# Plano: Variáveis de Horário Comercial e SLA no Flow Engine + EndNode com Tag

## Contexto
O Flow precisa ter autonomia total para decidir comportamento baseado em horário comercial, SLA e inatividade, sem depender de lógica hardcoded nas edge functions. As variáveis ficam disponíveis no `buildVariablesContext` e no catálogo do editor.

## 1. Helper compartilhado `_shared/business-hours.ts`

Criar função reutilizável que consulta `business_hours_config` e `business_holidays` (timezone `America/Sao_Paulo`) e retorna:

```typescript
{
  within_hours: boolean,
  schedule_summary: string,    // "Seg–Sex 08:00–17:00"
  next_open_text: string,      // "Segunda às 08:00"
  is_holiday: boolean,
  holiday_name: string | null,
}
```

## 2. Enriquecer `buildVariablesContext` em `process-chat-flow/index.ts`

**Horário comercial** — chamar o helper e injetar:
- `business_within_hours` (boolean)
- `business_schedule_summary` (string)
- `business_next_open_text` (string)

**SLA primeira resposta** — calcular a partir de `conversations.first_response_at` e `conversations.created_at`:
- `sla_first_response_met` (boolean) — true se `first_response_at` existe e a diferença `first_response_at - created_at` está dentro do limiar (usar 1h como padrão, ou ler de config se existir)

A assinatura muda para receber o `supabaseClient` para buscar business hours.

## 3. Atualizar catálogo de variáveis no frontend

**Arquivo: `src/components/chat-flows/variableCatalog.ts`**

Adicionar novo grupo `BUSINESS_VARS` com:
- `business_within_hours` — "Dentro do Horário Comercial"
- `business_schedule_summary` — "Horário de Atendimento"
- `business_next_open_text` — "Próxima Abertura"
- `sla_first_response_met` — "SLA Primeira Resposta Cumprido"

Incluir no `getAvailableVariables()`.

## 4. Implementar `add_tag` no EndNode do engine

**Arquivo: `supabase/functions/process-chat-flow/index.ts`** (bloco ~linha 2422-2450)

Adicionar handler para `end_action === 'add_tag'`:
```typescript
if (nextNode?.data?.end_action === 'add_tag' && nextNode.data.action_data?.tag_id) {
  // Buscar contact_id da conversa
  // Inserir em contact_tags (contact_id, tag_id)
}
```

Isso permite que o Flow aplique automaticamente tag 9.98 ou 9.04 via ConditionNode + EndNode.

## 5. Refatorar business hours duplicados

Substituir a lógica inline em `distribute-pending-conversations` e `whatsapp-window-keeper` pelo novo helper compartilhado `_shared/business-hours.ts`.

## Resultado

O Flow editor poderá montar fluxos como:

```text
[AI Response]
  └─ Condition: ai exit
       ├─ resolved → [Message: "✅ Resolvido! {{business_schedule_summary}}"] → [End]
       └─ unable   → [Message: "Não consigo resolver. {{business_next_open_text}}"] → [End]

[Condition: Inatividade 10min]
  ├─ __reminder_sent == false → [Message: lembrete] → set __reminder_sent=true → aguarda
  └─ __reminder_sent == true
       └─ Condition: sla_first_response_met?
            ├─ true  → [End: add_tag 9.98]
            └─ false → [End: add_tag 9.04]
```

Zero lógica hardcoded — o usuário controla tudo no canvas.

## Impacto
- **Zero regressão**: variáveis são read-only, não alteram fluxos existentes
- **Upgrade**: autonomia total do Flow para decidir baseado em horário e SLA
- **5 arquivos**: `_shared/business-hours.ts` (novo), `process-chat-flow/index.ts`, `variableCatalog.ts`, `distribute-pending-conversations/index.ts`, `whatsapp-window-keeper/index.ts`

