

# Diagnóstico: Conversa não avançou para o próximo nó

## Problema Identificado

A conversa do Ian ficou presa no nó `ia_entrada` (IA Suporte) após enviar "Quero reembolso". O fluxo detectou corretamente a intenção financeira, mas **falhou na entrega da resposta do próximo nó** devido a um bug de mismatch de campos.

## Causa Raiz

Quando o Autopilot detecta "reembolso" (trava financeira), ele retorna `financialBlocked: true` ao webhook. O webhook então **re-invoca** `process-chat-flow` com `forceFinancialExit: true`. O `process-chat-flow` avança corretamente para o próximo nó e retorna a resposta.

**Porém**, o webhook espera campos que não existem na resposta:

```text
WEBHOOK ESPERA           | PROCESS-CHAT-FLOW RETORNA
─────────────────────────┼──────────────────────────
flowData.message         | flowData.response
flowData.action='transfer' | flowData.transfer=true
flowData.department      | flowData.departmentId
```

Resultado: nada é enviado ao cliente, nenhuma transferência é aplicada, mas o `continue` executa — a conversa fica "muda".

**Bug adicional:** Na re-invocação (linha 961), o webhook usa `messageText` que é **indefinido** — deveria ser `messageContent`.

## Solução

### Alteração 1 — `meta-whatsapp-webhook/index.ts`

Corrigir 3 pontos no bloco `forceFinancialExit` (~linhas 960-1020):

1. **`messageText` → `messageContent`** (variável correta)
2. **`flowData.message` → `flowData.response`** (campo correto da resposta)
3. **`flowData.action === 'transfer'` → `flowData.transfer === true`** + usar `flowData.departmentId`

### Alteração 2 — Recuperar conversa atual

Executar uma query para avançar manualmente o estado da conversa do Ian, já que está presa.

## Impacto

- **Zero regressão**: corrige apenas o handler de re-invocação financeira
- **Upgrade**: todas as conversas com intenção financeira dentro de fluxo passarão a avançar corretamente para o próximo nó

