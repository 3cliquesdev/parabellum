

# Padronizar query param de deals no check-rotten-deals

## Problema

O arquivo `supabase/functions/check-rotten-deals/index.ts` usa `dealId` no query param das `action_url`, enquanto **todos** os outros producers e o fallback do `NotificationBell` usam `deal`:

| Arquivo | action_url |
|---|---|
| `process-pending-deal-closures` | `/deals?deal=${deal.id}` |
| `kiwify-webhook` | `/deals?deal=${matchingDeal.id}` |
| `NotificationBell` fallback | `/deals?deal=${md.deal_id}` |
| **check-rotten-deals** | `/deals?dealId=${deal.id}` (INCONSISTENTE) |

## Mudanca

No arquivo `supabase/functions/check-rotten-deals/index.ts`, trocar `dealId` por `deal` em **4 pontos** (linhas 113, 126, 146, 159):

```text
ANTES:  action_url: `/deals?dealId=${deal.id}`
DEPOIS: action_url: `/deals?deal=${deal.id}`
```

Tipos afetados: `deal_escalation`, `deal_escalated`, `deal_critical`, `deal_warning`.

## Arquivos alterados

1. `supabase/functions/check-rotten-deals/index.ts` -- 4 substituicoes de `dealId` por `deal`

## Impacto

- Zero regressao: apenas corrige o query param para o padrao ja usado em todo o sistema
- Notificacoes futuras de deals rotten navegarao corretamente ao clicar no sino

